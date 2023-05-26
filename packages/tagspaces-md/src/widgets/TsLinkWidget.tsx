import { commandsCtx } from '@milkdown/core';
import {
  headingSchema,
  linkAttr,
  linkSchema,
  updateLinkCommand
} from '@milkdown/preset-commonmark';
import { Plugin } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { useInstance } from '@milkdown/react';
import { $prose } from '@milkdown/utils';
import type { useWidgetViewFactory } from '@prosemirror-adapter/react';
import { useWidgetViewContext } from '@prosemirror-adapter/react';
import type { FC } from 'react';
import { HeadingAnchor } from '../nodes/HeadingAnchor';

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

  return $prose(() => {
    const getAnchorWidget = widgetViewFactory({
      as: 'span',
      component: HeadingAnchor
    });
    return new Plugin({
      props: {
        decorations: state => {
          const widgets: Decoration[] = [];

          state.doc.descendants((node, pos) => {
            if (node.marks.some(mark => mark.type === linkSchema.type())) {
              // === headingSchema.type()) {
              //  if (hasMark(node.type, 'link')) {
              widgets.push(
                getAnchorWidget(pos + 1, {
                  id: node.attrs.id,
                  level: node.attrs.level,
                  side: -1
                })
              );
            }
          });

          return DecorationSet.create(state.doc, widgets);
        }
      }
    });
  });
};
