export function concatArrays(arrays: Float32Array[]) {
  if (arrays.length === 0) {
    return new Float32Array(0);
  }
  const sizes = arrays.reduce(
    (out, next) => {
      out.push(out.at(-1)! + next.length);
      return out;
    },
    [0]
  );
  const outArray = new Float32Array(sizes.at(-1)!);
  arrays.forEach((arr, index) => {
    const place = sizes[index];
    outArray.set(arr, place);
  });
  return outArray;
}

export const stopAllRecordTabs = async () => {
  const recordTabs = (
    await chrome.tabs.query({
      pinned: true,
    })
  ).filter((t) => t.url?.includes("record.html"));

  console.log("stopping all record tabs", recordTabs);

  for (const tab of recordTabs) {
    await chrome.tabs.remove(tab.id!);
  }
};

export async function createRecordTab() {
  await stopAllRecordTabs();
  const recordTab = await chrome.tabs.create({
    url: chrome.runtime.getURL("record.html"),
    pinned: true,
    active: false,
  });
  chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
    if (tabId === recordTab.id && changeInfo.status === "complete") {
      chrome.tabs.onUpdated.removeListener(listener);
    }
  });

  //   (tab) => {
  //     chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
  //       if (tabId === tab.id && changeInfo.status === "complete") {
  //         recordTab = tab;
  //         chrome.tabs.onUpdated.removeListener(listener);
  //       }
  //     });
  //   }
  // );
}

export async function sendTabMessage(
  tabId: number,
  type: string,
  message: string
) {
  console.log("sendTabMessage", tabId, type, message);
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content-script.js"],
    });
  } catch (e) {
    console.error("Error sending message to tab", e);
  } finally {
    chrome.tabs.sendMessage(tabId, {
      type: type,
      message: message,
    });
  }
}

export const activeTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) {
    console.log("no active tab");
    return null;
  }
  return tabs[0];
};

export const getTabById = async (tabId: number | undefined) => {
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

export async function selectDevice(
  deviceId?: string | number | undefined
): Promise<InputDeviceInfo> {
  const allDevices = (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === "audioinput"
  ) as InputDeviceInfo[];
  let found = allDevices.find((d) => d.deviceId === deviceId);
  if (!found) {
    found = allDevices.find((d) => d.label.includes("Studio"));
    if (!found) {
      found = allDevices[0];
    }
  }

  return found;
}

export async function getAllDevices() {
  return (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === "audioinput"
  ) as InputDeviceInfo[];
}

export const sendKeyboardEvent = () => {
  const keyboardEvent = document.createEvent("KeyboardEvent");
  const initMethod =
    typeof keyboardEvent.initKeyboardEvent !== "undefined"
      ? "initKeyboardEvent"
      : "initKeyEvent";

  // @ts-ignore
  keyboardEvent[initMethod](
    "keydown", // event type: keydown, keyup, keypress
    true, // bubbles
    true, // cancelable
    window, // view: should be window
    false, // ctrlKey
    false, // altKey
    false, // shiftKey
    false, // metaKey
    65, // keyCode: unsigned long - the virtual key code, else 0
    0 // charCode: unsigned long - the Unicode character associated with the depressed key, else 0
  );
  document.dispatchEvent(keyboardEvent);
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

// words from one to twenty
export const oneToTwenty = [
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
export const twentyToNinety = [
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

export const hundredToThousand = ["hundred", "thousand"];

const homophones = ["to", "too"];

export const allNumberWords = oneToTwenty
  .concat(twentyToNinety)
  .concat(hundredToThousand)
  .concat(homophones);

export const parseWordsToNumbers = (str: string) => {
  const words = str
    .split(" ")
    .map((s) => (s === "to" || s === "too" ? "two" : s));
  console.log("parse", words);
  for (let n = 0; n < oneToTwenty.length; n++) {
    if (words.includes(oneToTwenty[n])) {
      return n + 1;
    }
  }
  return 0;
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
