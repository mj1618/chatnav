
navigator.webkitGetUserMedia({
  audio: true,
}, function(stream) {
  // stream.stop();
//   console.log("stream", stream);
// recognition.continuous = true;
// autoRestart = true;
// recognition.start();
  // window.close();
  let recognition = new webkitSpeechRecognition();
  recognition.onresult = function(event) {
    console.log("recognition onresult", event);
  };
  recognition.start();
  recognition.onend = function() {
    console.log("recognition onend");
  };
  recognition.onstart = function() {
    console.log("recognition onstart");

    chrome.runtime.sendMessage({
      type: "mic-permission-granted",
    });
  };
  recognition.start();
}, function() {
  // Aw. No permission (or no microphone available).
  console.log("no permission");
});

