document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("request-mic-button")
    ?.addEventListener("click", () => {
      requestMic();
    });
});

function requestMic() {
  navigator.webkitGetUserMedia(
    {
      audio: true,
    },
    function (stream) {
      document
        .getElementById("request-mic-success")
        ?.classList.remove("hidden");
      document.getElementById("request-mic")?.classList.add("hidden");
      chrome.runtime.sendMessage({
        type: "mic-permission-granted",
      });
      document
        .getElementById("request-mic-success-button")
        ?.addEventListener("click", () => {
          window.close();
        });
    },
    function () {
      // Aw. No permission (or no microphone available).
      console.log("no permission");
    }
  );
}
