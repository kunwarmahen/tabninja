(() => {
  // Ignore text from these tags
  const ignoreTags = ["nav", "aside", "footer", ".ad", ".banner", "header"];

  // Collect important text only from non-ignored elements
  const importantText = Array.from(
    document.body.querySelectorAll("p, h1, h2, h3, article")
  )
    .filter((el) => !ignoreTags.some((tag) => el.closest(tag))) // Ignore elements inside unwanted tags
    .map((el) => el.innerText)
    .join(" ");

  // Send the important text back to the extension
  chrome.runtime.sendMessage({
    action: "tabinfo",
    tabText: importantText,
    tabUrl: window.location,
  });
})();
