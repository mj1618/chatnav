// import vad, { MicVAD } from "@ricky0123/vad/dist/index.browser";
import { ChatNavMessage } from "./types";
import { concatArrays } from "./utils";

declare global {
  var vad: any;
}

let mediaRecorder: any;
let chosenDevice: MediaDeviceInfo;
let allDevices: MediaDeviceInfo[];
let micStatus: "on" | "off" | "loading" = "off";
let speeches: string[] = [];
let audioContext: AudioContext;
let lastComputedTranscript = "";
let worker: Worker;
let speechStarted = false;

function stopAll() {
  try {
    mediaRecorder.pause();
    micStatus = "off";
    chrome.runtime.sendMessage({
      type: "mic-turned-off",
    });
  } catch (e) {
    console.error("Error stopping mic", e);
  }
}

startWorker();

chrome.runtime.onMessage.addListener(function (
  message: ChatNavMessage,
  // @ts-ignore
  sender: any,
  // @ts-ignore
  sendResponse: any
) {
  if (message.type === "mic-permission-granted") {
    startUserMedia();
  } else if (message.type === "set-device") {
    chosenDevice = message.device;
    if (micStatus === "on") {
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
    console.log("sending mic status", micStatus);
    chrome.runtime.sendMessage({
      type:
        micStatus === "on"
          ? "mic-turned-on"
          : micStatus === "off"
          ? "mic-turned-off"
          : "mic-loading",
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
  micStatus = "loading";
  chrome.runtime.sendMessage({
    type: "mic-loading",
  });
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
      // mediaRecorder = new MediaRecorder(stream);
      audioContext = new AudioContext({ sampleRate: 16000 });

      // console.log(stream.)
      console.log("mediaRecorder", mediaRecorder, stream, stream.getTracks());

      let lastSpeechEndTime = -1;
      let lastSpeechTime = -1;
      let bufs: Float32Array[] = [];
      let prebufs: Float32Array[] = [];

      const onSpeechStart = () => {
        console.log("speech start");
        speechStarted = true;
        bufs = [...prebufs];
        prebufs = [];
      };

      const onSpeechEnd = () => {
        console.log("speech end");

        chrome.runtime.sendMessage({
          type: "speech-final",
          message: lastComputedTranscript,
        });
        bufs = [];

        speechStarted = false;
        lastSpeechEndTime = new Date().getTime();
      };

      vad.MicVAD.new({
        // model: "v5",
        baseAssetPath: "/lib/",
        onnxWASMBasePath: "/lib/",
        stream,
        additionalAudioConstraints: {
          // @ts-ignore
          latency: 0.002,
        },
        // onSpeechStart: onSpeechStart,
        // onSpeechEnd: onSpeechEnd,
        // @ts-ignore
        onFrameProcessed: function (
          probs: { isSpeech: number },
          data: Float32Array
        ) {
          if (probs.isSpeech > 0.5 && !speechStarted) {
            onSpeechStart();
          }

          if (speechStarted) {
            bufs.push(data);
            worker.postMessage({
              type: "generate",
              data: { audio: concatArrays(bufs), language: "en" },
            });
          } else {
            prebufs.push(data);
            if (prebufs.length > 30) {
              prebufs = prebufs.slice(-30);
            }
          }

          if (probs.isSpeech > 0.5) {
            lastSpeechTime = new Date().getTime();
          }

          if (
            probs.isSpeech < 0.5 &&
            speechStarted &&
            new Date().getTime() - lastSpeechTime > 1000
          ) {
            onSpeechEnd();
          }
        },
      }).then((v: any) => {
        mediaRecorder = v;
        // console.log(stream.)
        console.log("mediaRecorder", mediaRecorder, stream, stream.getTracks());

        mediaRecorder.start();

        micStatus = "on";
        chrome.runtime.sendMessage({
          type: "mic-turned-on",
        });
      });

      micStatus = "on";
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
      new URL("./offscreen-whisper-worker-en.js", import.meta.url),
      {
        type: "module",
      }
    );
    worker.postMessage({ type: "load" });

    const onMessageReceived = (e: any) => {
      // console.log("onMessageReceived", e.data);
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
          const transcript = e.data.output[0].replace(/[\[\]]/g, "");
          console.log("complete", e);
          if (speechStarted) {
            chrome.runtime.sendMessage({
              type: "interim-results",
              message: transcript,
            });
            lastComputedTranscript = transcript;
          }
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
