const express = require("express");
const chromadb = require("chromadb");
const axios = require("axios");
const crypto = require("crypto");
const config = require("./config");

const app = express();
app.use(express.json());

class TabNinjaBackend {
  constructor(collectionName) {
    this.chromaClient = new chromadb.ChromaClient({
      host: config.db.host,
      port: config.db.port,
    }); // Assuming local Chroma setup
    this.collectionName = collectionName;
    this.mutex = new Map();
  }

  async acquireLock(key) {
    while (this.mutex.get(key)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.mutex.set(key, true);
  }

  releaseLock(key) {
    this.mutex.delete(key);
  }

  generateHash(url) {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(url))
      .digest("hex");
  }

  generateIdFromUrl(url) {
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

  chunkTextWithOverlap(text, chunkSize, overlapSize) {
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

  async addTabData(req) {
    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name: this.collectionName,
      });

      const text = req.body.text;
      const parentid = this.generateIdFromUrl(req.body.tabUrl.href);

      const chunks = this.chunkTextWithOverlap(text, 1000, 100);
      for (let i = 0; i < chunks.length - 1; i++) {
        const id = this.generateIdFromUrl(req.body.tabUrl.href + "-" + i);

        await this.acquireLock(id);

        try {
          // Query to search for rows with the given 'id'
          const result = await collection.get({
            ids: [id], // Search by specific ID
            includeMetadata: false, // Include metadata for verification
          });

          // Check if any matching rows are found
          if (result.ids.length > 0) {
            console.log(`Row with ID ${id} exists.`);
            return; //means we have proccessed this url before.
          } else {
            console.log(`No rows found with ID ${id}.`);
            const embeddings = await getNomicEmbeddings(chunks[i]);
            await collection.add({
              ids: [id],
              documents: [chunks[i]],
              embeddings: [embeddings],
              metadatas: [{ source: req.body.tabUrl.href, pid: parentid }],
            });
          }
        } finally {
          this.releaseLock(id);
        }
      }

      return true;
    } catch (error) {
      console.error("Error in addTabData:", error);
      throw error;
    }
  }

  async query(req) {
    const collection = await this.chromaClient.getOrCreateCollection({
      name: this.collectionName,
    });

    // Get embeddings for the user query
    const userQuery = req.body.query;

    // Get embeddings for the user query
    const queryEmbedding = await getNomicEmbeddings(userQuery);

    return await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 10,
    });
  }

  async deleteEmbedding(req) {
    const collection = await this.chromaClient.getOrCreateCollection({
      name: this.collectionName,
    });
    const id = this.generateIdFromUrl(req.body.tabUrl.href);
    await collection.delete({
      ids: [id],
    });
    return { status: "deleted", id };
  }
}

// Endpoint to receive text and add it to Chroma database
app.post("/add-text", async (req, res) => {
  try {
    await tabNinjaBackend.addTabData(req);
    res.json({ success: true });
  } catch (error) {
    console.log("Error in add-text:", error);
    res.json({ success: false });
  }
});

// Endpoint to query Chroma and get a RAG response from Ollama
app.post("/query", async (req, res) => {
  const relevantDocs = await tabNinjaBackend.query(req);
  // Send relevant docs to Ollama for context-aware generation
  const ollamaResponse = await queryOllama(req.body.query, relevantDocs);
  res.json({ response: ollamaResponse.ollamaresp, urls: ollamaResponse.urls });
});

// / Function to get Nomic embeddings using Ollama's embedding API
async function getNomicEmbeddings(text) {
  const response = await fetch(config.nomic.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.nomic.modleName, // Specify the Nomic model
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

// Function to query Ollama for context-aware chat generation
async function queryOllama(query, relevantDocs) {
  const context = relevantDocs.documents.join(",");
  // Make a request to Ollama API
  const ollamaResponse = await axios.post(
    config.ollama.url,
    {
      model: config.ollama.modelName,
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
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const urls = [
    ...new Set(relevantDocs.metadatas[0].map((doc) => doc.source)),
  ].join(",\n");
  return { ollamaresp: ollamaResponse.data.response, urls: urls };
}

// Create embedding handler instance
const tabNinjaBackend = new TabNinjaBackend(config.db.name);

// Start the Express server
app.listen(config.app.port, () => {
  console.log("Server is running on port 3000");
});
