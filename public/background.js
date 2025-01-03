let triedPermission = false;
let tabId;

function createRecordTab() {
  chrome.tabs.create(
    {
      url: chrome.runtime.getURL("record.html"),
      pinned: true,
      active: false,
    },
    (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          tabId = tab.id;
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    }
  );
}

function sendTabMessage(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content-script.js"],
  }).then(() => {
    chrome.tabs.sendMessage(tabId, {
      type: "show-message",
      message: message.message,
    });
  });
}

chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    console.log("background receivedmessage", JSON.stringify(message, null, 2));
    if (message.type === "mic-permission-denied") {
      console.log("mic-permission-denied", message);
      // chrome.tabs.create({
      //   url: 'request-mic.html'
      // });
      if(triedPermission) {
        return;
      }
      triedPermission = true;
      chrome.tabs.update(sender.tab.id, {
        active: true,
      });
    } else if(message.type === "interim-results") {
      console.log("interim-results", message);
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        sendTabMessage(tabs[0].id, {
          type: "show-message",
          message: message.message,
        });
      });
    } else if (message.type === "speech-final") {
      console.log("speech-final", message);
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        sendTabMessage(tabs[0].id, {
          type: "show-message",
          message: message.message,
        });
      });
      if(message.message.includes("stop")) {
        chrome.runtime.sendMessage({
          type: "stop-mic",
        });
      } else if(message.message.toLowerCase().includes("open") && message.message.toLowerCase().includes("tab")) {
        chrome.tabs.create({
          url: 'https://www.google.com',
        });
      } else if(message.message.toLowerCase().includes("search")) {
        let searchTerm = message.message.split("search")[1].trim();
        if(searchTerm.startsWith("for")) {
          searchTerm = searchTerm.replace("for", "").trim();
        }
        chrome.tabs.create({
          url: `https://www.google.com/search?q=${searchTerm}`,
        });
      
      }
    } else if(message.type === "start-mic") {
      if(tabId!=null) {
        chrome.tabs.query({id: tabId}, (tabs) => {
          if(tabs.length > 0) {
            console.log("tab already exists");
          } else {
            createRecordTab();
          }
        });
      } else {
        createRecordTab();
      }
    }
  }
);

// chrome.offscreen.createDocument({
//   url: chrome.runtime.getURL('offscreen.html'),
//   reasons: ['CLIPBOARD'],
//   justification: 'testing the offscreen API',
// });
