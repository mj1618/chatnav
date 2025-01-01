
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    console.log("background receivedmessage", message);
    if (message.type === "mic-permission-denied") {
      console.log("mic-permission-denied", message);

      chrome.tabs.create({
        url: 'request-mic.html'
      });
    }
  }
);

chrome.offscreen.createDocument({
  url: chrome.runtime.getURL('offscreen.html'),
  reasons: ['CLIPBOARD'],
  justification: 'testing the offscreen API',
});

