// Ensure this listener is only registered once
if (!window.hasClipboardListener) {
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getClipboardURL") {
      // Read from the clipboard and validate if it's a URL
      navigator.clipboard.readText().then((clipboardText) => {
        const isValidURL = validateURL(clipboardText);

        if (isValidURL) {
          // Send back the clipboard URL to the background script to complete the operation
          chrome.runtime.sendMessage({ action: "clipboardURL", url: clipboardText });
        } else {
          alert("You first must copy a valid URL.");
        }
      }).catch((err) => {
        alert("Failed to read clipboard:", err);
      });
    }
  });

  // Mark that the listener has been registered
  window.hasClipboardListener = true;
}

// Utility function to validate if the string is a valid URL
function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}
