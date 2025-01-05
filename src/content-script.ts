import { findCommand } from "./commands";

declare global {
  interface Window {
    contentScriptIsLoaded: boolean;
  }
}

(function () {
  if (window.contentScriptIsLoaded) {
    return;
  }
  window.contentScriptIsLoaded = true;

  let interval: NodeJS.Timeout | null = null;
  let container: HTMLDivElement | null = null;

  function removeMessage() {
    if (interval) {
      clearTimeout(interval);
      interval = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  }

  function showMessage(message: string) {
    removeMessage();

    container = document.createElement("div");

    document.body.appendChild(container);
    const shadow = container.attachShadow({ mode: "open" });

    var elem = document.createElement("div");
    elem.style.cssText =
      "position:fixed;opacity:0.8;z-index:99999;background:#000;top:20px;left:50%;transform:translateX(-50%);color:white;font-size:20px;text-align:center;padding:5px;";
    elem.textContent = message;
    shadow.appendChild(elem);

    interval = setTimeout(() => {
      removeMessage();
    }, 5000);
  }

  chrome.runtime.onMessage.addListener(async function (
    message,
    sender,
    sendResponse
  ) {
    if (message.type === "interim-results") {
      showMessage(message.message);
    } else if (message.type === "speech-final") {
      const cmd = await findCommand(message.message, window.location.href);
      console.log("speech-final", message, cmd);
      if (cmd != null && cmd.environment === "content-script") {
        cmd.action();
      }
    }
  });
})();
