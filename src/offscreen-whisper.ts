// import vad, { MicVAD } from "@ricky0123/vad/dist/index.browser";
import { MicVAD } from "@ricky0123/vad";
import { audioSettings } from "./audio-settings";
import { ChatNavMessage } from "./types";
import { concatArrays, getAllDevices, selectDevice } from "./utils";

declare global {
  var vad: any;
}

let mediaRecorder: MicVAD;
let micStatus: "on" | "off" | "loading" = "off";
let speeches: string[] = [];
let audioContext: AudioContext;
let lastComputedTranscript = "";
let worker: Worker;
let speechStarted = false;
let chosenDevice: InputDeviceInfo | null = null;
// let modelId = "onnx-community/whisper-large-v3-turbo";
let modelId = "onnx-community/whisper-base.en";

function stopAll() {
  try {
    if (mediaRecorder) {
      mediaRecorder.stream.getTracks().forEach((track: any) => {
        track.stop();
      });
      mediaRecorder.pause();
      // @ts-ignore
      mediaRecorder.destroy();
    }
    micStatus = "off";
    chrome.runtime.sendMessage({
      type: "mic-turned-off",
    });
  } catch (e) {
    console.error("Error stopping mic", e);
  }
}

startWorker();

chrome.runtime.onMessage.addListener(async function (
  message: ChatNavMessage,
  // @ts-ignore
  sender: any,
  // @ts-ignore
  sendResponse: any
) {
  if (message.type === "mic-permission-granted") {
    startUserMedia();
  } else if (message.type === "set-device") {
    chosenDevice = await selectDevice(message.deviceId);
    if (micStatus === "on") {
      startUserMedia();
    }
  } else if (message.type === "request-devices") {
    chrome.runtime.sendMessage({
      type: "devices",
      devices: await getAllDevices(),
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

let toFinalize: Float32Array[] = [];

async function startUserMedia() {
  stopAll();
  micStatus = "loading";
  chrome.runtime.sendMessage({
    type: "mic-loading",
  });
  chosenDevice = await selectDevice(chosenDevice?.deviceId);

  console.log("startUserMedia", chosenDevice);
  navigator.webkitGetUserMedia(
    {
      audio: {
        ...audioSettings(chosenDevice),
        deviceId: chosenDevice.deviceId,
      },
    },
    async function (stream) {
      console.log("started webkit audio");
      // mediaRecorder = new MediaRecorder(stream);
      audioContext = new AudioContext({
        sampleRate: stream.getTracks()[0].getSettings().sampleRate,
      });

      console.log("mediaRecorder", mediaRecorder, stream, stream.getTracks());

      let lastSpeechTime = -1;
      let bufs: Float32Array[] = [];
      let prebufs: Float32Array[] = [];

      vad.MicVAD.new({
        // model: "v5",
        baseAssetPath: "/lib/",
        onnxWASMBasePath: "/lib/",
        stream,
        // onSpeechStart: onSpeechStart,
        // onSpeechEnd: onSpeechEnd,
        // @ts-ignore
        onFrameProcessed: function (
          probs: { isSpeech: number },
          data: Float32Array
        ) {
          if (probs.isSpeech > 0.5 && !speechStarted) {
            console.log("speech start");
            speechStarted = true;
            bufs = [...prebufs];
            prebufs = [];
          }

          if (speechStarted) {
            console.log("pushing started speech", data.length);
            bufs.push(data);
            if (!whisperIsProcessing) {
              whisperIsProcessing = true;
              worker.postMessage({
                type: "generate",
                data: { audio: concatArrays(bufs), language: "en" },
              });
            }
          } else {
            prebufs.push(data);
            // console.log("pushing prebufs", prebufs.length);
            if (prebufs.length > 20) {
              prebufs = prebufs.slice(-20);
            }
          }

          if (probs.isSpeech > 0.2) {
            console.log("setting lastSpeechTime", new Date().getTime());
            lastSpeechTime = new Date().getTime();
          }

          if (
            probs.isSpeech < 0.2 &&
            speechStarted &&
            new Date().getTime() - lastSpeechTime > 10
          ) {
            console.log("speech end");
            console.log("onSpeechEnd", bufs.length, prebufs.length);

            if (whisperIsProcessing) {
              toFinalize.push(concatArrays(bufs));
            } else {
              whisperIsProcessing = true;
              worker.postMessage({
                type: "generate",
                data: { audio: concatArrays(bufs), language: "en" },
              });
            }

            bufs = [];

            speechStarted = false;
          }
        },
      }).then((v: MicVAD) => {
        mediaRecorder = v;
        // console.log(stream.)
        console.log("mediaRecorder", mediaRecorder, stream, stream.getTracks());

        mediaRecorder.start();

        micStatus = "on";
        chrome.runtime.sendMessage({
          type: "mic-turned-on",
        });
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

let whisperIsProcessing = false;

async function startWorker() {
  micStatus = "loading";
  chrome.runtime.sendMessage({
    type: "mic-loading",
  });

  if (!worker) {
    worker = new Worker(
      new URL("./offscreen-whisper-worker.js", import.meta.url),
      {
        type: "module",
      }
    );
    worker.postMessage({
      type: "load",
      modelId,
    });

    let interim = "";
    let inferenceStartTime = 0;
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
          chrome.runtime.sendMessage({
            type: "progress",
            message: 0,
          });
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
          console.log("progress", e);
          chrome.runtime.sendMessage({
            type: "progress",
            message: e.data.progress,
          });
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
            // setwhisperIsProcessing(true);
            // Request new data from the recorder
            // mediaRecorder.requestData();
            console.log("inference started", e.data);
            inferenceStartTime = new Date().getTime();
            whisperIsProcessing = true;
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
            interim += e.data.output;
            // chrome.runtime.sendMessage({
            //   type: "interim-results",
            //   message: interim,
            // });
            console.log("inference update", e.data);
            whisperIsProcessing = true;
          }
          break;

        case "complete":
          interim = "";
          const transcript = e.data.output[0]
            .replace(/\[[.+?]\]/g, "")
            .replace(/\[(.+?)\]/g, "")
            .trim();
          console.log("complete", e);
          console.log(
            "inference time",
            new Date().getTime() - inferenceStartTime
          );
          inferenceStartTime = 0;
          transcript.replaceAll(",", "");
          transcript.replaceAll(".", "");
          if (speechStarted) {
            chrome.runtime.sendMessage({
              type: "interim-results",
              message: transcript,
            });
            lastComputedTranscript = transcript;
          } else {
            chrome.runtime.sendMessage({
              type: "speech-final",
              message: transcript,
            });
          }

          if (toFinalize.length > 0) {
            whisperIsProcessing = true;
            worker.postMessage({
              type: "generate",
              data: { audio: toFinalize.shift(), language: "en" },
            });
          } else {
            whisperIsProcessing = false;
          }
          break;
      }
    };
    worker.addEventListener("message", onMessageReceived);
  } else {
    startUserMedia();
  }
  // Attach the callback function as an event listener.
}
