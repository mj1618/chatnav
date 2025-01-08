let mediaRecorder;
let connection;
let { createClient } = deepgram;
let chosenDevice;
let allDevices;
let isMicOn = false;
let speeches = [];
let recognition;
let triedPermission = false;

let isSpeaking = true;
let lastSpeakingTime = -1;
var detectSoundId = 0;

function stop() {
  try {
    if (recognition) {
      recognition.stop();
    }
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => {
      track.stop();
    });
    isMicOn = false;
    chrome.runtime.sendMessage({
      type: "mic-turned-off",
    });
    console.log("stopping websocket", connection);
    if (connection) {
      connection.conn.close();
    }
    connection = null;
  } catch (e) {
    console.error("Error stopping mic", e);
  }
}

start();

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
      devices: allDevices,
      chosenDevice: chosenDevice,
    });
  } else if (message.type === "stop-mic") {
    stop();
  } else if (message.type === "start-mic") {
    start();
  } else if (message.type === "request-mic-status") {
    console.log("sending mic status", isMicOn);
    chrome.runtime.sendMessage({
      type: isMicOn ? "mic-turned-on" : "mic-turned-off",
    });
  } else if (message.type === "request-speech-finals") {
    chrome.runtime.sendMessage({
      type: "speech-finals",
      messages: speeches,
    });
  } else if (message.type === "interim-results") {
  }
});

function startUserMedia() {
  console.log("startUserMedia", chosenDevice);
  navigator.webkitGetUserMedia(
    {
      audio: {
        latency: 0.002,
      },
      deviceId: chosenDevice.deviceId,
    },
    function (stream) {
      console.log("started webkit audio");
      mediaRecorder = new MediaRecorder(stream);

      // console.log(stream.)
      console.log("mediaRecorder", mediaRecorder, stream, stream.getTracks());

      mediaRecorder.ondataavailable = function (event) {
        console.log("ondataavailable", event.data.type);
        if (!isSpeaking && new Date().getTime() - lastSpeakingTime > 5 * 1000) {
          console.log("not speaking");
          return;
        }
        if (
          event.data.size > 0 &&
          connection != null &&
          connection.getReadyState() == WebSocket.OPEN
        ) {
          // console.log("sending dataavailable", event.data.size);
          connection.send(event.data);
        } else {
          console.log(
            "not sending dataavailable",
            event.data.size,
            connection != null ? connection.getReadyState() : "null"
          );
        }
      };

      mediaRecorder.onstart = function () {
        console.log("mediaRecorder onstart");
        detectSound();
      };

      mediaRecorder.onstop = function () {
        console.log("mediaRecorder onstop");
        isMicOn = false;
        chrome.runtime.sendMessage({
          type: "mic-turned-off",
        });
      };

      mediaRecorder.onerror = function (event) {
        console.log("mediaRecorder onerror", event);
        isMicOn = false;
        chrome.runtime.sendMessage({
          type: "mic-turned-off",
        });
      };

      mediaRecorder.onpause = function (event) {
        console.log("mediaRecorder onpause", event);
        isMicOn = false;
        chrome.runtime.sendMessage({
          type: "mic-turned-off",
        });
      };

      mediaRecorder.onresume = function (event) {
        console.log("mediaRecorder onresume", event);
        isMicOn = true;
        chrome.runtime.sendMessage({
          type: "mic-turned-on",
        });
      };

      mediaRecorder.start(200);

      isMicOn = true;
      chrome.runtime.sendMessage({
        type: "mic-turned-on",
      });
    },
    function () {
      // Aw. No permission (or no microphone available).
      console.log("webkit audio permission denied");

      chrome.runtime.sendMessage({
        type: "mic-permission-denied",
      });
    }
  );
}

function start() {
  if (chosenDevice) {
    // startSpeechRecognition();
    startDeepgram();
    return;
  }
  navigator.mediaDevices.enumerateDevices().then(function (devices) {
    console.log(
      "devices",
      devices.map((d) => d.label)
    );
    console.log("devices", devices);
    chosenDevice = devices[0];
    allDevices = devices;
    // startSpeechRecognition();
    startDeepgram();
  });
}

function startSpeechRecognition() {
  recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.onstart = function () {
    console.log("speechRecognition onstart");
    isMicOn = true;
    chrome.runtime.sendMessage({
      type: "mic-turned-on",
    });
  };
  recognition.ondataavailable = function (event) {
    console.log("speechRecognition ondataavailable", event);
  };
  recognition.onresult = function (event) {
    console.log("speechRecognition onresult", event);
    chrome.runtime.sendMessage({
      type: "speech-final",
      message: event.results[event.results.length - 1][0].transcript,
    });
  };
  recognition.onend = function () {
    console.log("speechRecognition onend");
    isMicOn = false;
    chrome.runtime.sendMessage({
      type: "mic-turned-off",
    });
  };
  recognition.onerror = function (event) {
    console.log("speechRecognition onerror", event);
    isMicOn = false;
    chrome.runtime.sendMessage({
      type: "mic-turned-off",
    });

    if (!triedPermission) {
      chrome.runtime.sendMessage({
        type: "mic-permission-denied",
      });
      triedPermission = true;
    }
  };
  recognition.start();
  console.log("speechRecognition trying to start");
}

function detectSound() {
  // if(detectSoundInterval != null) {
  //   clearInterval(detectSoundInterval);
  // }
  // const audioContext      = new AudioContext();
  // const audioStreamSource = audioContext.createMediaStreamSource(mediaRecorder.stream);
  // const analyser          = audioContext.createAnalyser();
  // analyser.minDecibels    = -35;
  // audioStreamSource.connect(analyser);
  // const bufferLength      = analyser.frequencyBinCount;
  // const domainData        = new Uint8Array(bufferLength);
  // const myId = detectSoundId++;
  // function detectSoundData () {
  //   if(myId != detectSoundId) {
  //     return;
  //   }
  //   if(!isMicOn) {
  //     return;
  //   }
  //   analyser.getByteFrequencyData(domainData);
  //   const originalIsSpeaking = isSpeaking;
  //   isSpeaking = false;
  //   console.log("detectSoundData", domainData);
  //   for(let i = 0; i < bufferLength; i++){
  //       if(domainData[i] > 0){
  //           isSpeaking = true;
  //           lastSpeakingTime = new Date().getTime();
  //       }
  //   }
  //   if(originalIsSpeaking !== isSpeaking) {
  //     console.log("[analyser] speaking changed", isSpeaking);
  //   }
  //   window.requestAnimationFrame(detectSoundData);
  // };
  // window.requestAnimationFrame(detectSoundData);
}

setInterval(() => {
  if (connection && connection.getReadyState() === WebSocket.OPEN) {
    console.log("sending keepalive");
    connection.send(
      JSON.stringify({
        type: "KeepAlive",
      })
    );
  }
}, 3000); // Sending KeepAlive messages every 3 seconds

function startDeepgram() {
  const client = createClient("162c389cf3aac80cc803d8533c2df3e683d73c59");

  let is_finals = [];

  connection = client.listen.live({
    model: "nova-2",
    language: `en-US`,
    // Apply smart formatting to the output
    smart_format: true,
    // encoding: "linear16",
    // channels: 1,
    // sample_rate: 16000,
    // To get UtteranceEnd, the following must be set:
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
    // Time in milliseconds of silence to wait for before finalizing speech
    endpointing: 300,
    // keywords: ["open", "tab"],
  });

  connection.on("open", function () {
    console.log("Connection opened.");

    connection.on("close", () => {
      console.log("Connection closed.");
      const finals = is_finals.join(" ");
      console.log(`Speech finals onclose: ${finals}`);
      speeches.push(finals);
      chrome.runtime.sendMessage({
        type: "speech-final",
        message: finals,
      });
      is_finals = [];
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => {
        track.stop();
      });
    });

    connection.on("Metadata", (data) => {
      console.log(`Deepgram Metadata:`, data);
    });

    connection.on("Results", (data) => {
      const sentence = data.channel.alternatives[0].transcript;

      // Ignore empty transcripts
      if (sentence.length == 0) {
        return;
      }
      if (data.is_final) {
        // We need to collect these and concatenate them together when we get a speech_final=true
        // See docs: https://developers.deepgram.com/docs/understand-endpointing-interim-results
        is_finals.push(sentence);

        // Speech final means we have detected sufficent silence to consider this end of speech
        // Speech final is the lowest latency result as it triggers as soon an the endpointing value has triggered
        if (data.speech_final) {
          const finals = is_finals.join(" ");
          console.log(`Speech Final onresults: ${finals}`);
          speeches.push(finals);
          chrome.runtime.sendMessage({
            type: "speech-final",
            message: finals,
          });
          is_finals = [];
        } else {
          // These are useful if you need real time captioning and update what the Interim Results produced
          console.log(`Is interim onresults: ${sentence} ${data.is_final}`);
          chrome.runtime.sendMessage({
            type: "interim-results",
            message: is_finals.join(" "),
          });
        }
      } else {
        // These are useful if you need real time captioning of what is being spoken
        console.log(`Interim Results: ${sentence}`);
        chrome.runtime.sendMessage({
          type: "interim-results",
          message: is_finals.join(" ") + " " + sentence,
        });
      }
    });

    connection.on("UtteranceEnd", (data) => {
      const finals = is_finals.join(" ");
      console.log(`Deepgram UtteranceEnd: ${finals}`);
      is_finals = [];
    });

    connection.on("SpeechStarted", (data) => {
      console.log("Deepgram SpeechStarted");
    });

    connection.on("error", (err) => {
      console.error("Deepgram error", err);
    });

    startUserMedia();
  });
}
