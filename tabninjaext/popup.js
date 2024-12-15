document.addEventListener("DOMContentLoaded", () => {
  // Query for all open tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      // Skip chrome:// and other internal URLs
      if (
        tab.url.startsWith("brave://") ||
        tab.url.startsWith("brave-extension://") ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://")
      ) {
        console.log(`Skipping tab with URL ${tab.url}`);
        return;
      }

      // Inject content script into each valid tab to scrape text
      try {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      } catch (error) {
        console.log(`Error injecting content script: ${error}`);
      }
    });
  });
});

const sendBtn = document.getElementById("send");
const settingsButton = document.getElementById("settings-button");
const input = document.getElementById("input");
const chat = document.getElementById("chat");

settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Handle Enter key in textarea
input.addEventListener("keydown", (event) => {
  // Check if Enter was pressed without Shift key
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // Prevent default Enter behavior (new line)

    sendMessage();
  }
});

sendBtn.addEventListener("click", () => {
  sendMessage();
});

function sendMessage() {
  const query = input.value;
  input.value = "";

  appendMessage("You", query);

  chrome.runtime.sendMessage(
    { action: "queryChat", query: query },
    (response) => {
      var lastError = chrome.runtime.lastError;
      if (lastError) {
        console.log(lastError.message);
        // 'Could not establish connection. Receiving end does not exist.'
        appendMessage("Error", lastError.message);
        return;
      }

      if (response.response) appendMessage("Auto-Bot", response.response);
      else if (response.error) appendMessage("Error", response.error);
      else appendMessage("Error", "No response from server.");
      if (response.urls) appendUrls(response.urls);
      chat.scrollTop = chat.scrollHeight;
    }
  );
}

// Function to format message with paragraphs
function formatMessage(text) {
  // Split text by double newlines to separate paragraphs
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => `<p class="message-paragraph">${paragraph.trim()}</p>`)
    .join("");
}

function appendMessage(sender, message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  messageDiv.innerHTML = formatMessage(
    `<strong>${sender}:</strong> ${message}`
  );
  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;
}

function appendUrls(urls) {
  urls = urls || "";
  const urlArray = urls.split(",").filter((url) => url.trim());

  if (urlArray.length === 0) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = "message URL";

  // Create the header paragraph
  const headerParagraph = document.createElement("p");
  headerParagraph.className = "message-paragraph";
  headerParagraph.innerHTML = "<strong>URLs:</strong>";
  messageDiv.appendChild(headerParagraph);

  // Create a paragraph for each URL with numbering
  urlArray.forEach((url, index) => {
    const urlParagraph = document.createElement("p");
    urlParagraph.className = "message-paragraph";
    urlParagraph.style.display = "flex"; // Use flex to keep number and link together
    urlParagraph.style.alignItems = "flex-start";

    const numberSpan = document.createElement("span");
    numberSpan.textContent = `${index + 1}.`;
    numberSpan.style.minWidth = "25px"; // Fixed width for numbers
    numberSpan.style.flexShrink = "0"; // Prevent number from shrinking

    const link = document.createElement("a");
    link.href = url.trim();
    link.textContent = url.trim();
    link.target = "_blank";
    link.style.wordBreak = "break-all"; // Allow URLs to break at any character

    urlParagraph.appendChild(numberSpan);
    urlParagraph.appendChild(link);
    messageDiv.appendChild(urlParagraph);
  });

  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;
}

// Function to read aloud the text
// function readAloud(text) {
//   const utterance = new SpeechSynthesisUtterance(text);
//   const speechSynthesis = window.speechSynthesis;
//   speechSynthesis.speak(utterance);
// }
