import "./App.css";
import '@tagspaces/tagspaces-md/lib/milkdown.css';
import { MilkdownEditor } from "@tagspaces/tagspaces-md";
import { useCallback, useRef } from "react";

function App() {
  const fileDescriptionRef = useRef(null);

  const milkdownListener = useCallback(
    (markdown: string, prevMarkdown: string | null) => {
      console.log(markdown);
    },
    []
  );

  return (
    <div className="App">
      <header className="App-header">
        <div style={{width: '1500px'}}>
          <MilkdownEditor
            ref={fileDescriptionRef}
            content={"Test content"}
            onChange={milkdownListener}
            readOnly={false}
            dark={false}
          />
        </div>
      </header>
    </div>
  );
}

export default App;
