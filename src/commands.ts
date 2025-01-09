import { activeTab } from "./utils";

const generalCommandGroup: CommandGroup = {
  type: "group",
  name: "general",
  commands: [
    {
      type: "command",
      name: "stop",
      alternatives: ["stop", "off"],
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
              url: "chrome://newtab",
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

const findTag = ({
  tagName,
  textContent,
  attributes,
  hasChildren,
}: {
  tagName: string;
  textContent?: string;
  attributes?: Record<string, string>;
  hasChildren?: boolean;
}) => {
  const tags = document.getElementsByTagName(tagName);
  console.log("tags", tags.length);
  const found = [];
  for (var i = 0; i < tags.length; i++) {
    var curr = tags[i];
    let valid = true;
    if (textContent != null && curr.textContent !== textContent) {
      valid = false;
    }
    if (attributes != null) {
      for (const [key, value] of Object.entries(attributes)) {
        if (curr.attributes.getNamedItem(key)?.nodeValue !== value) {
          valid = false;
        }
      }
    }
    if (hasChildren != null) {
      if (hasChildren === true) {
        if (curr.children == null || curr.children.length === 0) {
          valid = false;
        }
      } else {
        if (curr.children != null && curr.children.length > 0) {
          valid = false;
        }
      }
    }
    if (valid) {
      found.push(curr);
    }
  }
  return found;
};

const gmailCommandGroup: CommandGroup = {
  type: "group",
  name: "gmail",
  onlyOn: "https://mail.google.com",
  commands: [
    {
      type: "command",
      name: "new",
      alternatives: ["start", "new", "compose", "write"],
      subCommands: [
        {
          type: "leaf",
          name: "email",
          alternatives: ["email"],
          environment: "content-script",
          action: async () => {
            const composeButton = findTag({
              tagName: "div",
              textContent: "Compose",
              hasChildren: false,
              attributes: {
                role: "button",
              },
            });
            if (composeButton.length > 0) {
              (composeButton[0] as HTMLElement).click();
            }
          },
        },
      ],
    },
    {
      type: "command",
      name: "go",
      alternatives: ["write"],
      subCommands: [
        {
          type: "leaf",
          name: "recipient",
          alternatives: [],
          environment: "content-script",
          action: async () => {
            const el = findTag({
              tagName: "div",
              textContent: "Recipients",
              attributes: {
                tabindex: "1",
              },
            });
            console.log("el", el);
            if (el.length > 0) {
              window.focus();
              (el[0] as HTMLElement).focus();
              (el[0] as HTMLElement).click();
            }

            setTimeout(() => {
              const el2 = findTag({
                tagName: "input",
                attributes: {
                  "aria-label": "To recipients",
                },
              });
              console.log("el2", el2);
              if (el2.length > 0) {
                window.focus();
                (el2[0] as HTMLElement).focus();
                (el2[0] as HTMLElement).click();
                el2[0].dispatchEvent(new Event("input", { bubbles: true }));
                el2[0].dispatchEvent(
                  new PointerEvent("pointerdown", { bubbles: true })
                );
              }
            }, 100);
          },
        },
        {
          type: "leaf",
          name: "subject",
          alternatives: [],
          environment: "content-script",
          action: async () => {
            const el = findTag({
              tagName: "input",
              attributes: {
                "aria-label": "Subject",
              },
            });
            if (el.length > 0) {
              window.focus();
              (el[0] as HTMLElement).focus();
              (el[0] as HTMLElement).click();
            }
          },
        },
        {
          type: "leaf",
          name: "body",
          alternatives: ["message"],
          environment: "content-script",
          action: async () => {
            const el = findTag({
              tagName: "div",
              attributes: {
                "aria-label": "Message Body",
              },
            });
            if (el.length > 0) {
              window.focus();
              (el[0] as HTMLElement).focus();
              (el[0] as HTMLElement).click();
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
  // console.log("checking", command, value);
  const q = [
    {
      idx: -1,
      currCmd: value,
    },
  ];

  while (q.length > 0) {
    const { idx: firstIdx, currCmd } = q.shift()!;
    const currIdx = words.findIndex((word) =>
      currCmd.alternatives
        .concat([currCmd.name])
        .some((alt) => word.includes(alt))
    );
    // console.log("currIdx", currIdx);
    if (currIdx !== -1) {
      if ("subCommands" in currCmd) {
        for (const [key, subCmd] of Object.entries(currCmd.subCommands)) {
          // console.log("pushing", subCmd);
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
