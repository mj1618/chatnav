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
  const [interimResult, setInterimResult] = useState<any>("");

  useEffect(() => {
    chrome.runtime.onMessage.addListener(function (
      request: any
      // sender: any,
      // _: any
    ) {
      console.log("request", request);
      if (request.type === "devices") {
        if (request.devices != null && request.devices.length > 0) {
          console.log("devices", request.devices);
          console.log("chosenDevice", request.chosenDevice);
          setDevices(request.devices);
          setChosenDevice(request.chosenDevice);
        }
      } else if (request.type === "mic-turned-on") {
        setIsMicOn(true);
      } else if (request.type === "mic-turned-off") {
        setIsMicOn(false);
      } else if (request.type === "speech-final") {
        setSpeeches((speeches: any) => [...speeches, request.message]);
        setInterimResult("");
      } else if (request.type === "speech-finals") {
        setSpeeches(() => request.messages);
        setInterimResult("");
      } else if (request.type === "interim-results") {
        setInterimResult(request.message);
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
    <div className="w-[300px] h-[500px] p-8">
      <h1 className="text-2xl font-bold">Scroll Control</h1>
      <div>
        {/* <ul>
          {devices.map((device: any) => (
            <li key={device.deviceId}>{device.label}</li>
          ))}
        </ul> */}

        {devices.length > 0 && (
          <>
            <h2>Devices</h2>
            <select
              value={chosenDevice?.deviceId}
              onChange={handleDeviceChange}
            >
              {devices.map((device: any) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </>
        )}

        <button
          className="bg-blue-500 text-white p-2 rounded-md w-full"
          onClick={handleMicToggle}
        >
          {isMicOn ? "Turn off mic" : "Turn on mic"}
        </button>

        {speeches.map((speech: any) => (
          <p key={speech}>{speech}</p>
        ))}

        <p>{interimResult}</p>
      </div>
    </div>
  );
}

export default App;
