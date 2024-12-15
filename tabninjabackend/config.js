// config.js
module.exports = {
  app: {
    port: 3000,
  },
  db: {
    host: "localhost",
    port: 8000,
    name: "webpage_texts",
  },
  nomic: {
    url: "http://localhost:11434/v1/embeddings",
    modleName: "nomic-embed-text",
  },
  ollama: {
    url: "http://localhost:11434/api/generate",
    modelName: "llama3.2",
  },
};
