import { executeCommand } from "./commands";
import {
  showMessage,
  startWriting,
  stopWriting,
  writeInterimText,
} from "./commands-dom";

declare global {
  interface Window {
    contentScriptIsLoaded: boolean;
  }
}
console.log("loading content script1");
(function () {
  console.log("loading content script2");
  if (window.contentScriptIsLoaded) {
    return;
  }
  window.contentScriptIsLoaded = true;
  window.inputMode = window.inputMode ?? "general";

  // setInterval(() => {
  //   try {
  //     const keyboardEventInit = {
  //       bubbles: false,
  //       cancelable: false,
  //       composed: false,
  //       key: "",
  //       code: "",
  //       location: 0,
  //     };
  //     const element = document.activeElement;

  //     if (element) {
  //       element.dispatchEvent(new KeyboardEvent("keydown", keyboardEventInit));
  //       //@ts-ignore
  //       element.value = "hello";
  //       element.dispatchEvent(new KeyboardEvent("keyup", keyboardEventInit));
  //       element.dispatchEvent(new Event("change", { bubbles: true }));
  //       console.log("done");
  //     }
  //   } catch (e) {
  //     console.error("fail");
  //   }
  // }, 100);

  // setTimeout(() => {
  //   chrome.runtime.sendMessage({
  //     type: "type",
  //     text: "hello",
  //   });
  //   console.log("sent!");
  // }, 7000);

  chrome.runtime.onMessage.addListener(async function (
    message,
    sender,
    sendResponse
  ) {
    if (message.type === "interim-results") {
      showMessage(message.message);
      if (window.inputMode === "writing") {
        writeInterimText(message.message);
      }
    } else if (message.type === "speech-final") {
      showMessage(message.message);
      // const cmd = await findCommand(message.message, window.location.href);
      // console.log("speech-final", message, cmd);
      // if (cmd != null && cmd.environment === "content-script") {
      //   cmd.action();
      // }
      executeCommand(message.message, window.inputMode!);
    } else if (message.type === "start-writing") {
      startWriting();
    } else if (message.type === "stop-writing") {
      stopWriting();
    }
  });
})();
