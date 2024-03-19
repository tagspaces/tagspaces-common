import { EditorView } from 'prosemirror-view';
import { linkSchema } from '@milkdown/preset-commonmark';

function hasURLProtocol(url: any) {
  // noinspection OverlyComplexBooleanExpressionJS
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('data:') ||
    url.startsWith('ts://?ts') ||
    url.startsWith('ts:?ts')
  );
}

export function handleClick(mode, ctx, view: EditorView, pos: number): boolean {
  // event.preventDefault();
  if (mode === 'preview') {
    const found = view.state.tr.doc.nodeAt(pos);
    if (found && found.marks.length > 0) {
      const mark = found.marks.find(
        ({ type }) => type === linkSchema.type(ctx)
      );
      const href = mark?.attrs.href;
      let path;
      if (hasURLProtocol(href)) {
        path = href;
      } else {
        path = encodeURIComponent(href);
      }
      window.parent.postMessage(
        JSON.stringify({
          command: 'openLinkExternally',
          link: path
        }),
        '*'
      );
      return true;
    }
  }
  return false;
}
