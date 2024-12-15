chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Just pass the message along to popup.js
  if (request.action === "queryChat") {
    const userQuery = request.query;
    console.log("User query: ", userQuery);
    // Get the embedding for the user query
    getSettingsValueFor("localVdb").then((localVDB) => {
      if (localVDB) {
        console.log("Using local VDB");
        getNomicEmbeddings(userQuery).then(async (queryEmbedding) => {
          // Retrieve the most relevant document using local embeddings
          const relevantDocs = await retrieveRelevantDocs(queryEmbedding);
          // Use Ollama to query with relevant context
          const response = await queryOllama(userQuery, relevantDocs);
          const urls = [
            ...new Set(relevantDocs.map((doc) => doc.metadatas.source)),
          ].join(",\n");

          sendResponse({ response: response, urls: urls });
        });
      } else {
        console.log("Using remote VDB");
        queryOllamaRemotely(userQuery)
          .then((resp) => {
            sendResponse({ response: resp.response, urls: resp.urls });
          })
          .catch((error) => {
            sendResponse({ error: error.message });
          });
      }

      return true; // Keep async alive
    });
  } else if (request.action === "tabinfo") {
    if (request.tabText) {
      getSettingsValueFor("localVdb").then((localVDB) => {
        // Store the embeddings in local storage
        if (localVDB) {
          storeEmbeddingsLocally(request);
        } else {
          storeEmbeddingsRemotely(request);
        }
      });
    }

    return true; // Keep async alive
  }

  return true; // Required to indicate async response
});

function storeEmbeddingsLocally(request) {
  let text = request.tabText;
  const parentid = generateIdFromUrl(request.tabUrl.href);
  const chunks = chunkTextWithOverlap(text, 1000, 100);

  try {
    chrome.storage.local.get(["embeddings"], function (result) {
      let embeddings = result.embeddings || [];
      for (let i = 0; i < chunks.length - 1; i++) {
        const id = this.generateIdFromUrl(parentid + "-" + i);

        if (findMatchingEmbedding(embeddings, id) == undefined) {
          getNomicEmbeddings(chunks[i]).then(async (embedding) => {
            embeddings.push({
              id,
              documents: chunks[i],
              embedding: embedding,
              metadatas: { source: request.tabUrl.href, pid: parentid },
            });
            chrome.storage.local.set({ embeddings: embeddings });
          });
        }
      }
    });
  } finally {
    // console.log(`Saved ID ${parentid}.`);
  }
}

// Helper to store embeddings locally in Chrome's storage
function storeEmbeddingsRemotely(request) {
  const scrapedText = request.tabText;
  const tabUrl = request.tabUrl;

  // Send the scraped text to the backend server

  getSettingsValueFor("remoteSvcUrl").then((remoteSvcUrl) => {
    fetch(remoteSvcUrl + "/add-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: scrapedText, tabUrl: tabUrl }),
    })
      .then(() => {
        return { success: true };
      })
      .catch((error) => {
        console.error("Error sending text to server:", error);
        return { success: false };
      });
  });

  return true; // Required to indicate async response
}

// Helper to retrieve relevant documents by comparing embeddings
function retrieveRelevantDocs(queryEmbedding) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["embeddings"], function (result) {
      const allEmbeddings = result.embeddings || [];

      // Find the most relevant embeddings (e.g., by cosine similarity)
      const relevantDocs = allEmbeddings
        .sort((a, b) => {
          return (
            cosineSimilarity(queryEmbedding, b.embedding) -
            cosineSimilarity(queryEmbedding, a.embedding)
          );
        })
        .slice(0, 3); // Get top 3 relevant documents

      resolve(relevantDocs);
    });
  });
}

// Query Ollama with user input and relevant documents
async function queryOllama(query, relevantDocs) {
  const context = relevantDocs.map((doc) => doc.documents).join("\n");
  const response = await fetch(
    (await getSettingsValueFor("ollamaPath")) + "/api/generate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: await getSettingsValueFor("llmModel"),
        prompt: `<|begin_of_text|>
               <|start_header_id|>system<|end_header_id|>
                You are an advance AI assistant tasked with answering questions based on the provided extracted context from the 
                user's active browser tabs to answer their question accurately and concisely. Also include the URL of the tab if possible.
                If the answer cannot be derived from the context, state that you don't have enough information to answer accurately.
                <|eot_id|>
                <|start_header_id|>user<|end_header_id|>
                Context:
                ${context}
                Question: 
                ${query}
                <|eot_id|>
                <|start_header_id|>assistant<|end_header_id|>`,
        stream: false,
      }),
    }
  );
  const data = await response.json();
  return data.response;
}

// Query Remote Server with user input and relevant documents
async function queryOllamaRemotely(query) {
  try {
    let remoteSvcUrl = await getSettingsValueFor("remoteSvcUrl");
    const response = await fetch(remoteSvcUrl + "/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    // Log or handle the error here if needed
    // Rethrow the error if you want it to be handled by the caller
    throw error;
  }
}

// / Function to get Nomic embeddings using Ollama's embedding API
async function getNomicEmbeddings(text) {
  let ollamaPath = await getSettingsValueFor("ollamaPath");
  const response = await fetch(ollamaPath + "/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: await getSettingsValueFor("embeddingModel"), // Specify the Nomic model
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

// Utility function to generate random ID
function generateId() {
  return Math.random().toString(36).substring(7);
}

// Utility to calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  return dotProduct / (magnitudeA * magnitudeB);
}

function generateIdFromUrl(url) {
  // Simple hash function (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  let id = hash.toString(36); // Convert to base36 for shorter ID
  return id;
}

function chunkTextWithOverlap(text, chunkSize, overlapSize) {
  if (chunkSize <= overlapSize) {
    throw new Error("Chunk size must be greater than overlap size.");
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlapSize; // Move start forward, leaving the overlap
  }

  return chunks;
}

function findMatchingEmbedding(array, id) {
  let val = array.find((row) => row.id === id);
  return val;
}

function getSettingsValueFor(id) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([id], (result) => {
      let val = result[id] || "";
      resolve(val);
    });
  });
}
