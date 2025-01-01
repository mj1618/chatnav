import { useEffect } from "react";

declare global {
  var chrome: any;
}

function App() {
  useEffect(() => {
    chrome.runtime.onMessage.addListener(function (
      request: any,
      sender: any,
      _: any
    ) {
      console.log(
        sender.tab
          ? "from a content script:" + sender.tab.url
          : "from the extension:",
        JSON.stringify(request)
      );
    });
  }, []);

  return (
    <div className="w-[300px] h-[500px] ">
      <h1 className="text-3xl font-bold underline p-8">Hello world!</h1>
    </div>
  );
}

export default App;
