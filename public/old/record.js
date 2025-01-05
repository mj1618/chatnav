

let mediaRecorder;
let connection;
let chosenDevice;
let allDevices;
let isMicOn = false;
let recognition;
let triedPermission = false;

let finals = [];
let currentInterim = "";

start();


navigator.permissions.query(
  { name: 'microphone' }
).then(function(permissionStatus){
  if(permissionStatus.state === "granted") {
    start();
  } else if(permissionStatus.state === "prompt") {
    chrome.runtime.sendMessage({
      type: "mic-permission-denied",
    });
  } else {
    chrome.runtime.sendMessage({
      type: "mic-permission-denied",
    });
  }

  console.log(permissionStatus.state); // granted, denied, prompt

  permissionStatus.onchange = function(){
      console.log("Permission changed to " + this.state);
  }

})

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "mic-permission-granted") {
    start();
  } else if (message.type === "set-device") {
    chosenDevice = message.device;
    if(isMicOn) {
      stop();
      start();
    }
  } else if (message.type === "request-devices") {
    chrome.runtime.sendMessage({
      type: "devices",
      devices: allDevices,
      chosenDevice: chosenDevice,
    });
  } else if (message.type === "stop-mic") {
    stop();
  } else if (message.type === "start-mic") {
    if(!isMicOn) {
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
  startSpeechRecognition();
}

function startSpeechRecognition() {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
    console.log("speechRecognition onstart");
    isMicOn = true;
    chrome.runtime.sendMessage({
      type: "mic-turned-on",
    });
  };

  recognition.onresult = function(event) {
    let interim = "";
    let final = "";
    for(let i = event.resultIndex; i < event.results.length; i++) {
      console.log("speechRecognition onresult", event.results[i]);
      
      if(event.results[i].isFinal) {
        final += event.results[i][0].transcript;
        interim = "";
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    if(final.length > 0) {
      finals.push(final);
      chrome.runtime.sendMessage({
        type: "speech-final",
        message: final,
      });
    }

    if(interim.length > 0) {
      currentInterim = interim;
      chrome.runtime.sendMessage({
        type: "interim-results",
        message: interim,
      });
    }
  };

  recognition.onend = function() {
    console.log("speechRecognition onend");
    isMicOn = false;
    recognition.start();
    // chrome.runtime.sendMessage({
    //   type: "mic-turned-off",
    // });
  };

  recognition.onerror = function(event) {
    console.log("speechRecognition onerror", event);
    isMicOn = false;
    if(event.error === "not-allowed" || event.error === "service-not-allowed") {
      
      if(!triedPermission) {
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
    if(recognition) {
      recognition.stop();
    }
    isMicOn = false;
    chrome.runtime.sendMessage({
      type: "mic-turned-off",
    });
  } catch (e) {
    console.error("Error stopping mic", e);
  }
}
