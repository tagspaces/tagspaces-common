import { slash } from "./config";
import { Slash } from "./Slash";
import { Ctx } from "@milkdown/ctx";
import { usePluginViewFactory } from "@prosemirror-adapter/react";

const inspectKeys = ["ArrowDown", "ArrowUp", "Enter"];

export const useSlash = () => {
  const pluginViewFactory = usePluginViewFactory();
  return {
    plugins: slash,
    config: (ctx: Ctx) => {
      ctx.set(slash.key, {
        props: {
          handleKeyDown: (view, event) => {
            if (!ctx.get(slash.key).opened) {
              return false;
            }
            return inspectKeys.includes(event.key);
          },
        },
        view: pluginViewFactory({
          component: Slash,
        }),
        opened: false,
      });
    },
  };
};
