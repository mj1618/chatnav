let triedPermission = false;
let recordTab;

const MicModes = {
  deepgram: "deepgram",
  browser: "browser",
  whisper: "whisper",
};

const MicMode = MicModes.whisper;

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
          recordTab = tab;
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    }
  );
}

function sendTabMessage(tabId, message) {
  console.log("sendTabMessage", tabId, message);
  try {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["content-script.js"],
      })
      .then(() => {
        chrome.tabs.sendMessage(tabId, {
          type: "show-message",
          message: message.message,
        });
      });
  } catch (e) {
    console.error("Error sending message to tab", e);
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("background receivedmessage", JSON.stringify(message, null, 2));
  if (message.type === "mic-permission-denied") {
    console.log("mic-permission-denied", message);

    if (triedPermission) {
      return;
    }
    triedPermission = true;
    if (MicMode === MicModes.deepgram || MicMode === MicModes.whisper) {
      chrome.tabs.create({
        url: "request-mic.html",
      });
    } else if (MicMode === MicModes.browser) {
      chrome.tabs.update(recordTab.id, {
        active: true,
      });
    }
  } else if (message.type === "interim-results") {
    console.log("interim-results", message);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.log("no active tab to send message to");
        return;
      }
      if (message.message.trim().length === 0) {
        return;
      }
      sendTabMessage(tabs[0].id, {
        type: "show-message",
        message: message.message,
      });
    });
  } else if (message.type === "speech-final") {
    console.log("speech-final", message);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.log("no active tab to send message to");
        return;
      }
      if (message.message.trim().length === 0) {
        return;
      }
      sendTabMessage(tabs[0].id, {
        type: "show-message",
        message: message.message,
      });
    });
    if (message.message.includes("stop")) {
      chrome.runtime.sendMessage({
        type: "stop-mic",
      });
    } else if (
      message.message.toLowerCase().includes("open") &&
      message.message.toLowerCase().includes("tab")
    ) {
      chrome.tabs.create({
        url: "https://www.google.com",
      });
    } else if (message.message.toLowerCase().includes("search")) {
      let searchTerm = message.message.split("search")[1].trim();
      if (searchTerm.startsWith("for")) {
        searchTerm = searchTerm.replace("for", "").trim();
      }
      chrome.tabs.create({
        url: `https://www.google.com/search?q=${searchTerm}`,
      });
    } else if (
      message.message.toLowerCase().includes("stop") &&
      (message.message.toLowerCase().includes("mic") ||
        message.message.toLowerCase().includes("microphone") ||
        message.message.toLowerCase().includes("recording"))
    ) {
      chrome.runtime.sendMessage({
        type: "stop-mic",
      });
    } else if (message.message.toLowerCase().includes("go back")) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.goBack(tabs[0].id);
        }
      });
    }
  } else if (message.type === "start-mic") {
    if (MicMode === MicModes.deepgram || MicMode === MicModes.whisper) {
      // do nothing, offscreen is already running
    } else if (MicMode === MicModes.browser) {
      if (recordTab != null) {
        chrome.tabs.query({ id: recordTab.id }, (tabs) => {
          if (tabs.length > 0) {
            console.log("tab already exists");
          } else {
            createRecordTab();
          }
        });
      } else {
        createRecordTab();
      }
    }
  } else if (message.type === "mic-turned-on") {
    chrome.action.setIcon({
      path: "assets/mic-red.png",
    });
    // chrome.action.setBadgeText({
    //   text: "Rec",
    // });
  } else if (message.type === "mic-turned-off") {
    chrome.action.setIcon({
      path: {
        16: "assets/mic-black.png",
        48: "assets/mic-black.png",
        128: "assets/mic-black.png",
      },
    });
    // chrome.action.setBadgeText({
    //   text: "",
    // });
  }
});

chrome.offscreen.createDocument({
  url: chrome.runtime.getURL("offscreen-whisper.html"),
  reasons: ["USER_MEDIA"],
  justification: "capturing mic audio",
});

chrome.action.setBadgeBackgroundColor({
  color: "red",
});

// let i = 0;
// setInterval(() => {
//   i = (i + 1) % 3;
//   chrome.action.setBadgeText({
//     text: ".".repeat(i + 1),
//   });
// }, 1000);

chrome.runtime.onStartup.addListener(() => {
  console.log(`prevent from going inactive`);
});
