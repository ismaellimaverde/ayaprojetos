import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";
// Separate view-only annotations: never inserted into persisted JSON or exported HTML.
export function textPositions(doc: Node) {
  let text = "";
  const positions: number[] = [];
  doc.forEach((block, offset, index) => {
    if (index) {
      text += "\n";
      positions.push(offset);
    }
    block.descendants((node, pos) => {
      if (node.isText) {
        for (let i = 0; i < (node.text?.length ?? 0); i++) {
          text += node.text![i];
          positions.push(offset + 1 + pos + i);
        }
      } else if (node.type.name === "hardBreak") {
        text += "\n";
        positions.push(offset + 1 + pos);
      }
    });
  });
  return { text, positions };
}
const key = new PluginKey<{ id: string; quote: string }[]>("privateSources");
export const sourceDecorations = Extension.create({
  name: "privateSourceAnnotations",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: () => [],
          apply: (tr, old) => tr.getMeta("privateSources") ?? old,
        },
        props: {
          decorations(state) {
            const { text, positions } = textPositions(state.doc);
            const marks: Decoration[] = [];
            for (const l of key.getState(state) ?? []) {
              const at = text.indexOf(l.quote);
              if (at >= 0 && l.quote && text.indexOf(l.quote, at + 1) < 0)
                marks.push(
                  Decoration.inline(
                    positions[at],
                    positions[at + l.quote.length - 1] + 1,
                    {
                      class: "source-annotation",
                      "data-source-id": l.id,
                      title: "Fonte interna — consultar",
                    },
                  ),
                );
            }
            return DecorationSet.create(state.doc, marks);
          },
        },
      }),
    ];
  },
});
