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

let recordTab: chrome.tabs.Tab | null = null;
export async function createRecordTab() {
  if (recordTab != null) {
    return;
  }
  recordTab = await chrome.tabs.create({
    url: chrome.runtime.getURL("record.html"),
    pinned: true,
    active: false,
  });
  chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
    if (tabId === recordTab!.id && changeInfo.status === "complete") {
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
    found = allDevices[0];
  }

  return found;
}

export async function getAllDevices() {
  return (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === "audioinput"
  ) as InputDeviceInfo[];
}
