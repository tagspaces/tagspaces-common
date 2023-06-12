import "./App.css";
import "@tagspaces/tagspaces-md/lib/milkdown.css";
import { MilkdownEditor } from "@tagspaces/tagspaces-md";
import { CodeMirror } from "@tagspaces/tagspaces-codemirror";
import { useCallback, useRef, useState } from "react";
import { MainMenu } from "@tagspaces/tagspaces-extension-ui";

function App() {
  const fileDescriptionRef = useRef(null);
  const codeMirrorRef = useRef(null);
  const [dark, setDark] = useState(false);
  const lockCode = useRef(false);

  const milkdownListener = useCallback(
    (markdown: string, prevMarkdown: string | null) => {
      const lock = lockCode.current;
      if (lock) return;
      // console.log(markdown);
      const { current } = codeMirrorRef;
      if (!current) return;
      current.update(markdown);
    },
    []
  );

  const onCodeChange = useCallback((getCode: () => string) => {
    // console.log(markdown);
    const { current } = fileDescriptionRef;
    if (!current) return;
    const value = getCode();
    current.update(value);
  }, []);

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
          <CodeMirror
            ref={codeMirrorRef}
            value={"Test content"}
            onChange={onCodeChange}
            dark={dark}
            editable={true}
            lock={lockCode}
            fileExtension={'js'}
          />
        </div>
      </header>
      <MainMenu print="Print" about="About" />
    </div>
  );
}

export default App;
