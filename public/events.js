

function onMessage(messageType, callback) {
  chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
      if (message.type === messageType) {
        callback(message, sender, sendResponse);
      }
    }
  );
}

function sendMessage(message) {
  chrome.runtime.sendMessage(message);
}
