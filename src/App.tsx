import { ChevronUpDownIcon } from "@heroicons/react/16/solid";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

import { useEffect } from "react";

function App() {
  const [devices, setDevices] = useState<any>([]);
  const [chosenDevice, setChosenDevice] = useState<any>(null);
  const [micStatus, setMicStatus] = useState<"on" | "off" | "loading">("off");
  const [speeches, setSpeeches] = useState<any>([]);
  const [interimResult, setInterimResult] = useState<any>("");
  const [progress, setProgress] = useState<any>(0);

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
      } else if (request.type === "progress") {
        console.log("progress", request.message);
        setProgress(request.message);
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
            <div className="mt-2 grid grid-cols-1">
              <select
                value={chosenDevice?.deviceId}
                onChange={handleDeviceChange}
                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
              >
                {devices.map((device: any) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>

              <ChevronUpDownIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
              />
            </div>
          </>
        )}

        {micStatus === "loading" && (
          <p>Mic is loading... {progress.toFixed(0)}%</p>
        )}
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
