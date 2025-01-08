export const audioSettings = (d: InputDeviceInfo) => {
  console.log(d);
  const capabilities = d.getCapabilities();
  const settings = {
    // channelCount: 1,
    // sampleRate: capabilities.sampleRate?.max ?? 48000,
    // @ts-ignore
    // latency: capabilities.latency?.min ?? 0.002,
    // autoGainControl: false,
    // echoCancellation: false,
    // noiseSuppression: false,
    // voiceIsolation: false,
  };
  console.log("settings", settings);
  return settings;
};
