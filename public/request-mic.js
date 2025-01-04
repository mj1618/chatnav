document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("request-mic-button")
    .addEventListener("click", () => {
      requestMic();
    });
});

function requestMic() {
  navigator.webkitGetUserMedia(
    {
      audio: true,
    },
    function (stream) {
      // stream.stop();
      //   console.log("stream", stream);
      // recognition.continuous = true;
      // autoRestart = true;
      // recognition.start();
      // window.close();
      document.getElementById("request-mic-success").classList.remove("hidden");
      document.getElementById("request-mic").classList.add("hidden");
      chrome.runtime.sendMessage({
        type: "mic-permission-granted",
      });
      document
        .getElementById("request-mic-success-button")
        .addEventListener("click", () => {
          window.close();
        });
    },
    function () {
      // Aw. No permission (or no microphone available).
      console.log("no permission");
    }
  );
}
