let triedPermission = false;
let recordTab: chrome.tabs.Tab | null = null;

const MicModes = {
  deepgram: "deepgram",
  browser: "browser",
  whisper: "whisper",
};

const MicMode = MicModes.whisper;

function createRecordTab() {
  chrome.tabs.create(
    {
      url: chrome.runtime.getURL("record.html"),
      pinned: true,
      active: false,
    },
    (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          recordTab = tab;
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    }
  );
}

function sendTabMessage(tabId: number, message: string) {
  console.log("sendTabMessage", tabId, message);
  try {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["content-script.js"],
      })
      .then(() => {
        chrome.tabs.sendMessage(tabId, {
          type: "show-message",
          message: message,
        });
      });
  } catch (e) {
    console.error("Error sending message to tab", e);
  }
}

const activeTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) {
    console.log("no active tab");
    return null;
  }
  return tabs[0];
};

const getTabById = async (tabId: number | undefined) => {
  if (tabId == null) {
    console.log("no tab id");
    return null;
  }
  const tab = await chrome.tabs.get(tabId);
  if (tab == null) {
    console.log("no tab found with id", tabId);
    return null;
  }
  return tab;
};

const generalCommandGroup: CommandGroup = {
  type: "group",
  name: "general",
  commands: [
    {
      type: "command",
      name: "stop",
      alternatives: ["stop"],
      subCommands: [
        {
          type: "leaf",
          name: "mic",
          alternatives: ["microphone", "recording"],
          environment: "service-worker",
          action: () => {
            chrome.runtime.sendMessage({
              type: "stop-mic",
            });
          },
        },
      ],
    },
    {
      type: "command",
      name: "start",
      alternatives: ["start"],
      subCommands: [
        {
          type: "leaf",
          name: "mic",
          alternatives: ["microphone", "recording"],
          environment: "service-worker",
          action: () => {
            chrome.runtime.sendMessage({
              type: "start-mic",
            });
          },
        },
      ],
    },
    {
      type: "command",
      name: "navigate",
      alternatives: ["navigate", "go", "open"],
      subCommands: [
        {
          type: "leaf",
          name: "gmail",
          alternatives: ["mail", "gmail"],
          environment: "service-worker",
          action: async () => {
            const tab = await activeTab();
            if (tab != null) {
              chrome.tabs.update(tab.id!, {
                url: "https://mail.google.com",
              });
            } else {
              chrome.tabs.create({
                url: "https://mail.google.com",
              });
            }
          },
        },
        {
          type: "leaf",
          name: "tab",
          alternatives: ["new tab"],
          environment: "service-worker",
          action: () => {
            chrome.tabs.create({
              url: "",
            });
          },
        },
      ],
    },
    {
      type: "command",
      name: "go",
      alternatives: ["go", "back"],
      subCommands: [
        {
          type: "leaf",
          name: "back",
          alternatives: ["back"],
          environment: "service-worker",
          action: async () => {
            const tab = await activeTab();
            if (tab != null) {
              chrome.tabs.goBack(tab.id!);
            }
          },
        },
      ],
    },
  ],
};

const gmailCommandGroup: CommandGroup = {
  type: "group",
  name: "gmail",
  onlyOn: "https://mail.google.com",
  commands: [
    {
      type: "command",
      name: "new",
      alternatives: ["new"],
      subCommands: [
        {
          type: "leaf",
          name: "email",
          alternatives: ["email"],
          environment: "content-script",
          action: async () => {
            var tags = document.getElementsByTagName("div");
            var searchText = "Compose";
            var found = [];

            for (var i = 0; i < tags.length; i++) {
              var curr = tags[i];
              if (
                curr.textContent == searchText &&
                curr.children != null &&
                curr.children.length === 0 &&
                curr.attributes.getNamedItem("role")?.nodeValue === "button"
              ) {
                found.push(curr);
              }
            }
            if (found.length > 0) {
              found[0].click();
            }
          },
        },
      ],
    },
  ],
};

type LeafCommand = {
  type: "leaf";
  name: string;
  alternatives: string[];
  environment: "service-worker" | "content-script";
  action: () => void;
};

type ParentCommand = {
  type: "command";
  name: string;
  alternatives: string[];
  subCommands: Command[];
};
type Command = LeafCommand | ParentCommand;

type CommandGroup = {
  type: "group";
  name: string;
  onlyOn?: string;
  commands: Command[];
};

const allCommandGroups: CommandGroup[] = [
  generalCommandGroup,
  gmailCommandGroup,
];

function matchesCommand(
  command: string,
  value: Command
): { idx: number; leaf: LeafCommand | null } {
  const words = command.toLowerCase().trim().split(" ");
  const q = [
    {
      idx: -1,
      currCmd: value,
    },
  ];

  while (q.length > 0) {
    const { idx: firstIdx, currCmd } = q.shift()!;
    const currIdx = words.findIndex((word) =>
      currCmd.alternatives.includes(word)
    );
    if (currIdx !== -1) {
      if ("subCommands" in currCmd) {
        for (const [key, subCmd] of Object.entries(currCmd.subCommands)) {
          q.push({ idx: firstIdx < 0 ? currIdx : firstIdx, currCmd: subCmd });
        }
      } else {
        return { idx: firstIdx < 0 ? currIdx : firstIdx, leaf: currCmd };
      }
    }
  }

  return { idx: -1, leaf: null };
}

async function handleCommand(transcript: string) {
  const tab = await activeTab();
  let possibleCommandGroups = [];
  if (tab != null) {
    for (const [key, value] of Object.entries(allCommandGroups)) {
      if ("onlyOn" in value && tab.url?.includes(value.onlyOn!)) {
        possibleCommandGroups.push(value);
      }
    }
  }
  for (const [key, value] of Object.entries(allCommandGroups)) {
    if (!("onlyOn" in value)) {
      possibleCommandGroups.push(value);
    }
  }

  let found = null;
  for (const group of possibleCommandGroups) {
    for (const command of group.commands) {
      const { idx, leaf } = matchesCommand(transcript, command);
      if (idx !== -1) {
        found = leaf;
      }
    }
  }

  if (found != null) {
    found.action();
  }
}

chrome.runtime.onMessage.addListener(async function (
  message,
  sender,
  sendResponse
) {
  console.log("background receivedmessage", JSON.stringify(message, null, 2));
  if (message.type === "mic-permission-denied") {
    console.log("mic-permission-denied", message);

    if (triedPermission) {
      return;
    }
    triedPermission = true;
    if (MicMode === MicModes.deepgram || MicMode === MicModes.whisper) {
      chrome.tabs.create({
        url: "request-mic.html",
      });
    } else if (MicMode === MicModes.browser) {
      chrome.tabs.update(recordTab!.id!, {
        active: true,
      });
    }
  } else if (message.type === "interim-results") {
    console.log("interim-results", message);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.log("no active tab to send message to");
        return;
      }
      if (message.message.trim().length === 0) {
        return;
      }
      sendTabMessage(tabs[0].id!, message.message);
    });
  } else if (message.type === "speech-final") {
    if (message.message.trim().length === 0) {
      return;
    }
    console.log("speech-final", message);
    handleCommand(message.message);
    const tab = await activeTab();
    if (tab != null) {
      sendTabMessage(tab.id!, message.message);
    }
  } else if (message.type === "start-mic") {
    if (MicMode === MicModes.deepgram || MicMode === MicModes.whisper) {
      // do nothing, offscreen is already running
    } else if (MicMode === MicModes.browser) {
      if ((await getTabById(recordTab?.id)) != null) {
        console.log("tab already exists");
      } else {
        createRecordTab();
      }
    }
  } else if (message.type === "mic-turned-on") {
    chrome.action.setIcon({
      path: "assets/mic-red.png",
    });
    // chrome.action.setBadgeText({
    //   text: "Rec",
    // });
  } else if (message.type === "mic-turned-off") {
    chrome.action.setIcon({
      path: {
        16: "assets/mic-black.png",
        48: "assets/mic-black.png",
        128: "assets/mic-black.png",
      },
    });
    // chrome.action.setBadgeText({
    //   text: "",
    // });
  }
});

chrome.offscreen.createDocument({
  url: chrome.runtime.getURL("offscreen-whisper.html"),
  // @ts-ignore
  reasons: ["USER_MEDIA"],
  justification: "capturing mic audio",
});

chrome.action.setBadgeBackgroundColor({
  color: "red",
});

// let i = 0;
// setInterval(() => {
//   i = (i + 1) % 3;
//   chrome.action.setBadgeText({
//     text: ".".repeat(i + 1),
//   });
// }, 1000);

chrome.runtime.onStartup.addListener(() => {
  console.log(`prevent from going inactive`);
});
