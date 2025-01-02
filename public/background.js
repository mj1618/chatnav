
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    console.log("background receivedmessage", message);
    if (message.type === "mic-permission-denied") {
      console.log("mic-permission-denied", message);

      chrome.tabs.create({
        url: 'request-mic.html'
      });
    } else if (message.type === "speech-final") {
      console.log("speech-final", message);
      if(message.message.includes("stop")) {
        chrome.runtime.sendMessage({
          type: "stop-mic",
        });
      } else if(message.message.toLowerCase().includes("open") && message.message.toLowerCase().includes("tab")) {
        chrome.tabs.create({
          url: 'https://www.google.com',
        });
      } else if(message.message.toLowerCase().includes("search")) {
        let newMessage = message.message.replace("search", "");
        newMessage = newMessage.replace("search for", "");
        chrome.tabs.create({
          url: `https://www.google.com/search?q=${newMessage}`,
        });
      }
    }
  }
);

chrome.offscreen.createDocument({
  url: chrome.runtime.getURL('offscreen.html'),
  reasons: ['CLIPBOARD'],
  justification: 'testing the offscreen API',
});

