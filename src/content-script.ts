import { executeCommand } from "./commands";
import { showMessage } from "./commands-dom";

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

  chrome.runtime.onMessage.addListener(async function (
    message,
    sender,
    sendResponse
  ) {
    if (message.type === "interim-results") {
      showMessage(message.message);
    } else if (message.type === "speech-final") {
      showMessage(message.message);
      // const cmd = await findCommand(message.message, window.location.href);
      // console.log("speech-final", message, cmd);
      // if (cmd != null && cmd.environment === "content-script") {
      //   cmd.action();
      // }
      executeCommand(message.message);
    }
  });
})();
