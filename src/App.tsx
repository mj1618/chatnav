import { useEffect } from "react";

declare global {
  var chrome: any;
}

function App() {
  useEffect(() => {
    (chrome as any).windows.getAll({ populate: true }, function (windows: any) {
      windows.forEach(function (window: any) {
        window.tabs.forEach(function (tab: any) {
          //collect all of the urls here, I will just log them instead
          console.log(tab);
        });
      });
    });
    (async () => {
      // see the note below on how to choose currentWindow or lastFocusedWindow
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      console.log(tab);
      // ..........
    })();
  }, []);

  return (
    <div className="w-[300px] h-[500px] ">
      <h1 className="text-3xl font-bold underline p-8">Hello world!</h1>
    </div>
  );
}

export default App;
