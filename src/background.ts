import { executeCommand } from "./commands";
import {
  createRecordTab,
  getActiveTab,
  sendTabMessage,
  stopAllRecordTabs,
} from "./utils";

let triedPermission = false;
let inFocus = true; // global boolean to keep track of state
let isMicOn = false;
let wasStartedLastFocus = false;

let MicMode = "browser" as "browser" | "whisper" | "deepgram";
let shouldTurnOffOnBlur = false;
let inputMode = "general" as "general" | "writing" | "editing";

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
    if (MicMode === "deepgram" || MicMode === "whisper") {
      chrome.tabs.create({
        url: "request-mic.html",
      });
    } else if (MicMode === "browser") {
      chrome.tabs.create({
        url: "request-mic.html",
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
    const tab = await getActiveTab();
    if (tab != null) {
      chrome.tabs.update(tab.id!, {
        active: true,
      });
      sendTabMessage(tab.id!, "speech-final", message.message);
    }

    executeCommand(message.message, inputMode);
    // const cmd = await findCommand(message.message, tab?.url);
    // if (cmd != null && cmd.environment === "service-worker") {
    //   cmd.action();
    // }
  } else if (message.type === "start-mic") {
    if (MicMode === "deepgram" || MicMode === "whisper") {
      // do nothing, offscreen is already running
    } else if (MicMode === "browser") {
      createRecordTab();
    }
  } else if (message.type === "mic-turned-on") {
    chrome.action.setIcon({
      path: "assets/mic-red.png",
    });
    isMicOn = true;
  } else if (message.type === "mic-turned-off") {
    chrome.action.setIcon({
      path: "assets/mic-black.png",
    });
    isMicOn = false;
    await stopAllRecordTabs();
  } else if (message.type === "start-writing") {
    inputMode = "writing";
    sendTabMessage((await getActiveTab())?.id, "start-writing");
  } else if (message.type === "stop-writing") {
    inputMode = "general";
    sendTabMessage((await getActiveTab())?.id, "stop-writing");
  } else if (message.type === "start-mic") {
    if (MicMode === "browser") {
      await stopAllRecordTabs();
      createRecordTab();
    } else {
      if (!(await isOffscreenRunning())) {
        try {
          chrome.offscreen.createDocument({
            url: chrome.runtime.getURL(`offscreen-${MicMode}.html`),
            // @ts-ignore
            reasons: ["USER_MEDIA"],
            justification: "capturing mic audio",
          });
        } catch (err) {
          console.log("error creating offscreen document", err);
        }
      }
    }
  } else if (message.type === "stop-mic") {
    if (MicMode === "browser") {
      isMicOn = false;
      chrome.action.setIcon({
        path: "assets/mic-black.png",
      });
      await stopAllRecordTabs();
    }
  }
});

const isOffscreenRunning = async () => {
  const contexts = await chrome.runtime.getContexts({
    // @ts-ignore
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  // @ts-ignore
  return contexts != null && contexts.length > 0;
};

(async () => {
  if (MicMode === "deepgram" || MicMode === "whisper") {
    if (!(await isOffscreenRunning())) {
      try {
        chrome.offscreen
          .createDocument({
            url: chrome.runtime.getURL(`offscreen-${MicMode}.html`),
            // @ts-ignore
            reasons: ["USER_MEDIA"],
            justification: "capturing mic audio",
          })
          .catch((err) => {
            console.log("error creating offscreen document", err);
          });
      } catch (err) {
        console.log("error creating offscreen document", err);
      }
    }
  } else if (MicMode === "browser") {
    await stopAllRecordTabs();
    createRecordTab();
  }

  chrome.runtime.onStartup.addListener(() => {
    console.log(`prevent from going inactive`);
  });

  chrome.windows.onFocusChanged.addListener(async function (window) {
    console.log(
      "focus change, isFocussed:",
      window != chrome.windows.WINDOW_ID_NONE
    );
    if (window == chrome.windows.WINDOW_ID_NONE) {
      inFocus = false;
      if (shouldTurnOffOnBlur) {
        wasStartedLastFocus = isMicOn;
        chrome.action.setIcon({
          path: "assets/mic-black.png",
        });
        await stopAllRecordTabs();
      }
    } else {
      inFocus = true;
      if (wasStartedLastFocus && shouldTurnOffOnBlur) {
        if (MicMode === "browser") {
          await stopAllRecordTabs();
          createRecordTab();
        } else {
          chrome.runtime.sendMessage({ type: "start-mic" });
        }
      }
    }
  });
})();
