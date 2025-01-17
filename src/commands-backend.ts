import { getActiveTab } from "./utils";

const ifBackend = <T, U>(doFn: (...args: T[]) => U) => {
  if (typeof window === "undefined") {
    return (...args: T[]) => doFn(...args);
  } else {
    return () => null;
  }
};

export const createNewTab = ifBackend(() => {
  console.log("creating a new tab");
  chrome.tabs.create({
    url: "chrome://newtab",
  });
});

export const goToUrl = ifBackend(async (url: string) => {
  const tab = await getActiveTab();
  chrome.tabs.update(tab?.id!, {
    url,
  });
});
