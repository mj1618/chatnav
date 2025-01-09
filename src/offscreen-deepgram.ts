import { MicVAD } from "@ricky0123/vad";
import { audioSettings } from "./audio-settings";
import { ChatNavMessage } from "./types";
import { concatArrays, getAllDevices, selectDevice } from "./utils";

declare global {
  interface Window {
    deepgram: any;
  }
}

let mediaRecorder: MicVAD;
let connection: {
  conn: WebSocket;
  getReadyState: () => number;
  send: (data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
} | null = null;
let { createClient } = window.deepgram;
let micStatus: "on" | "off" | "loading" = "off";
let speeches: string[] = [];
let triedPermission = false;
let mediaStream: MediaStream;
let chosenDevice: InputDeviceInfo | null = null;

function stop() {
  try {
    console.log("stopping mediaRecorder", mediaRecorder);
    mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
    // @ts-ignore
    mediaRecorder.destroy();
    micStatus = "off";
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

let inferenceStartTime = 0;

chrome.runtime.onMessage.addListener(async function (
  message: ChatNavMessage,
  sender: any,
  sendResponse: any
) {
  if (message.type === "mic-permission-granted") {
    start();
  } else if (message.type === "set-device") {
    chosenDevice = await selectDevice(message.deviceId);
    if (micStatus === "on") {
      stop();
      start();
    }
  } else if (message.type === "request-devices") {
    chrome.runtime.sendMessage({
      type: "devices",
      devices: await getAllDevices(),
      chosenDevice: chosenDevice,
    });
  } else if (message.type === "stop-mic") {
    stop();
  } else if (message.type === "start-mic") {
    start();
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

let speechStarted = false;

async function startUserMedia() {
  navigator.webkitGetUserMedia(
    {
      audio: {
        ...audioSettings(chosenDevice!, { sampleRate: 16_000 }),
        deviceId: chosenDevice!.deviceId,
      },
    },
    function (stream) {
      console.log("started webkit audio");

      mediaStream = stream;
      let prebufs: Float32Array[] = [];
      // mediaRecorder = new MediaRecorder(stream);

      let finalizeInterval: NodeJS.Timeout | null = null;
      vad.MicVAD.new({
        model: "v5",
        baseAssetPath: "/lib/",
        onnxWASMBasePath: "/lib/",
        stream,

        onSpeechStart: function () {
          console.log("speech start");
          speechStarted = true;
          if (finalizeInterval != null) {
            clearTimeout(finalizeInterval);
          }
        },
        onVADMisfire: function () {
          console.log("vad misfire");
          if (finalizeInterval != null) {
            clearTimeout(finalizeInterval);
          }
          speechStarted = false;
        },
        onSpeechEnd: function (arr: Float32Array) {
          console.log("speech end", arr.length);
          inferenceStartTime = new Date().getTime();
          if (finalizeInterval != null) {
            clearTimeout(finalizeInterval);
          }
          finalizeInterval = setTimeout(() => {
            if (connection && connection.getReadyState() === WebSocket.OPEN) {
              connection.send(JSON.stringify({ type: "Finalize" }));
            } else {
              console.log("not sending finalize");
            }
          }, 200);
          // const wavBuffer = vad.utils.encodeWAV(arr);
          // const base64 = vad.utils.arrayBufferToBase64(wavBuffer);
          // const url = `data:audio/wav;base64,${base64}`;
          // console.log("speech end", url);

          speechStarted = false;
          // lastSpeechEndTime = new Date().getTime();
          // const wavBuffer = vad.utils.encodeWAV(concatArrays(bufs));
          // const url = `<audio controls autoplay src="data:audio/wav;base64,${vad.utils.arrayBufferToBase64(
          //   wavBuffer
          // )}"></audio>`;
          // console.log("speech end", url);
        },
        onFrameProcessed: function (probs: number[], data: Float32Array) {
          if (
            speechStarted &&
            data.length > 0 &&
            connection != null &&
            connection.getReadyState() == WebSocket.OPEN
          ) {
            // console.log("sending dataavailable", data);
            // const buf = vad.utils.encodeWAV(data);
            // let blob = new Blob([buf], { type: "audio/wav" });
            // bufs.push(data);
            if (prebufs.length > 0) {
              prebufs.push(data);
              data = concatArrays(prebufs);
              prebufs = [];
            }
            connection.send(data);
            // console.log("sent dataavailable", data.length);
          } else {
            // console.log(
            //   "not sending dataavailable",
            //   data.length,
            //   connection != null ? connection.getReadyState() : "null"
            // );
            prebufs.push(data);
            if (prebufs.length > 30) {
              prebufs.slice(-30);
            }
          }
        },
      }).then((vad: MicVAD) => {
        mediaRecorder = vad;
        // console.log(stream.)
        console.log("mediaRecorder", mediaRecorder, stream, stream.getTracks());

        // mediaRecorder.onstart = function () {
        //   console.log("mediaRecorder onstart");
        //   detectSound();
        // };

        // mediaRecorder.onstop = function () {
        //   console.log("mediaRecorder onstop");
        //   isMicOn = false;
        //   chrome.runtime.sendMessage({
        //     type: "mic-turned-off",
        //   });
        // };

        // mediaRecorder.onerror = function (event) {
        //   console.log("mediaRecorder onerror", event);
        //   isMicOn = false;
        //   chrome.runtime.sendMessage({
        //     type: "mic-turned-off",
        //   });
        // };

        // mediaRecorder.onpause = function (event) {
        //   console.log("mediaRecorder onpause", event);
        //   isMicOn = false;
        //   chrome.runtime.sendMessage({
        //     type: "mic-turned-off",
        //   });
        // };

        // mediaRecorder.onresume = function (event) {
        //   console.log("mediaRecorder onresume", event);
        //   isMicOn = true;
        //   chrome.runtime.sendMessage({
        //     type: "mic-turned-on",
        //   });
        // };

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

async function start() {
  micStatus = "loading";
  chrome.runtime.sendMessage({
    type: "mic-loading",
  });
  chosenDevice = await selectDevice();
  startDeepgram();
}

setInterval(() => {
  if (
    !speechStarted &&
    connection &&
    connection.getReadyState() === WebSocket.OPEN
  ) {
    console.log("sending keepalive");
    connection.send(
      JSON.stringify({
        type: "KeepAlive",
      })
    );
  }
}, 3000); // Sending KeepAlive messages every 3 seconds

async function startDeepgram() {
  const client = createClient("162c389cf3aac80cc803d8533c2df3e683d73c59");

  let is_finals: string[] = [];

  connection = client.listen.live({
    model: "nova-2",
    language: `en-US`,
    // Apply smart formatting to the output
    smart_format: true,
    encoding: "linear32",
    channels: 1,
    sample_rate: audioSettings(chosenDevice!, { sampleRate: 16_000 })
      .sampleRate,
    // To get UtteranceEnd, the following must be set:
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
    // Time in milliseconds of silence to wait for before finalizing speech
    endpointing: 300,

    // keywords: ["open", "tab"],
  });

  if (!connection) {
    console.error("Connection is null");
    return;
  }

  connection.on("open", function () {
    console.log("Connection opened.");

    if (!connection) {
      console.error("Connection is null");
      return;
    }

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
        // if (data.speech_final) {
        //   const finals = is_finals.join(" ");
        //   speeches.push(finals);
        //   is_finals = [];
        //   console.log(`speech_final onresults: ${finals}`);

        //   chrome.runtime.sendMessage({
        //     type: "speech-final",
        //     message: finals,
        //   });
        // } else if (data.is_final) {
        //   const finals = is_finals.join(" ");
        //   speeches.push(finals);
        //   is_finals = [];

        //   console.log(`is_final onresults: ${sentence} ${data.is_final}`);
        //   chrome.runtime.sendMessage({
        //     type: "speech-final",
        //     message: finals,
        //   });
        // }
        const finals = is_finals.join(" ");
        speeches.push(finals);
        is_finals = [];
        console.log(`speech_final onresults: ${finals}`);

        console.log(
          "inference time",
          new Date().getTime() - inferenceStartTime
        );
        // inferenceStartTime = 0;

        chrome.runtime.sendMessage({
          type: "speech-final",
          message: finals,
        });
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
