import "./App.css";
//import "@tagspaces/tagspaces-md/lib/milkdown.css";
import { MilkdownEditor, CodeMirror } from "@tagspaces/tagspaces-md";
import { useCallback, useRef, useState } from "react";

const initMarkdown = `# Milkdown React Custom Component

[link](https://www.tagspaces.org/)
> You're scared of a world where you're needed.

This is a demo for using Milkdown with **React**.
The quote is built by a custom react component.`;

function App() {
  const milkdownEditorRef = useRef(null);
  const codeMirrorRef = useRef(null);
  const [dark, setDark] = useState(false);
  const [isReadOnly, setReadOnly] = useState(false);
  const lockCode = useRef(false);
  const text = useRef(initMarkdown);

  const milkdownListener = useCallback((markdown, prevMarkdown) => {
    const lock = lockCode.current;
    if (lock) return;
    // console.log(markdown);
    const { current } = codeMirrorRef;
    if (!current) return;
    text.current = markdown;
    current.update(markdown);
  }, []);

  const onCodeChange = useCallback((getCode) => {
    // console.log(markdown);
    const { current } = milkdownEditorRef;
    if (!current) return;
    const value = getCode();
    text.current = value;
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
          <button
            onClick={() => {
              setReadOnly(!isReadOnly);
            }}
          >
            {isReadOnly ? "Preview" : "Active"}
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
            content={text.current}
            onChange={milkdownListener}
            readOnly={isReadOnly}
            dark={dark}
            lightMode={false}
          />
          <hr />
          <CodeMirror
            ref={codeMirrorRef}
            value={text.current}
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
