document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons and tab contents
    document
      .querySelectorAll(".tab-button")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    // Add active class to clicked button and corresponding tab content
    button.classList.add("active");
    document
      .getElementById(`${button.dataset.tab}-tab`)
      .classList.add("active");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const ollamaPathInput = document.getElementById("ollama-path");
  const localVdbCheckbox = document.getElementById("local-vdb");
  const embeddingModelInput = document.getElementById("embedding-model");
  const llmModelInput = document.getElementById("llm-model");
  const remotesvcUrlInput = document.getElementById("remotesvcurl");
  const saveButton = document.getElementById("save-button");

  function updateRemoteSvcUrlInputState() {
    remotesvcUrlInput.disabled = localVdbCheckbox.checked;
  }

  // Load saved settings from storage
  chrome.storage.sync.get(
    ["ollamaPath", "localVdb", "llmModel", "embeddingModel", "remoteSvcUrl"],
    (result) => {
      ollamaPathInput.value = result.ollamaPath || "";
      localVdbCheckbox.checked = result.localVdb || false;
      embeddingModelInput.value = result.embeddingModel || "";
      llmModelInput.value = result.llmModel || "";
      remotesvcUrlInput.value = result.remoteSvcUrl || "";
      console.log(localVdbCheckbox);
      updateRemoteSvcUrlInputState();
    }
  );

  localVdbCheckbox.addEventListener("change", updateRemoteSvcUrlInputState);

  saveButton.addEventListener("click", () => {
    const ollamaPath = ollamaPathInput.value;
    const localVdb = localVdbCheckbox.checked;
    console.log(localVdb);
    const embeddingModel = embeddingModelInput.value;
    const llmModel = llmModelInput.value;
    const remoteSvcUrl = remotesvcUrlInput.value;

    chrome.storage.sync.set(
      { ollamaPath, localVdb, llmModel, embeddingModel, remoteSvcUrl },
      () => {
        console.log(
          "Settings saved:",
          ollamaPath,
          localVdb,
          llmModel,
          embeddingModel,
          remoteSvcUrl
        );
      }
    );
  });
});
