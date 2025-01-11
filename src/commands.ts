import { allNumberWords, findLastIndex, parseWordsToNumbers } from "./utils";

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

type TokenTypes = "command" | "number" | "moveType";

const commandTokens = ["back", "forward", "select"];

const moveTypes = ["letter", "character", "word", "sentence", "paragraph"];

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

const removePlural = (s: string) => {
  if (s.endsWith("s")) {
    return s.substring(0, s.length - 1);
  }
  return s;
};

export const findNextMoveType = (tokens: string[]) => {
  const idx = tokens.findIndex((token) =>
    moveTypes.includes(removePlural(token))
  );
  const found = removePlural(tokens[idx]);
  if (idx === -1) {
    return {
      token: null,
      rest: tokens,
    };
  } else {
    return {
      token: found === "letter" ? "character" : found,
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

function moveCaret(start: number, end: number) {
  const activeElement = document.activeElement as
    | HTMLInputElement
    | HTMLTextAreaElement;
  if (activeElement != null && activeElement.selectionStart != null) {
    activeElement.selectionStart = start;
    activeElement.selectionEnd = end;
  }
}

const getCurrentTextData = () => {
  const activeElement = document.activeElement as
    | HTMLInputElement
    | HTMLTextAreaElement;
  if (activeElement != null && activeElement.selectionStart != null) {
    return {
      text: activeElement.value,
      start: activeElement.selectionStart,
      end: activeElement.selectionEnd,
    };
  }
  return {
    text: null,
    start: null,
    end: null,
  };
};

const isSpace = (s: string) => {
  return [" ", "\n", "\t"].includes(s[0]);
};

export const snapIndex = (text: string, idx: number) => {
  if (idx < 0) {
    return 0;
  } else if (idx >= text.length) {
    return text.length - 1;
  } else {
    return idx;
  }
};
function reverseString(str: string) {
  // Step 1. Use the split() method to return a new array
  var splitString = str.split(""); // var splitString = "hello".split("");
  // ["h", "e", "l", "l", "o"]

  // Step 2. Use the reverse() method to reverse the new created array
  var reverseArray = splitString.reverse(); // var reverseArray = ["h", "e", "l", "l", "o"].reverse();
  // ["o", "l", "l", "e", "h"]

  // Step 3. Use the join() method to join all elements of the array into a string
  var joinArray = reverseArray.join(""); // var joinArray = ["o", "l", "l", "e", "h"].join("");
  // "olleh"

  //Step 4. Return the reversed string
  return joinArray; // "olleh"
}
export const executeCommand = (commandString: string) => {
  const command = tokeniseCommand(commandString);
  console.log("command", command);

  if (command.command === "back" || command.command === "forward") {
    const unit = command.command === "forward" ? 1 : -1;
    const { text: originalText, start, end } = getCurrentTextData();
    if (
      command.number != null &&
      command.moveType != null &&
      originalText != null
    ) {
      switch (command.moveType) {
        case "character":
          const newPosition = start + unit * command.number;
          moveCaret(newPosition, newPosition);
          break;
        case "word":
          let text =
            command.command === "back"
              ? reverseString(originalText)
              : originalText;

          let currIdx =
            command.command === "back" ? text.length - start : start;

          while (true) {
            if (
              currIdx === 0 ||
              (isSpace(text[currIdx - 1]) && !isSpace(text[currIdx]))
            ) {
              break;
            }
            currIdx -= 1;
          }

          const offset =
            command.command === "back" &&
            !isSpace(originalText[start]) &&
            !isSpace(originalText[start - 1])
              ? -1
              : 0;

          for (let i = 0; i < command.number + offset; i++) {
            while (text[currIdx] != null && !isSpace(text[currIdx])) {
              currIdx += 1;
            }
            while (text[currIdx] != null && isSpace(text[currIdx])) {
              currIdx += 1;
            }
          }

          if (command.command === "back") {
            while (text[currIdx] != null && !isSpace(text[currIdx])) {
              currIdx += 1;
            }
            text = reverseString(text);
            currIdx = text.length - currIdx;
          }

          currIdx = snapIndex(text, currIdx);
          moveCaret(currIdx, currIdx);
          break;
        case "sentence":
          break;
        case "paragraph":
          break;
      }
    }
  }
};
