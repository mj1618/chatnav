export type ChatNavMessage =
  | {
      type: "speech-final";
      message: string;
    }
  | {
      type: "interim-result";
      message: string;
    }
  | {
      type: "mic-permission-granted";
    }
  | {
      type: "set-device";
      device: MediaDeviceInfo;
    }
  | {
      type: "request-devices";
    }
  | {
      type: "stop-mic";
    }
  | {
      type: "start-mic";
    }
  | {
      type: "request-mic-status";
    }
  | {
      type: "request-speech-finals";
    }
  | {
      type: "interim-results";
      messages: string[];
    }
  | {
      type: "speech-finals";
      messages: string[];
    }
  | {
      type: "mic-permission-denied";
    }
  | {
      type: "mic-turned-on";
    }
  | {
      type: "mic-turned-off";
    };

declare global {
  interface Navigator {
    webkitGetUserMedia: (
      constraints: any,
      successCallback: (stream: MediaStream) => void,
      errorCallback?: (error: Error) => void
    ) => void;
  }
}
