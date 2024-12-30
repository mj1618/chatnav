
function show () {
  
  console.log("background.js", new Date().toISOString());


}

setInterval(show, 1000);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension:", JSON.stringify(request));
    if (request.greeting === "hello")
      sendResponse({farewell: "goodbye"});
  }
);

chrome.offscreen.createDocument({
  url: chrome.runtime.getURL('offscreen.html'),
  reasons: ['CLIPBOARD'],
  justification: 'testing the offscreen API',
});
