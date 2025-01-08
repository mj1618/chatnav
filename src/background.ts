import { findCommand } from "./commands";
import { activeTab, createRecordTab, sendTabMessage } from "./utils";

let triedPermission = false;
let recordTab: chrome.tabs.Tab | null = null;

const MicModes = {
  deepgram: "deepgram",
  browser: "browser",
  whisper: "whisper",
};

const MicMode = MicModes.deepgram;

chrome.runtime.onMessage.addListener(async function (
  message,
  sender,
  sendResponse
) {
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
      chrome.tabs.update(recordTab!.id!, {
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
      sendTabMessage(tabs[0].id!, "interim-results", message.message);
    });
  } else if (message.type === "speech-final") {
    if (message.message.trim().length === 0) {
      return;
    }
    console.log("speech-final", message);
    const tab = await activeTab();
    if (tab != null) {
      sendTabMessage(tab.id!, "speech-final", message.message);
    }
    const cmd = await findCommand(message.message, tab?.url);
    if (cmd != null && cmd.environment === "service-worker") {
      cmd.action();
    }
  } else if (message.type === "start-mic") {
    if (MicMode === MicModes.deepgram || MicMode === MicModes.whisper) {
      // do nothing, offscreen is already running
    } else if (MicMode === MicModes.browser) {
      createRecordTab();
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

if (MicMode === MicModes.deepgram || MicMode === MicModes.whisper) {
  chrome.offscreen.createDocument({
    url: chrome.runtime.getURL(`offscreen-${MicMode}.html`),
    // @ts-ignore
    reasons: ["USER_MEDIA"],
    justification: "capturing mic audio",
  });
}

chrome.action.setBadgeBackgroundColor({
  color: "red",
});

chrome.runtime.onStartup.addListener(() => {
  console.log(`prevent from going inactive`);
});
