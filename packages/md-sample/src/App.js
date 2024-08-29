import init from "./init.md";
import "./App.css";
// import "@tagspaces/tagspaces-md/lib/milkdown.css";
import "@tagspaces/tagspaces-md/lib/tailwind.css";
import { MilkdownEditor } from "@tagspaces/tagspaces-md";
import { CodeMirror } from "@tagspaces/tagspaces-codemirror";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";

import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import { useCallback, useRef, useState, useEffect, useContext } from "react";
import { MainMenu, ColorModeContext } from "@tagspaces/tagspaces-extension-ui";
import { useTheme } from "@mui/material/styles";
import { Box, CssBaseline, Toolbar, Button, styled } from "@mui/material";

const initMarkdown = `# Milkdown React Custom Component

[link1](https://www.tagspaces.org/) [link2](https://www.abv.bg/)
> You're scared of a world where you're needed.

This is a demo for using Milkdown with **React**.
The quote is built by a custom react component.`;

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const lightMode = searchParams.get("lightMode");
  const query = searchParams.get("query");
  const readOnly = searchParams.get("readonly");
  const mode = searchParams.get("mode");
  const milkdownEditorRef = useRef(null);
  const codeMirrorRef = useRef(null);
  // const [dark, setDark] = useState(false);
  const [isReadOnly, setReadOnly] = useState(!!readOnly);
  const [isLightMode, setLightMode] = useState(
    lightMode ? Boolean(lightMode) : false
  );
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

  //const Offset = styled("div")(({ theme }) => theme.mixins.toolbar);

  return (
    <>
      {/*<Offset />*/}
      <Box
        component="main"
        sx={{
          display: "flex",
          width: "100%",
          height: "100%",
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
        <div style={{ width: "50%", height: "100%" }}>
          <MilkdownEditor
            ref={milkdownEditorRef}
            content={text.current}
            onChange={milkdownListener}
            readOnly={isReadOnly}
            // dark={dark}
            lightMode={isLightMode}
            excludePlugins={
              isReadOnly ? ["menu"] : [] //, "upload", "slash" "block"
            }
            mode={mode || "description"}
            query={query}
            // excludePlugins={["upload"]}
          />
        </div>
        <div style={{ width: "50%" }}>
          <CodeMirror
            ref={codeMirrorRef}
            value={text.current}
            onChange={onCodeChange}
            // dark={dark}
            editable={true}
            lock={lockCode}
            fileExtension={"js"}
          />
        </div>
        <MainMenu
          menuItems={[
            {
              id: "searchId",
              icon: <SearchIcon />,
              name: "Search",
              action: () => {
                milkdownEditorRef.current.openSearchDialog();
              },
            },
            {
              id: "themeSwitch",
              icon: <DarkModeIcon />,
              name: "Theme Switch",
              action: () => {
                colorMode.setMode(
                  theme.palette.mode === "light" ? "dark" : "light"
                ); //toggleColorMode();
                milkdownEditorRef.current.setDarkMode(
                  theme.palette.mode === "light"
                );
              },
            },
            {
              id: "readOnly",
              icon: <EditIcon />,
              name: isReadOnly ? "Preview" : "Active",
              action: () => {
                setReadOnly(!isReadOnly);
              },
            },
            {
              id: "lightMode",
              icon: <EditIcon />,
              name: isLightMode ? "Light mode" : "Full mode",
              action: () => {
                setLightMode(!isLightMode);
              },
            },
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
