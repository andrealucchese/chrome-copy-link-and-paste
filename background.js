// background.js

// Create context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, setting up context menus...");

  // First menu: Copy selected text with link to the current page
  chrome.contextMenus.create({
    id: "copyWithLinkToCurrentPage",
    title: "Copy text with link to the current page",
    contexts: ["selection"]
  });

  // Second menu: Copy selected text with link to the URL copied to clipboard
  chrome.contextMenus.create({
    id: "copyWithLinkToClipboardURL",
    title: "Copy text with link to the link you copied",
    contexts: ["selection"]
  });
});

// Listen for context menu click events
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copyWithLinkToCurrentPage") {
    // Copy the selected text with the link to the current page
    executeScript(tab.id, copyTextWithLink, { linkToClipboard: false });
  } else if (info.menuItemId === "copyWithLinkToClipboardURL") {
    // Dynamically inject the content script and request the clipboard URL
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js'] // Ensure the content script is injected
    }, () => {
      // Send a message to the content script to get the clipboard URL
      chrome.tabs.sendMessage(tab.id, { action: "getClipboardURL" });
    });
  }
});

// Listen for the keyboard shortcut commands
// Listen for the keyboard shortcut commands and prevent multiple injections
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "copyWithLinkToCurrentPage") {
    // Trigger the action for copying text with a link to the current page
    console.log("Shortcut triggered: Copy text with link to the current page");
    executeScript(tab.id, copyTextWithLink, { linkToClipboard: false });
  } else if (command === "copyWithLinkToClipboardURL") {
    // Check if the content script is already injected
    const [activeTab] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    if (!activeTab) {
      // Inject the content script only if not already injected
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
      });
    }

    // Send a message to the content script to get the clipboard URL
    chrome.tabs.sendMessage(tab.id, { action: "getClipboardURL" });
  }
});

// Listen for clipboard URL messages from the content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "clipboardURL") {
    // Clipboard URL received, execute the copyTextWithLink function using the clipboard URL
    executeScript(sender.tab.id, copyTextWithLink, { linkToClipboard: true, clipboardURL: message.url });
  }
});

// Utility to execute a script in the active tab
function executeScript(tabId, func, options) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: func,
    args: [options]
  });
}

// Function to copy the selected text with the current page URL or clipboard URL
function copyTextWithLink({ linkToClipboard, clipboardURL }) {
  const selection = window.getSelection();

  if (selection && selection.toString().trim().length > 0) {
    const selectedText = selection.toString();
    const pageURL = window.location.href;

    // Determine the link to use (current page URL or clipboard URL)
    const linkURL = linkToClipboard ? clipboardURL : pageURL;

    // Create the anchor element with the selected text and link (HTML)
    const anchorElement = document.createElement('a');
    anchorElement.href = linkURL;
    anchorElement.textContent = selectedText;

    // HTML formatted content
    const htmlContent = anchorElement.outerHTML;

    // Plain text fallback content (to be used in non-rich-text editors)
    const plainTextContent = `${selectedText} (${linkURL})`;

    // Create a clipboard item with both HTML and plain text content
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([htmlContent], { type: 'text/html' }),
      'text/plain': new Blob([plainTextContent], { type: 'text/plain' })
    });

    // Write the clipboard item
    navigator.clipboard.write([clipboardItem])
        .then(() => {
          console.log('Selected text and link copied as HTML and plain text!');
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
        });
  }
}