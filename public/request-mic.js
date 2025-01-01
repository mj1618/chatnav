
navigator.webkitGetUserMedia({
  audio: true,
}, function(stream) {
  // stream.stop();
//   console.log("stream", stream);
// recognition.continuous = true;
// autoRestart = true;
// recognition.start();
  // window.close();
  chrome.runtime.sendMessage({
    type: "mic-permission-granted",
  });
}, function() {
  // Aw. No permission (or no microphone available).
  console.log("no permission");
});

