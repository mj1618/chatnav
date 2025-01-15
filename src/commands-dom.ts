declare global {
  interface Window {
    interval?: NodeJS.Timeout;
    container?: HTMLDivElement;
    tagsContainer?: HTMLDivElement;
    currentSearchTerm?: string;
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

export function showMessage(message: string) {
  if (typeof window === "undefined") {
    return;
  }

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
}

export function hideTags() {
  if (window.tagsContainer != null) {
    document.body.removeChild(window.tagsContainer);
    window.tagsContainer = undefined;
  }
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

export function clickOn(searchTerm: string, offset?: number) {
  if (typeof window === "undefined") {
    console.log("not in browser for show tags");
    return;
  }
  hideTags();
  const tags = getTagsFor(searchTerm);
  if (tags.length === 1) {
    (tags[0].tag as HTMLElement).focus();
    (tags[0].tag as HTMLElement).click();
  } else if (offset != null) {
  } else {
    showTags(searchTerm);
  }
}

export function getTagsFor(searchTerm?: string) {
  let found: { label: string; tag: Element }[] = [];
  console.log("get tags");
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
        console.log("doesn't match", getLabel(tag), searchTerm);
        continue;
      } else {
        console.log("match!", tag);
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

export function showTags(searchTerm?: string) {
  if (typeof window === "undefined") {
    console.log("not in browser for show tags");
    return;
  }
  hideTags();

  console.log("show tags");
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
}
