import init from "./init.md";
import "./App.css";
import "@tagspaces/tagspaces-md/lib/milkdown.css";
import { MilkdownEditor } from "@tagspaces/tagspaces-md";
import { CodeMirror } from "@tagspaces/tagspaces-codemirror";
import Box from "@mui/material/Box";

import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import { useCallback, useRef, useState, useEffect, useContext } from "react";
import { MainMenu, ColorModeContext } from "@tagspaces/tagspaces-extension-ui";
import { useTheme } from "@mui/material/styles";

const initMarkdown = `# Milkdown React Custom Component

[link](https://www.tagspaces.org/)
> You're scared of a world where you're needed.

This is a demo for using Milkdown with **React**.
The quote is built by a custom react component.`;

function App() {
  const milkdownEditorRef = useRef(null);
  const codeMirrorRef = useRef(null);
  // const [dark, setDark] = useState(false);
  const [isReadOnly, setReadOnly] = useState(false);
  const lockCode = useRef(false);
  const text = useRef(initMarkdown);
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();

  useEffect(() => {
    fetch(init)
      .then((res) => res.text())
      .then((text) => {
        milkdownListener(text);
      });
  }, []);

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
    <>
      <button
        onClick={() => {
          colorMode.toggleColorMode();
          milkdownEditorRef.current.setDarkMode(theme.palette.mode === "light");
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
      <Box
        sx={{
          display: "flex",
          width: "100%",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        {/*<MilkdownEditor
            ref={fileDescriptionRef}
            content={markdown}
            onChange={milkdownListener}
            readOnly={false}
            dark={dark}
            lightMode={true}
          />
      <hr /> */}
        <MilkdownEditor
          ref={milkdownEditorRef}
          content={text.current}
          onChange={milkdownListener}
          readOnly={isReadOnly}
          // dark={dark}
          lightMode={false}
        />
        <hr />
        <CodeMirror
          ref={codeMirrorRef}
          value={text.current}
          onChange={onCodeChange}
          // dark={dark}
          editable={true}
          lock={lockCode}
          fileExtension={"js"}
        />
        <MainMenu
          menuItems={[
            {
              id: "lineNumbers",
              icon: <FormatListNumberedIcon />,
              name: "Toggle Line Numbers",
              action: () => {
                codeMirrorRef.current.toggleLineNumbers();
              },
            },
            { id: "print" },
            { id: "about" },
          ]}
          aboutTitle="About Dialog"
          aboutDialogContent={<>Testing About Dialog</>}
        />
      </Box>
    </>
  );
}

export default App;
