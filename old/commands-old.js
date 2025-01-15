import wordsToNumbers from "words-to-numbers";
import { activeTab } from "../src/utils";

const grammar = [
  "stop|start :microphone",
  "navigate|go|open back|forward|tab|window|gmail",
  "navigate|go|open url :site",
  "compose|write email",
  "stop|start writing|dictation",

  // edit mode
  "back|forward :number :moveType",
  "select :number :moveType",
  "copy|cut|paste",
  "delete",
  "delete :number :moveType",
  "undo|redo",
  "find|search",
  "replace",
  "select all",
  "select none",
  "stop|start writing|dictation",
];

export const parseWordsToNumbers = (str: string) => {
  return wordsToNumbers(str);
};

export function findLastIndex<T>(
  array: Array<T>,
  predicate: (value: T, index: number, obj: T[]) => boolean
): number {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
}

type TokenTypes = "command" | "number" | "moveType";

const commandTokens = ["back", "forward", "select"];

const moveTypes = ["word", "sentence", "paragraph"];

// words from one to twenty
const oneToTwenty = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

// words from twenty to ninety
const twentyToNinety = [
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const hundredToThousand = ["hundred", "thousand"];

const allNumberWords = oneToTwenty
  .concat(twentyToNinety)
  .concat(hundredToThousand);

export const isTokenType = (token: string, tokenType: TokenTypes) => {
  if (tokenType === "command") {
    return commandTokens.includes(token);
  }
};

export const findNextCommand = (tokens: string[]) => {
  const idx = tokens.findIndex((token) => commandTokens.includes(token));

  if (idx === -1) {
    return {
      token: null,
      rest: tokens,
    };
  } else {
    return {
      token: tokens[idx],
      rest: tokens.slice(idx + 1),
    };
  }
};

export const findNextMoveType = (tokens: string[]) => {
  const idx = tokens.findIndex((token) => moveTypes.includes(token));
  if (idx === -1) {
    return {
      token: null,
      rest: tokens,
    };
  } else {
    return {
      token: tokens[idx],
      rest: tokens.slice(idx + 1),
    };
  }
};

export const findNextNumber = (tokens: string[]) => {
  const firstIdx = tokens
    .map((t) => (t === "to" ? "two" : t))
    .findIndex((token) => allNumberWords.includes(token));
  const lastIdx = findLastIndex(tokens, (token) =>
    allNumberWords.includes(token)
  );
  if (firstIdx === -1 || lastIdx === -1) {
    return {
      token: null,
      rest: tokens,
    };
  } else {
    return {
      token: Number(
        parseWordsToNumbers(tokens.slice(firstIdx, lastIdx + 1).join(" "))
      ),
      rest: tokens.slice(lastIdx + 1),
    };
  }
};

export const tokeniseCommand = (commandString: string) => {
  const tokens = commandString
    .replace(/\./g, " ")
    .replace(/\,/g, " ")
    .toLowerCase()
    .trim()
    .split(" ");
  const command = findNextCommand(tokens);
  if (command.token === "back" || command.token === "forward") {
    const number = findNextNumber(command.rest);
    const moveType = findNextMoveType(number.rest);
    return {
      command: command.token,
      number: number.token,
      moveType: moveType.token,
    };
  } else {
    return {
      command: command.token,
    };
  }
};

function moveCaret(win: Window, charCount: number) {
  var sel, range;
  console.log("moveCaret", win, charCount);

  if (win.getSelection) {
    // IE9+ and other browsers
    sel = win.getSelection();
    console.log("sel", sel);
    if (sel && sel.rangeCount > 0) {
      var textNode = document.activeElement;
      console.log("textNode", textNode);

      if (textNode != null) {
        var newOffset = sel.focusOffset + charCount;
        console.log("newOffset", newOffset);
        // @ts-ignore
        sel.collapse(textNode, Math.min(textNode.length, newOffset));
        console.log("sel", sel);
      }
    }
  }
}

export const executeCommand = (commandString: string) => {
  const command = tokeniseCommand(commandString);
  console.log("command", command);

  if (command.command === "back" || command.command === "forward") {
    if (command.number != null) {
      moveCaret(window, command.number);
    }
  }
};

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
              url: "https://www.google.com",
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
