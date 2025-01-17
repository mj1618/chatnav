import { parseGrammar, tokeniseCommand } from "./commands";

console.log(
  JSON.stringify(
    parseGrammar(["navigate|go|open back||forward||tab||window||gmail"]),
    null,
    2
  )
);

console.log(
  tokeniseCommand("open a new tab", [
    "navigate|go|open back||forward||tab||window||gmail",
  ])
);
