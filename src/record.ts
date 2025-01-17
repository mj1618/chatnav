let mediaRecorder;
let connection;
let chosenDevice;
let allDevices;
let isMicOn = false;
let recognition: SpeechRecognition = new (window.SpeechRecognition ||
  window.webkitSpeechRecognition)();
let triedPermission = false;

let finals: string[] = [];
let currentInterim = "";
let shouldRestart = false;
let lastStopped = -1;

start();

navigator.permissions
  // @ts-ignore
  .query({ name: "microphone" })
  .then(function (permissionStatus) {
    if (permissionStatus.state === "granted") {
      start();
    } else if (permissionStatus.state === "prompt") {
      chrome.runtime.sendMessage({
        type: "mic-permission-denied",
      });
    } else {
      chrome.runtime.sendMessage({
        type: "mic-permission-denied",
      });
    }

    console.log(permissionStatus.state); // granted, denied, prompt

    permissionStatus.onchange = function () {
      console.log("Permission changed to " + this.state);
    };
  });

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "mic-permission-granted") {
    start();
  } else if (message.type === "set-device") {
    chosenDevice = message.device;
    if (isMicOn) {
      stop();
      start();
    }
  } else if (message.type === "request-devices") {
    chrome.runtime.sendMessage({
      type: "devices",
    });
  } else if (message.type === "stop-mic") {
    stop();
  } else if (message.type === "start-mic") {
    if (!isMicOn) {
      start();
    }
  } else if (message.type === "request-mic-status") {
    console.log("sending mic status", isMicOn);
    chrome.runtime.sendMessage({
      type: isMicOn ? "mic-turned-on" : "mic-turned-off",
    });
  } else if (message.type === "request-speech-finals") {
    chrome.runtime.sendMessage({
      type: "speech-finals",
      messages: finals,
    });
  } else if (message.type === "interim-results") {
    chrome.runtime.sendMessage({
      type: "interim-results",
      message: currentInterim,
    });
  }
});

function start() {
  shouldRestart = true;
  startSpeechRecognition();
}

function startSpeechRecognition() {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognition.onstart = function () {
    console.log("speechRecognition onstart");
    isMicOn = true;
    chrome.runtime.sendMessage({
      type: "mic-turned-on",
    });
  };

  recognition.onresult = function (event: SpeechRecognitionEvent) {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      console.log("speechRecognition onresult", event.results[i]);

      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
        interim = "";
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    if (final.length > 0) {
      finals.push(final);
      currentInterim = "";
      chrome.runtime.sendMessage({
        type: "speech-final",
        message: final,
      });
    }

    if (interim.length > 0) {
      currentInterim = interim;
      chrome.runtime.sendMessage({
        type: "interim-results",
        message: interim,
      });
    }
  };

  recognition.onend = function (e) {
    console.log("speechRecognition onend", e);

    if (shouldRestart) {
      if (lastStopped !== -1 && new Date().getTime() - lastStopped < 100) {
        // thrashing
        console.log("restarting too frequently, stopping");
        chrome.runtime.sendMessage({
          type: "mic-turned-off",
        });
      } else {
        lastStopped = new Date().getTime();
        recognition.start();
      }
    } else {
      lastStopped = new Date().getTime();
      isMicOn = false;
      chrome.runtime.sendMessage({
        type: "mic-turned-off",
      });
    }
  };

  recognition.onerror = function (event) {
    console.log("speechRecognition onerror", event);
    isMicOn = false;
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      shouldRestart = false;
      if (!triedPermission) {
        chrome.runtime.sendMessage({
          type: "mic-permission-denied",
        });
        triedPermission = true;
      }

      chrome.runtime.sendMessage({
        type: "mic-turned-off",
      });
    } else {
      recognition.start();
    }
  };

  recognition.start();

  console.log("speechRecognition trying to start");
}

function stop() {
  try {
    shouldRestart = false;
    recognition.stop();
  } catch (e) {
    console.error("Error stopping mic", e);
  }
}

chrome.windows.onFocusChanged.addListener(function (currWindow) {
  console.log(
    "focus change, isFocussed:",
    currWindow != chrome.windows.WINDOW_ID_NONE
  );
  if (currWindow == chrome.windows.WINDOW_ID_NONE) {
    window.close();
  }
});
