import { createNewTab, goToUrl } from "./commands-backend";
import { clickOn, hideTags, showTags, writeText } from "./commands-dom";
import { goBackOrForward, MoveType } from "./commands-editor";
import {
  allNumberWords,
  findLastIndex,
  findNextLiteral,
  parseWordsToNumbers,
} from "./utils";

export const generalGrammar = [
  "start||stop mic|microphone|recording",
  "navigate|go|open back||forward||tab||window||gmail",
  "navigate|go|open url :site",
  "compose|write email",
  "start writing|dictation|typing",
  "show tag|tags|tax for :term",
  "show tag|tags|tax",
  "hide|high tag|tags|tax",
  "click on| number| @number",
  "click on| the| :term",
];

export const editorGrammar = [
  // edit mode
  "back @number @moveType",
  "forward @number @moveType",
  "select @number @moveType",
  "copy",
  "cut",
  "paste",
  "delete",
  "delete @number @moveType",
  "undo",
  "redo",
  "find|search",
  "next",
  "replace",
  "select all",
  "select none",
  "stop writing|dictation",
];

type ExpressionElement =
  | {
      type: "variable";
      name: string;
    }
  | {
      type: "number";
    }
  | {
      type: "moveType";
    }
  | {
      type: "literals";
      literals: string[];
    };

type Expression = ExpressionElement[];

export const parseGrammar = (grammar: string[]): Expression[] => {
  let expressions: Expression[] = [];
  for (const line of grammar) {
    const tokens = line.split(" ");
    let exps: ExpressionElement[][] = [[]];
    const push = (e: ExpressionElement) => {
      exps = exps.map((exp) => exp.concat([e]));
    };
    for (const token of tokens) {
      if (token.startsWith(":")) {
        if (token.slice(1) == null) {
          throw new Error("could not parse variable " + token);
        }
        push({
          type: "variable",
          name: token.slice(1) as string,
        } as ExpressionElement);
      } else if (token.startsWith("@")) {
        if (!["number", "moveType"].includes(token.slice(1))) {
          throw new Error("could not parse token " + token);
        }
        push({
          type: token.slice(1) as "number" | "moveType",
        } as ExpressionElement);
      } else {
        const uniqueTokens = token.split("||");
        // console.log("uniqueTokens", uniqueTokens);
        const newExps: ExpressionElement[][] = [];
        for (const unique of uniqueTokens) {
          for (const exp of exps) {
            // console.log("exp", exp);
            const newExp = [...exp];
            // console.log("newExp", newExp, newExps);
            newExp.push({
              type: "literals",
              literals: unique.split("|") as string[],
            } as ExpressionElement);
            newExps.push(newExp);
            // console.log(newExps);
          }
        }
        exps = newExps;
        // console.log(exps);
      }
      // console.log(JSON.stringify(exps, null, 2));
    }
    expressions = expressions.concat(exps);
  }
  return expressions;
};

const moveTypes = ["letter", "character", "word", "sentence", "paragraph"];

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
      token:
        found === "letter"
          ? "character"
          : (found as "character" | "word" | "sentence" | "paragraph"),
      rest: tokens.slice(idx + 1),
    };
  }
};
function isNumeric(str: string) {
  return /^\d+$/.test(str);
}

export const findNextNumber = (tokens: string[]) => {
  const firstIdx = tokens
    .map((t) => (t === "to" ? "two" : t))
    .map((t) => (t === "too" ? "two" : t))
    .findIndex((token) => allNumberWords.includes(token));

  for (const token of tokens) {
    if (isNumeric(token)) {
      console.log("is nan", token, Number.isNaN(token));
      return {
        token: Number(token),
        rest: tokens.slice(tokens.indexOf(token)),
      };
    }
  }

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

type ParsedToken =
  | {
      type: "variable";
      name: string;
      value: string;
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "moveType";
      value: "character" | "word" | "sentence" | "paragraph";
    }
  | {
      type: "literal";
      value: string;
    };

export const tokeniseCommand = (
  str: string,
  grammarStrings: string[]
): { result: ParsedToken[] | null; rest: string[] } => {
  const tokens = str
    .replace(/\./g, "")
    .replace(/\,/g, "")
    .toLowerCase()
    .trim()
    .split(" ");
  const grammar = parseGrammar(grammarStrings);
  for (const expression of grammar) {
    let result: ParsedToken[] = [];
    let success = true;
    let rest = [...tokens];
    // console.log(grammar);
    for (const part of expression) {
      switch (part.type) {
        case "variable":
          result.push({
            type: "variable",
            name: part.name,
            value: rest.join(" "),
          } as ParsedToken);
          rest = [];
          break;

        case "number":
          const numberResult = findNextNumber(rest);
          if (numberResult.token != null) {
            result.push({
              type: "number",
              value: numberResult.token,
            } as ParsedToken);
            rest = numberResult.rest;
          } else {
            success = false;
          }
          break;

        case "moveType":
          const moveTypeResult = findNextMoveType(rest);
          if (moveTypeResult.token != null) {
            result.push({
              type: "moveType",
              value: moveTypeResult.token,
            } as ParsedToken);
            rest = moveTypeResult.rest;
          } else {
            success = false;
          }
          break;
        case "literals":
          const literalResult = findNextLiteral(rest, part.literals);
          if (literalResult.token != null) {
            result.push({
              type: "literal",
              value: literalResult.token,
            } as ParsedToken);
            rest = literalResult.rest;
          } else if (part.literals.some((l) => l.length === 0)) {
            result.push({
              type: "literal",
              value: part.literals[0],
            } as ParsedToken);
            rest = literalResult.rest;
          } else {
            success = false;
          }
      }
      if (success === false) {
        break;
      }
    }
    if (success) {
      return {
        result,
        rest,
      };
    }
  }
  return {
    result: null,
    rest: tokens,
  };
};

const matchesToken = (tok1: ParsedToken, tok2: ParsedToken) => {
  if (
    tok1.type === "variable" &&
    tok1.type === tok2.type &&
    tok1.value === tok2.value &&
    tok1.name === tok2.name
  ) {
    return true;
  } else if (tok1.type === tok2.type && tok1.value === tok2.value) {
    return true;
  }
  return false;
};

const matchesLiterals = (tok: ParsedToken, literals: string[]) => {
  return tok.type === "literal" && literals.includes(tok.value);
};

const executeExpression = (expression: ParsedToken[]) => {
  if (
    expression.length === 2 &&
    matchesLiterals(expression[0], ["start", "stop"]) &&
    matchesLiterals(expression[1], ["mic"])
  ) {
    chrome.runtime.sendMessage({
      type: `${expression[0].value}-mic`,
    });
    return true;
  } else if (
    expression.length === 3 &&
    matchesLiterals(expression[0], ["back", "forward"]) //editing mode
  ) {
    goBackOrForward(
      expression[0].value as "back" | "forward",
      expression[1].value as number,
      expression[2].value as MoveType
    );
    return true;
  } else if (
    expression.length >= 2 &&
    matchesToken(expression[0], { type: "literal", value: "hide" }) &&
    matchesToken(expression[1], { type: "literal", value: "tag" })
  ) {
    hideTags();
    return true;
  } else if (
    expression.length === 4 &&
    matchesToken(expression[0], { type: "literal", value: "show" }) &&
    matchesToken(expression[1], { type: "literal", value: "tag" }) &&
    matchesToken(expression[2], { type: "literal", value: "for" }) &&
    expression[3].type === "variable"
  ) {
    showTags(expression[3].value);
    return true;
  } else if (
    expression.length === 2 &&
    matchesToken(expression[0], { type: "literal", value: "show" }) &&
    matchesToken(expression[1], { type: "literal", value: "tag" })
  ) {
    showTags();
    return true;
  } else if (
    expression.length === 4 &&
    matchesToken(expression[0], { type: "literal", value: "click" }) &&
    matchesToken(expression[1], { type: "literal", value: "on" })
  ) {
    if (expression[3].type === "number") {
      console.log("checking current", window.currentSearchTerm);
      if (window.currentSearchTerm != null) {
        clickOn(window.currentSearchTerm, expression[3].value);
      } else {
        clickOn("", expression[3].value);
      }
    } else {
      clickOn(expression[3].value as string);
    }
    return true;
  } else if (
    expression.length === 2 &&
    matchesLiterals(expression[0], ["start", "stop"]) &&
    matchesToken(expression[1], { type: "literal", value: "writing" })
  ) {
    console.log(`sending message ${expression[0].value}-writing`);
    chrome.runtime.sendMessage({
      type: `${expression[0].value}-writing`,
    });
    return true;
  } else if (
    expression.length === 2 &&
    matchesLiterals(expression[0], ["navigate"])
  ) {
    switch (expression[1].value) {
      case "tab":
        createNewTab();
        break;
      case "gmail":
        goToUrl("https://mail.google.com");
        break;
      case "window":
        break;
      default:
        console.error("unknown exp", expression);
        break;
    }
    return true;
  }
};

const removeUpTo = (str: string, arr: string[]) => {
  for (const a of arr) {
    if (str.indexOf(a) != -1) {
      return str.slice(str.lastIndexOf(a) + a.length);
    }
  }
  return str;
};

export const executeCommand = (
  commandString: string,
  inputMode: "general" | "writing" | "editing"
) => {
  console.log("executing command", commandString, inputMode);

  if (
    inputMode === "writing" &&
    ["stop writing", "stop righting"].some((x) => commandString.includes(x))
  ) {
    chrome.runtime.sendMessage({
      type: "stop-writing",
    });

    inputMode = "general";

    commandString = removeUpTo(commandString, [
      "stop writing",
      "stop righting",
    ]);
  }

  if (
    inputMode === "writing" &&
    !["stop writing", "stop righting"].some((x) => commandString.includes(x))
  ) {
    writeText(commandString);
  } else {
    const { result: tokenised, rest } = tokeniseCommand(
      commandString,
      generalGrammar
    );

    if (tokenised != null) {
      console.log("found tokenised", tokenised);
      return executeExpression(tokenised);
    }

    return false;
  }
};
