import { useState } from "react";

import { useEffect } from "react";

declare global {
  var chrome: any;
}

function App() {
  const [devices, setDevices] = useState<any>([]);
  const [chosenDevice, setChosenDevice] = useState<any>(null);
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [speeches, setSpeeches] = useState<any>([]);

  useEffect(() => {
    chrome.runtime.onMessage.addListener(function (
      request: any
      // sender: any,
      // _: any
    ) {
      console.log("request", request);
      if (request.type === "devices") {
        console.log("devices", request.devices);
        console.log("chosenDevice", request.chosenDevice);
        setDevices(request.devices);
        setChosenDevice(request.chosenDevice);
      } else if (request.type === "mic-turned-on") {
        setIsMicOn(true);
      } else if (request.type === "mic-turned-off") {
        setIsMicOn(false);
      } else if (request.type === "speech-final") {
        setSpeeches((speeches: any) => [...speeches, request.message]);
      } else if (request.type === "speech-finals") {
        setSpeeches(() => request.messages);
      }
    });

    chrome.runtime.sendMessage({
      type: "request-devices",
    });

    chrome.runtime.sendMessage({
      type: "request-mic-status",
    });

    chrome.runtime.sendMessage({
      type: "request-speech-finals",
    });
  }, []);

  const handleDeviceChange = (e: any) => {
    const deviceId = e.target.value;
    const device = devices.find((device: any) => device.deviceId === deviceId);
    console.log("device", device);
    setChosenDevice(device);
    chrome.runtime.sendMessage({
      type: "set-device",
      device,
    });
  };

  const handleMicToggle = () => {
    if (isMicOn) {
      chrome.runtime.sendMessage({
        type: "stop-mic",
      });
    } else {
      chrome.runtime.sendMessage({
        type: "start-mic",
      });
    }
  };

  return (
    <div className="w-[300px] h-[500px] ">
      <h1 className="text-3xl font-bold underline p-8">Hello world!</h1>
      <div>
        <h2>Devices</h2>
        {/* <ul>
          {devices.map((device: any) => (
            <li key={device.deviceId}>{device.label}</li>
          ))}
        </ul> */}

        <select value={chosenDevice?.deviceId} onChange={handleDeviceChange}>
          {devices.map((device: any) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>

        <button onClick={handleMicToggle}>
          {isMicOn ? "Turn off mic" : "Turn on mic"}
        </button>

        {speeches.map((speech: any) => (
          <p key={speech}>{speech}</p>
        ))}
      </div>
    </div>
  );
}

export default App;
