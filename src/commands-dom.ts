import { smartFormat } from "./openai";

declare global {
  interface Window {
    interval?: NodeJS.Timeout;
    container?: HTMLDivElement;
    tagsContainer?: HTMLDivElement;
    currentSearchTerm?: string;
    inputMode?: "general" | "writing" | "editing";
    text?: string;
  }
}

function ifFrontend<T extends Function>(doFn: T) {
  if (typeof window !== "undefined") {
    return (...args: any[]) => doFn(...args);
  } else {
    return () => null;
  }
}

export function isElementInViewport(el: HTMLElement) {
  if (el == null) {
    return false;
  }
  var rect = el.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight ||
        document.documentElement.clientHeight) /* or $(window).height() */ &&
    rect.right <=
      (window.innerWidth ||
        document.documentElement.clientWidth) /* or $(window).width() */
  );
}

export function canFocus(x: HTMLElement) {
  if (window.getComputedStyle(x).display === "none") {
    return false;
  }

  if (window.getComputedStyle(x).visibility === "hidden") {
    return false;
  }

  if (!isElementInViewport(x)) {
    return false;
  }

  // @ts-ignore
  if (x.disabled === true) {
    return false;
  }

  if (
    x.getBoundingClientRect().width === 0 ||
    x.getBoundingClientRect().height === 0
  ) {
    return false;
  }

  if (x.tabIndex != null && x.tabIndex > -1) {
    return true;
  }

  if (["input", "a", "button", "select"].includes(x.nodeName.toLowerCase())) {
    return true;
  }

  if (
    ["row", "button", "checkbox", "tab"].includes(
      x.getAttribute("role")?.toLowerCase() ?? ""
    )
  ) {
    return true;
  }

  return false;
}

export function removeMessage() {
  if (window.interval) {
    clearTimeout(window.interval);
    window.interval = undefined;
  }
  if (window.container) {
    document.body.removeChild(window.container);
    window.container = undefined;
  }
}

export const showMessage = ifFrontend((message: string) => {
  removeMessage();

  window.container = document.createElement("div");

  document.body.appendChild(window.container);
  const shadow = window.container.attachShadow({ mode: "open" });

  var elem = document.createElement("div");
  elem.style.cssText =
    "position:fixed;opacity:0.8;z-index:99999;background:#000;top:20px;left:50%;transform:translateX(-50%);color:white;font-size:20px;text-align:center;padding:5px;";
  elem.textContent = message;
  shadow.appendChild(elem);

  window.interval = setTimeout(() => {
    removeMessage();
  }, 5000);
});

export function hideTags() {
  if (window.tagsContainer != null) {
    document.body.removeChild(window.tagsContainer);
    window.tagsContainer = undefined;
  }
  window.currentSearchTerm = undefined;
}

function getLabel(x: Element) {
  let possible = [
    x.getAttribute("title"),
    x.getAttribute("aria-label"),
    x.getAttribute("data-tooltip"),
  ];

  if (x.getAttribute("aria-labelledby") != null) {
    possible.push(
      //@ts-ignore
      document.getElementById(x.getAttribute("aria-labelledby"))?.innerText
    );
  }
  // @ts-ignore
  possible.push(x.innerText);
  return possible.find((n) => n != null && n.length > 0);
}

function createTag(
  name: string,
  secondName: string,
  shadow: ShadowRoot,
  posTop: number,
  posLeft: number
) {
  var elem = document.createElement("div");
  elem.style.cssText = `
  position:fixed;
  opacity:0.8;
  z-index:99999;
  background:blue;
  color:white;
  top:${posTop}px;
  left:${posLeft}px;
  transform:translate(-50%, -50%);
  font-size:14px;
  text-align:center;
  padding:5px;`;
  elem.textContent = `${name} | ${secondName}`;
  shadow.appendChild(elem);
}

function clickOnElement(tag: HTMLElement) {
  tag.focus();
  tag.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  tag.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  tag.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  // tag.click()
}

export const clickOn = ifFrontend((searchTerm: string, offset?: number) => {
  console.log("clickOn1", searchTerm, offset);
  hideTags();
  const tags = getTagsFor(searchTerm);
  if (tags.length === 1) {
    console.log("found tag", tags[0]);
    clickOnElement(tags[0].tag as HTMLElement);
  } else if (offset != null && offset - 1 < tags.length) {
    console.log("clicking on tags offset", tags, offset);
    clickOnElement(tags[offset - 1].tag as HTMLElement);
  } else {
    console.log("found multiple tags", tags, offset);
    showTags(searchTerm);
  }
});

export function getTagsFor(searchTerm?: string) {
  let found: { label: string; tag: Element }[] = [];
  console.log("get tags", searchTerm);
  let seenNames: { [key: string]: number } = {};

  for (const tag of document.getElementsByTagName("*")) {
    if (
      canFocus(tag as HTMLElement)
      // && // @ts-ignore
      // (getLabel(tag) ?? "").toLowerCase().includes("search mail")
    ) {
      if (
        searchTerm != null &&
        !(getLabel(tag) ?? "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase().trim())
      ) {
        // console.log("doesn't match", getLabel(tag), searchTerm);
        continue;
      } else {
        // console.log("match!", tag);
      }
      const rect = tag.getBoundingClientRect();
      // @ts-ignore
      let inner = (getLabel(tag) ?? "").split(" ")[0];

      if (inner in seenNames) {
        inner = inner + ++seenNames[inner];
      } else {
        seenNames[inner] = 0;
      }

      found.push({
        label: inner,
        tag,
      });
    }
  }
  return found;
}

export const showTags = ifFrontend((searchTerm?: string) => {
  hideTags();

  window.currentSearchTerm = searchTerm;

  console.log("show tags", searchTerm);
  window.tagsContainer = document.createElement("div");
  document.body.appendChild(window.tagsContainer);
  const shadow = window.tagsContainer.attachShadow({ mode: "open" });
  let i = 0;

  for (const { label, tag } of getTagsFor(searchTerm)) {
    if (canFocus(tag as HTMLElement)) {
      const rect = tag.getBoundingClientRect();
      createTag(
        "" + ++i,
        label,
        shadow,
        rect.top + rect.height / 2,
        rect.left + rect.width / 2
      );
    }
  }
});

export const startWriting = ifFrontend(() => {
  console.log("writing started");
  window.inputMode = "writing";
  window.text =
    (document.activeElement as any | null)?.value != null
      ? (document.activeElement as any | null).value
      : (document.activeElement as any | null)?.innerText;
  window.text = (window.text + " ").trim();
});

export const stopWriting = ifFrontend(() => {
  console.log("writing stopped");
  window.inputMode = "general";
  document.execCommand("selectAll", false);
  document.execCommand("insertText", false, window.text);
  window.text = "";
});

export function writeToInputElement(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string
) {
  try {
    const keyboardEventInit = {
      bubbles: false,
      cancelable: false,
      composed: false,
      key: "",
      code: "",
      location: 0,
    };

    if (element) {
      element.innerText = text;
      element.dispatchEvent(new KeyboardEvent("keydown", keyboardEventInit));
      //@ts-ignore
      element.dispatchEvent(new KeyboardEvent("keyup", keyboardEventInit));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch (e) {}
}

let smartFormatInterval: ReturnType<typeof setTimeout> | null = null;

export const writeText = ifFrontend((text: string) => {
  // text = window.text + " " + text + " ";
  // text = text.replace(" comma ", ", ");
  // text = text.replace(" period ", ". ");
  // text = text.replace(" full stop ", ". ");
  // text = text.replace(" question mark ", "? ");
  // text = text.replace(" semicolon ", "; ");
  // text = text.replace(" semi-colon ", "; ");
  // text = text.replace(" semi colon ", "; ");
  // text = text.replace(" colon ", ": ");
  // text = text.trim();

  // for (let i = 2; i < text.length; i++) {
  //   if ([".", "?"].includes(text.charAt(i - 2))) {
  //     text =
  //       text.slice(0, i) + text.charAt(i).toUpperCase() + text.slice(i + 1);
  //   }
  // }

  console.log("insertText", text);
  if (text.trim().length === 0) {
    return;
  }

  window.text = window.text + " " + text.trim();
  // window.text = window.text!.charAt(0).toUpperCase() + window.text!.slice(1);
  document.execCommand("selectAll", false);
  document.execCommand("insertText", false, window.text);
  smartFormatTimeout();
});

export const writeInterimText = ifFrontend((text: string) => {
  console.log("insertText", text);
  document.execCommand("selectAll", false);
  document.execCommand("insertText", false, window.text + text);
});

const smartFormatTimeout = () => {
  if (smartFormatInterval != null) {
    clearTimeout(smartFormatInterval);
  }
  smartFormatInterval = setTimeout(async () => {
    const text = window.text;
    if (text == null || text.trim() === "") {
      return;
    }
    const formatted = await smartFormat(text ?? "");
    if (window.text === text) {
      window.text = formatted;
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, window.text);
    }
  }, 1_000);
};
