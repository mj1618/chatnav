import { activeTab } from "./utils";

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
      alternatives: ["new", "compose", "write"],
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
      currCmd.alternatives.some((alt) => alt.includes(word))
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

export async function findCommand(
  transcript: string,
  currentUrl?: string | undefined
): Promise<LeafCommand | null> {
  let possibleCommandGroups = [];
  if (currentUrl != null) {
    for (const [key, value] of Object.entries(allCommandGroups)) {
      if ("onlyOn" in value && currentUrl.includes(value.onlyOn!)) {
        possibleCommandGroups.push(value);
      }
    }
  }
  for (const [key, value] of Object.entries(allCommandGroups)) {
    if (!("onlyOn" in value)) {
      possibleCommandGroups.push(value);
    }
  }
  console.log("possibleCommandGroups", possibleCommandGroups);
  let found = null;
  for (const group of possibleCommandGroups) {
    for (const command of group.commands) {
      const { idx, leaf } = matchesCommand(transcript, command);
      if (idx !== -1) {
        found = leaf;
        console.log("found", found, idx);
        break;
      }
    }
  }
  return found;
}
