let mediaRecorder;
let chosenDevice;
let allDevices;
let isMicOn = false;
let speeches = [];
let triedPermission = false;
let audioContext;

let isSpeaking = true;
let lastSpeakingTime = -1;
var detectSoundId = 0;
let worker;

function stopAll() {
  try {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => {
      track.stop();
    });
    isMicOn = false;
    chrome.runtime.sendMessage({
      type: "mic-turned-off",
    });
  } catch (e) {
    console.error("Error stopping mic", e);
  }
}

startWorker();

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "mic-permission-granted") {
    startUserMedia();
  } else if (message.type === "set-device") {
    chosenDevice = message.device;
    if (isMicOn) {
      stopAll();
      startUserMedia();
    }
  } else if (message.type === "request-devices") {
    chrome.runtime.sendMessage({
      type: "devices",
      devices: allDevices,
      chosenDevice: chosenDevice,
    });
  } else if (message.type === "stop-mic") {
    stopAll();
  } else if (message.type === "start-mic") {
    startUserMedia();
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
        sampleRate: 16000,
        latency: 0.002,
      },
      deviceId: chosenDevice.deviceId,
    },
    function (stream) {
      console.log("started webkit audio");
      mediaRecorder = new MediaRecorder(stream);
      audioContext = new AudioContext({ sampleRate: 16000 });

      // console.log(stream.)
      console.log("mediaRecorder", mediaRecorder, stream, stream.getTracks());
      let chunks = [];
      let lastStartTime = new Date().getTime();
      let isStopped = false;
      mediaRecorder.ondataavailable = async function (event) {
        if (isStopped) {
          return;
        }
        if (event.data.size <= 0) {
          mediaRecorder.requestData();
          return;
        }
        chunks.push(event.data);

        if (new Date().getTime() - lastStartTime > 5_000) {
          mediaRecorder.stop();
          startUserMedia();
          isStopped = true;
          lastStartTime = new Date().getTime();
          chunks = [];
          return;
        }

        const fileReader = new FileReader();
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });

        fileReader.onload = async () => {
          // console.log("result", fileReader.result);
          let decoded = await audioContext.decodeAudioData(fileReader.result);
          let audio = decoded.getChannelData(0);
          if (audio.length > 16000 * 30) {
            // Get last MAX_SAMPLES
            audio = audio.slice(-16000 * 30);
          }
          worker.postMessage({
            type: "generate",
            data: { audio, language: "en" },
          });
        };
        fileReader.readAsArrayBuffer(blob);
      };

      mediaRecorder.onstart = function () {
        console.log("mediaRecorder onstart");
      };

      mediaRecorder.onstop = function () {
        console.log("mediaRecorder onstop");
        // isMicOn = false;
        // chrome.runtime.sendMessage({
        //   type: "mic-turned-off",
        // });
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
        // isMicOn = false;
        // chrome.runtime.sendMessage({
        //   type: "mic-turned-off",
        // });
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

function startWorker() {
  if (!worker) {
    worker = new Worker(
      new URL("./offscreen-whisper-worker.js", import.meta.url),
      {
        type: "module",
      }
    );
    worker.postMessage({ type: "load" });

    const onMessageReceived = (e) => {
      console.log("onMessageReceived", e.data);
      switch (e.data.status) {
        case "loading":
          // Model file start load: add a new progress item to the list.
          // setStatus("loading");
          // setLoadingMessage(e.data.data);
          break;

        case "initiate":
          // setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          // setProgressItems((prev) =>
          //   prev.map((item) => {
          //     if (item.file === e.data.file) {
          //       return { ...item, ...e.data };
          //     }
          //     return item;
          //   })
          // );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          // setProgressItems((prev) =>
          //   prev.filter((item) => item.file !== e.data.file)
          // );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          // setStatus("ready");
          // mediaRecorder.start(250);
          // mediaRecorder.requestData();

          startUserMedia();
          break;

        case "start":
          {
            // Start generation
            // setIsProcessing(true);
            // Request new data from the recorder
            // mediaRecorder.requestData();
          }
          break;

        case "update":
          {
            // Generation update: update the output text.
            // const { tps } = e.data;
            // setTps(tps);
            // chrome.runtime.sendMessage({
            //   type: "interim-results",
            //   messages: e.data.tps,
            // });
          }
          break;

        case "complete":
          // Generation complete: re-enable the "Generate" button
          // setIsProcessing(false);
          // setText(e.data.output);
          chrome.runtime.sendMessage({
            type: "speech-final",
            message: e.data.output[0].replace(/[\[\]]/g, ""), // remove everything inside square brackes
          });
          break;
      }
    };
    worker.addEventListener("message", onMessageReceived);
  }
  // Attach the callback function as an event listener.

  navigator.mediaDevices.enumerateDevices().then(function (devices) {
    console.log(
      "devices",
      devices.map((d) => d.label)
    );
    console.log("devices", devices);
    chosenDevice = devices[0];
    allDevices = devices;
  });
}
