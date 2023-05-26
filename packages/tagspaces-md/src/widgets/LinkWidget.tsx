import { commandsCtx } from '@milkdown/core';
import {linkAttr, updateLinkCommand} from '@milkdown/preset-commonmark';
import { Plugin } from '@milkdown/prose/state';
import { DecorationSet } from '@milkdown/prose/view';
import { useInstance } from '@milkdown/react';
import { $prose } from '@milkdown/utils';
import type { useWidgetViewFactory } from '@prosemirror-adapter/react';
import { useWidgetViewContext } from '@prosemirror-adapter/react';
import type { FC } from 'react';

export const LinkWidgetBefore: FC = () => {
  return <>[</>;
};

export const LinkWidgetAfter: FC = () => {
  const { spec } = useWidgetViewContext();
  const [loading, editor] = useInstance();
  const href = spec?.href ?? '';
  const title = spec?.title ?? '';

  return (
    <>
      ]
      <span>
        (
        {
          <>
            <small className="font-light text-nord8">link: </small>
            <input
              size={href.length}
              placeholder="empty"
              onBlur={e => {
                if (loading) return;
                editor().action(ctx => {
                  const commands = ctx.get(commandsCtx);
                  commands.call(updateLinkCommand.key, {
                    href: e.target.value
                  });
                });
              }}
              className="rounded border-none bg-gray-50 py-0 px-2 ring-1 dark:bg-gray-900"
              type="text"
              defaultValue={href}
            />
            &nbsp;
            <small className="font-light text-nord8">title: </small>
            &quot;
            <input
              size={title.length || 5}
              placeholder="empty"
              onBlur={e => {
                if (loading) return;
                editor().action(ctx => {
                  const commands = ctx.get(commandsCtx);
                  commands.call(updateLinkCommand.key, {
                    title: e.target.value
                  });
                });
              }}
              className="rounded border-none bg-gray-50 py-0 px-2 ring-1 dark:bg-gray-900"
              type="text"
              defaultValue={title}
            />
            &quot;
          </>
        }
        )
      </span>
    </>
  );
};

export const linkPlugin = (
  widgetViewFactory: ReturnType<typeof useWidgetViewFactory>
) => {
  const before = widgetViewFactory({ as: 'span', component: LinkWidgetBefore });
  const after = widgetViewFactory({ as: 'span', component: LinkWidgetAfter });

  /*const [loading, editor] = useInstance();
  editor().action(ctx => {
    const commands = ctx.get(commandsCtx);
    commands.call(updateLinkCommand.key, { // linkAttr.key
      onClick: 'alert("test")'
    });
  });*/
  /*
  const clickLink = (evt) => {
    evt.preventDefault();

    function hasURLProtocol(url) {
      return (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('file://') ||
        url.startsWith('data:') ||
        url.startsWith('ts://?ts') ||
        url.startsWith('ts:?ts')
      );
    }

    let path;
    if (!hasURLProtocol(href)) {
      path = encodeURIComponent(href);
    } else {
      path = href;
    }

    window.parent.postMessage(
      JSON.stringify({
        command: 'openLinkExternally',
        link: path
      }),
      '*'
    );
  };
*/
  return $prose(
    () =>
      new Plugin({
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr) {
            const { selection } = tr;

            const { $from, $to } = selection;
            const node = tr.doc.nodeAt(selection.from);

            const mark = node?.marks.find(mark => mark.type.name === 'link');

            if (!mark) return DecorationSet.empty;

            let markPos = { start: -1, end: -1 };
            tr.doc.nodesBetween($from.start(), $to.end(), (n, pos) => {
              if (node === n) {
                markPos = {
                  start: pos,
                  end: pos + Math.max(n.textContent.length, 1)
                };

                // stop recursing if result is found
                return false;
              }
              return undefined;
            });

            /*const hrefString =
              '(function {' +
              encodeURIComponent(JSON.stringify(clickLink)) +
              '})()';*/

            return DecorationSet.create(tr.doc, [
              before(markPos.start),
              after(markPos.end, {
                href: mark.attrs.href, ///'javascript:eval(decodeURIComponent(' + hrefString + '))',
                title: mark.attrs.title
              })
            ]);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
  );
};
