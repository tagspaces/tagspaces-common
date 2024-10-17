import { Ctx } from '@milkdown/ctx';
import { slashFactory } from '@milkdown/plugin-slash';
import { usePluginViewFactory } from '@prosemirror-adapter/react';
import { useMemo } from 'react';

// import { SlashNode } from '../../../components/SlashNode/SlashNode';
import { Plugin } from '../../types/plugins';
import { Slash } from '../../components/slash/Slash';
import { useSearchDialogContext } from '../../components/dialogs/useSearchDialogContext';

const slash = slashFactory('MILKDOWN');

export const useSlashPlugin = (): Plugin => {
  const pluginViewFactory = usePluginViewFactory();
  const { openSearchDialog } = useSearchDialogContext();

  /*function searchAndSelect(view: EditorView, searchText: string) {
    const { state } = view;
    const { selection } = state;
    let { from, to } = selection;

    // Search from the current selection to the end
    if (searchFromSelection(view, searchText, from, to)) {
      return;
    }

    // If not found, search from the start of the document
    if (searchFromStart(view, searchText)) {
      return;
    }

    alert('Text not found.');
  }

  function searchFromSelection(
    view: EditorView,
    searchText: string,
    from: number,
    to: number
  ): boolean {
    const { state, dispatch } = view;
    const { doc } = state;
    let tr = state.tr;
    let found = false;

    doc.descendants((node, pos) => {
      if (found || !node.isText) return;

      if (pos >= from) {
        const text = node.text!;
        const index = text.indexOf(searchText, pos === from ? to - pos : 0);

        if (index !== -1) {
          const start = pos + index;
          const end = start + searchText.length;

          // Select the found text
          tr = tr.setSelection(TextSelection.create(doc, start, end));
          tr = tr.scrollIntoView();
          view.focus();

          found = true;
        }
      }
    });

    if (found) {
      dispatch(tr);
    }

    return found;
  }

  function searchFromStart(view: EditorView, searchText: string) {
    const { state, dispatch } = view;
    const { doc } = state;
    let tr = state.tr;
    let found = false;

    doc.descendants((node, pos) => {
      if (found || !node.isText) return;

      const text = node.text!;
      const index = text.indexOf(searchText);

      if (index !== -1) {
        const start = pos + index;
        const end = start + searchText.length;

        // Select the found text
        tr = tr.setSelection(TextSelection.create(doc, start, end));
        tr = tr.scrollIntoView();
        view.focus();

        found = true;
      }
    });

    if (found) {
      dispatch(tr);
    }

    return found;
  }

  function searchAndReplace(
    view: EditorView,
    searchText: string,
    replaceText: string
  ) {
    const { state, dispatch } = view;
    let { tr } = state;

    // Track total offset caused by replacements
    let accumulatedOffset = 0;

    state.doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text!;
        let startIndex = 0;

        while ((startIndex = text.indexOf(searchText, startIndex)) !== -1) {
          const from = pos + startIndex + accumulatedOffset;
          const to = from + searchText.length;

          tr = tr.replaceWith(from, to, state.schema.text(replaceText));
          // Update offset for subsequent replacements
          accumulatedOffset += replaceText.length - searchText.length;
          startIndex += searchText.length;
        }
      }
    });

    if (tr.docChanged) {
      dispatch(tr);
    }

    // Restore the selection
    const selection = TextSelection.create(tr.doc, tr.selection.from);
    tr = tr.setSelection(selection);
    view.focus();
  }*/

  const slashPlugin = useMemo(
    () =>
      [
        slash,
        (ctx: Ctx) => () => {
          ctx.set(slash.key, {
            props: {
              handleKeyDown: (view, event) => {
                if (event.ctrlKey) {
                  if (event.key === 'f') {
                    openSearchDialog();
                  }
                  /*if (event.key === 's') {
                    event.preventDefault(); // Prevent browser search

                    const searchText = prompt('Enter the text to search:');

                    if (searchText) {
                      searchAndSelect(view, searchText);
                    }
                    return true;
                  } else if (event.key === 'r') {
                    // Trigger the search and replace function
                    const searchText = prompt('Enter the text to search:');
                    const replaceText = prompt('Enter the replacement text:');

                    if (searchText && replaceText) {
                      searchAndReplace(view, searchText, replaceText);
                    }

                    return true;
                  }*/
                }
                return false;
              }
            },
            view: pluginViewFactory({
              component: Slash
            })
          });
        }
      ].flat(),
    [pluginViewFactory]
  );

  return slashPlugin;
};
