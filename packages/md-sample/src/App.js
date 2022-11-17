import "./App.css";
import "@tagspaces/tagspaces-md/lib/milkdown.css";
import { MilkdownEditor } from "@tagspaces/tagspaces-md";
import { useCallback, useRef, useState } from "react";

function App() {
  const fileDescriptionRef = useRef(null);
  const [dark, setDark] = useState(false);

  const milkdownListener = useCallback(
    (markdown: string, prevMarkdown: string | null) => {
      console.log(markdown);
    },
    []
  );

  return (
    <div className="App">
      <header className="App-header">
        <div style={{ width: "1500px" }}>
          <button
            onClick={() => {
              setDark(!dark);
            }}
          >
            Switch theme
          </button>
          <MilkdownEditor
            ref={fileDescriptionRef}
            content={"Test content"}
            onChange={milkdownListener}
            readOnly={false}
            dark={dark}
            lightMode={true}
          />
        </div>
      </header>
    </div>
  );
}

export default App;
