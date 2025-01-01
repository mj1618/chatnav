

let mediaRecorder;
let connection;
let {createClient} = deepgram;

navigator.mediaDevices.enumerateDevices().then(function (devices) {
  console.log("devices", devices.map((d) => d.label));
  console.log("devices", devices);
});

function startMic() {
  navigator.webkitGetUserMedia({
    audio: true,
  }, function(stream) {
    console.log("started");
    mediaRecorder = new MediaRecorder(stream);
    console.log("mediaRecorder", mediaRecorder, stream);

    mediaRecorder.ondataavailable = function(event) {
      console.log("ondataavailable", event, connection);
      if (
        event.data.size > 0 &&
        connection != null &&
        connection.getReadyState() == WebSocket.OPEN
      ) {
        console.log("sending dataavailable", event.data.size);
        connection.send(event.data);
      } else {
        console.log(
          "not sending dataavailable",
          event.data.size,
          connection != null ? connection.getReadyState() : "null",
        );
      }
    };

    mediaRecorder.start(250);
  }, function() {
    // Aw. No permission (or no microphone available).
    console.log("no permission");

    chrome.runtime.sendMessage({
      type: "mic-permission-denied",
    });

  });
}

startMic();

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "mic-permission-granted") {
    startMic();
  }
});


const client = createClient("162c389cf3aac80cc803d8533c2df3e683d73c59");

let is_finals = [];

connection = client.listen.live({
  model: "nova-2",
  language: `en-US`,
  // Apply smart formatting to the output
  smart_format: true,
  // To get UtteranceEnd, the following must be set:
  interim_results: true,
  utterance_end_ms: 1000,
  vad_events: true,
  // Time in milliseconds of silence to wait for before finalizing speech
  endpointing: 300,
});

connection.on("open", function () {
  console.log("Connection opened.");

  connection.on("close", () => {
    console.log("Connection closed.");
    const utterance = is_finals.join(" ");
    console.log(`Speech Final: ${utterance}`);
    chrome.runtime.sendMessage({
      type: "speech-final",
      message: utterance,
    });
    is_finals = [];
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => {
      track.stop();
    });
  });

  connection.on("Metadata", (data) => {
    console.log(`Deepgram Metadata: ${data}`);
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
      if (data.speech_final) {
        const utterance = is_finals.join(" ");
        console.log(`Speech Final: ${utterance}`);
        chrome.runtime.sendMessage({
          type: "speech-final",
          message: utterance,
        });
        is_finals = [];
      } else {
        // These are useful if you need real time captioning and update what the Interim Results produced
        console.log(`Is Final: ${sentence}`);
        chrome.runtime.sendMessage({
          type: "interim-results",
          message: sentence,
        });
      }
    } else {
      // These are useful if you need real time captioning of what is being spoken
      console.log(`Interim Results: ${sentence}`);
    }
  });

  connection.on("UtteranceEnd", (data) => {
    const utterance = is_finals.join(" ");
    console.log(`Deepgram UtteranceEnd: ${utterance}`);
    is_finals = [];
  });

  connection.on("SpeechStarted", (data) => {
    console.log("Deepgram SpeechStarted");
  });

  connection.on("error", (err) => {
    console.error(err);
  });
});
