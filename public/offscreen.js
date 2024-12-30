
console.log("offscreen.html", new Date().toISOString());

// Message sender
chrome.runtime.sendMessage({
  url: 'https://example.com'
});
