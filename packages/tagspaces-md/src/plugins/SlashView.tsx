/*
import React, { useCallback, useEffect, useRef } from 'react';
import {commandsCtx, editorViewCtx} from '@milkdown/core';
import { Ctx } from '@milkdown/ctx';
import { slashFactory, SlashProvider } from '@milkdown/plugin-slash';
import {createCodeBlockCommand, insertHrCommand, wrapInHeadingCommand} from '@milkdown/preset-commonmark';
import { useInstance } from '@milkdown/react';
import { callCommand } from '@milkdown/utils';
import { usePluginViewContext } from '@prosemirror-adapter/react';

export const slash = slashFactory('Commands');

export const SlashView = () => {
  const ref = useRef<HTMLDivElement>(null);
  const slashProvider = useRef<SlashProvider>();

  const { view, prevState } = usePluginViewContext();
  const [loading, get] = useInstance();
  const action = useCallback(
    (fn: (ctx: Ctx) => void) => {
      if (loading) return;
      get().action(fn);
    },
    [loading]
  );

  useEffect(() => {
    const div = ref.current;
    if (loading || !div) {
      return;
    }
    slashProvider.current = new SlashProvider({
      content: div,
      tippyOptions: {
        onMount: _ => {
          (ref.current?.children[0] as HTMLButtonElement).focus();
        }
      }
    });

    return () => {
      slashProvider.current?.destroy();
    };
  }, [loading]);

  useEffect(() => {
    slashProvider.current?.update(view, prevState);
  });

  const command = (e: React.KeyboardEvent | React.MouseEvent) => {
    e.preventDefault(); // Prevent the keyboad key to be inserted in the editor.
    action(ctx => {
      const view = ctx.get(editorViewCtx);
      const { dispatch, state } = view;
      const { tr, selection } = state;
      const { from } = selection;
      dispatch(tr.deleteRange(from - 1, from));
      view.focus();
      return callCommand(createCodeBlockCommand.key)(ctx);
    });
  };

  return (
    <div
      data-desc="This additional wrapper is useful for keeping slash component during HMR"
      aria-expanded="false"
    >
      <div ref={ref} aria-expanded="false">
        {/!*<button
          className="text-gray-600 bg-slate-200 px-2 py-1 rounded-lg hover:bg-slate-300 border hover:text-gray-900"
          onKeyDown={e => command(e)}
          onMouseDown={e => {
            command(e);
          }}
        >
          Code Block
        </button>*!/}
        <ul className="m-0 list-none">
          <li
              onClick={() => {
                if (loading)
                  return

                get().action((ctx) => {
                  // remove slash
                  const view = ctx.get(editorViewCtx)
                  view.dispatch(view.state.tr.delete(view.state.selection.from - 1, view.state.selection.from))

                  ctx.get(commandsCtx).call(wrapInHeadingCommand.key, 1)
                })
              }}
              className="cursor-pointer px-6 py-3 hover:bg-gray-200 hover:dark:bg-gray-700"
          >
            Heading 1
          </li>
          <li
              onClick={() => {
                if (loading)
                  return

                get().action((ctx) => {
                  // remove slash
                  const view = ctx.get(editorViewCtx)
                  view.dispatch(view.state.tr.delete(view.state.selection.from - 1, view.state.selection.from))

                  ctx.get(commandsCtx).call(wrapInHeadingCommand.key, 2)
                })
              }}
              className="cursor-pointer px-6 py-3 hover:bg-gray-200 hover:dark:bg-gray-700"
          >
            Heading 2
          </li>
          <li
              onClick={() => {
                if (loading)
                  return

                get().action((ctx) => {
                  // remove slash
                  const view = ctx.get(editorViewCtx)
                  view.dispatch(view.state.tr.delete(view.state.selection.from - 1, view.state.selection.from))

                  ctx.get(commandsCtx).call(wrapInHeadingCommand.key, 3)
                })
              }}
              className="cursor-pointer px-6 py-3 hover:bg-gray-200 hover:dark:bg-gray-700"
          >
            Heading 3
          </li>
          <li
              onClick={() => {
                if (loading)
                  return

                get().action((ctx) => {
                  // remove slash
                  const view = ctx.get(editorViewCtx)
                  view.dispatch(view.state.tr.delete(view.state.selection.from - 1, view.state.selection.from))

                  ctx.get(commandsCtx).call(createCodeBlockCommand.key)
                })
              }}
              className="cursor-pointer px-6 py-3 hover:bg-gray-200 hover:dark:bg-gray-700"
          >
            Code Block
          </li>
          <li
              onMouseDown={(e) => {
                if (loading)
                  return

                e.preventDefault()
                get().action((ctx) => {
                  // remove slash
                  const view = ctx.get(editorViewCtx)
                  view.dispatch(view.state.tr.delete(view.state.selection.from - 1, view.state.selection.from))

                  ctx.get(commandsCtx).call(insertHrCommand.key)
                })
              }}
              className="cursor-pointer px-6 py-3 hover:bg-gray-200 hover:dark:bg-gray-700"
          >
            Horizontal Rule
          </li>
        </ul>
      </div>
    </div>
  );
};
/!*
slash.configure(
    slashPlugin,
    {
      config: ctx => {
        // Get default slash plugin items
        const actions = defaultActions(ctx);
        // Define a status builder
        return ({ isTopLevel, content, parentNode }) => {
          // You can only show something at root level
          if (!isTopLevel) return null;

          // Empty content ? Set your custom empty placeholder !
          if (!content) {
            return {
              placeholder: readOnly
                  ? 'Click the edit button or double click to start editing'
                  : 'Type / to use the slash commands...'
            };
          }

          if (content.startsWith('/')) {
            return content === '/'
                ? {
                  placeholder: 'Type to filter...',
                  actions
                }
                : {
                  // @ts-ignore
                  actions: actions.filter(({ keyword }) => {
                    return (
                        keyword &&
                        keyword.some((key: any) =>
                            key.includes(content.slice(1).toLocaleLowerCase())
                        )
                    );
                  })
                };
          }
        };
      }
    }
)*!/
*/
