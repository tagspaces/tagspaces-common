import "./App.css";
//import "@tagspaces/tagspaces-md/lib/milkdown.css";
import { MilkdownEditor, CodeMirror } from "@tagspaces/tagspaces-md";
import { useCallback, useRef, useState } from "react";

function App() {
  const milkdownEditorRef = useRef(null);
  const codeMirrorRef = useRef(null);
  const [dark, setDark] = useState(false);
  const lockCode = useRef(false);

  const milkdownListener = useCallback((markdown, prevMarkdown) => {
    const lock = lockCode.current;
    if (lock) return;
    // console.log(markdown);
    const { current } = codeMirrorRef;
    if (!current) return;
    current.update(markdown);
  }, []);

  const onCodeChange = useCallback((getCode) => {
    // console.log(markdown);
    const { current } = milkdownEditorRef;
    if (!current) return;
    const value = getCode();
    current.update(value);
  }, []);

  const markdown = `# Milkdown React Custom Component

> You're scared of a world where you're needed.

This is a demo for using Milkdown with **React**.
The quote is built by a custom react component.`;

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
          {/*<MilkdownEditor
            ref={fileDescriptionRef}
            content={markdown}
            onChange={milkdownListener}
            readOnly={false}
            dark={dark}
            lightMode={true}
          />*/}
          <hr />
          <p>not lightMode</p>
          <MilkdownEditor
            ref={milkdownEditorRef}
            content={markdown}
            onChange={milkdownListener}
            readOnly={false}
            dark={dark}
            lightMode={false}
          />
          <hr />
          <CodeMirror
            ref={codeMirrorRef}
            value={markdown}
            onChange={onCodeChange}
            dark={dark}
            editable={true}
            lock={lockCode}
          />
        </div>
      </header>
    </div>
  );
}

export default App;
