import { useState } from "react";

import { useEffect } from "react";

function App() {
  const [devices, setDevices] = useState<any>([]);
  const [chosenDevice, setChosenDevice] = useState<any>(null);
  const [micStatus, setMicStatus] = useState<"on" | "off" | "loading">("off");
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
        setMicStatus("on");
      } else if (request.type === "mic-turned-off") {
        setMicStatus("off");
      } else if (request.type === "mic-loading") {
        setMicStatus("loading");
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

  const turnMicOn = () => {
    chrome.runtime.sendMessage({
      type: "start-mic",
    });
  };

  const turnMicOff = () => {
    chrome.runtime.sendMessage({
      type: "stop-mic",
    });
  };

  return (
    <div className="w-[300px] h-[500px] p-8">
      <h1 className="text-2xl font-bold">Chat Nav</h1>
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

        {micStatus === "loading" && <p>Mic is loading...</p>}
        {micStatus === "off" && (
          <button
            className="bg-blue-500 text-white p-2 rounded-md w-full"
            onClick={turnMicOn}
          >
            Turn on mic
          </button>
        )}
        {micStatus === "on" && (
          <button
            className="bg-blue-500 text-white p-2 rounded-md w-full"
            onClick={turnMicOff}
          >
            Turn off mic
          </button>
        )}

        {speeches.map((speech: any) => (
          <p key={speech}>{speech}</p>
        ))}

        <p>{interimResult}</p>
      </div>
    </div>
  );
}

export default App;
