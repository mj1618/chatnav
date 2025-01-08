import { audioSettings } from "./audio-settings";

let stopFn = () => {};

const startDevice = (device: InputDeviceInfo) => {
  try {
    stopFn();
  } catch (e) {
    console.error(e);
  }
  navigator.mediaDevices
    .getUserMedia({
      audio: {
        deviceId: device.deviceId,
        ...audioSettings(device),
      },
    })
    .then((stream) => {
      const audioRecorder = new MediaRecorder(stream);
      stream
        .getAudioTracks()
        .map((track) => console.log(track.getCapabilities()));
      stopFn = () => {
        audioRecorder.stop();
        stream?.getTracks().forEach((track) => track.stop());
      };
      let audioChunks: Blob[] = [];

      audioRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
        console.log("ondataavailable", e.data.size);
      };

      audioRecorder.onstart = () => {
        console.log("onstart");
      };

      audioRecorder.onstop = () => {
        console.log(
          "audioChunks",
          audioChunks.length,
          audioChunks.map((a) => a.size)
        );
        const blobObj = new Blob(audioChunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blobObj);
        const audio = new Audio(audioUrl);
        audio.play();
        audioChunks = [];
      };

      audioRecorder.start(50);

      // document.getElementById("start-button")?.addEventListener("click", () => {
      //   audioRecorder.start(250);
      // });
      document.getElementById("stop-button")?.addEventListener("click", () => {
        audioRecorder.stop();
        // const context = new AudioContext({ sampleRate: SAMPLING_RATE });
        // context.decodeAudioData(audioChunks);
      });
    });
};

(async () => {
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === "audioinput"
  ) as InputDeviceInfo[];
  for (const d of devices) {
    if (d.kind === "audioinput") {
      document.getElementById("device-select")?.appendChild(
        (() => {
          const button = document.createElement("button");
          button.textContent = d.label;
          console.log(d.getCapabilities());
          button.addEventListener("click", () => {
            startDevice(d);
          });
          return button;
        })()
      );
    }
  }
})();
