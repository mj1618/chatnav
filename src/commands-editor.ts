import {
  getCurrentTextData,
  isSpace,
  moveCaret,
  reverseString,
  snapIndex,
} from "./utils";

export type MoveType = "character" | "word" | "sentence" | "paragraph";

type MoveCommand = {
  command: "back" | "forward" | "select";
  number: number;
  moveType: "word" | "character" | "sentence" | "paragraph";
};

export const moveToPosition = (
  command: MoveCommand,
  { start }: { start: number },
  originalText: string,
  separationFn: (str: string) => boolean
) => {
  let text =
    command.command === "back" ? reverseString(originalText) : originalText;

  let currIdx = command.command === "back" ? text.length - start : start;

  while (true) {
    if (
      currIdx === 0 ||
      (separationFn(text[currIdx - 1]) && !separationFn(text[currIdx]))
    ) {
      break;
    }
    currIdx -= 1;
  }

  const offset =
    command.command === "back" &&
    !separationFn(originalText[start]) &&
    !separationFn(originalText[start - 1])
      ? -1
      : 0;

  for (let i = 0; i < command.number + offset; i++) {
    while (text[currIdx] != null && !separationFn(text[currIdx])) {
      currIdx += 1;
    }
    while (text[currIdx] != null && separationFn(text[currIdx])) {
      currIdx += 1;
    }
  }

  if (command.command === "back") {
    while (text[currIdx] != null && !separationFn(text[currIdx])) {
      currIdx += 1;
    }
    text = reverseString(text);
    currIdx = text.length - currIdx;
  }

  return snapIndex(text, currIdx);
};

export const goBackOrForward = (
  command: "back" | "forward",
  number: number,
  moveType: MoveType
) => {
  const { text: originalText, start, end } = getCurrentTextData();
  if (originalText == null) {
    return false;
  }

  const unit = command === "forward" ? 1 : -1;

  switch (moveType) {
    case "character":
      const newPosition = start + unit * number;
      moveCaret(newPosition, newPosition);
      break;
    case "word":
      const idx1 = moveToPosition(
        { command, number, moveType },
        getCurrentTextData() as { start: number },
        originalText,
        isSpace
      );
      moveCaret(idx1, idx1);
      break;
    case "sentence":
      const idx2 = moveToPosition(
        { command, number, moveType },
        getCurrentTextData() as { start: number },
        originalText,
        (str: string) => str[0] === "."
      );
      moveCaret(idx2, idx2);
      break;
    case "paragraph":
      const idx3 = moveToPosition(
        { command, number, moveType },
        getCurrentTextData() as { start: number },
        originalText,
        (str: string) => str[0] === "\n"
      );
      moveCaret(idx3, idx3);
      break;
  }
};
