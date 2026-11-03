"use client";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import { useState, type ReactNode } from "react";
import {
  summaryFonts,
  parseSummary,
  safeLink,
  type SummaryDocument,
} from "@/lib/rich-summary";

export function RichSummaryEditor({
  initial,
  onChange,
  onValidity,
}: {
  initial: SummaryDocument;
  onChange: (value: string) => void;
  onValidity: (valid: boolean) => void;
}) {
  const [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1] },
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: false, isAllowedUri: safeLink },
      }),
      TextStyle,
      FontFamily,
    ],
    content: initial,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Resumo executivo",
        "aria-multiline": "true",
        class: "summary-prose",
      },
    },
    onUpdate: ({ editor }) => {
      const value = JSON.stringify(editor.getJSON());
      try {
        parseSummary(value);
        onChange(value);
        onValidity(true);
        setError("");
      } catch {
        onValidity(false);
        setError(
          "O texto contém formatação não suportada ou excede o limite. Desfaça a última alteração ou cole como texto simples antes de salvar.",
        );
      }
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      heading: editor?.isActive("heading") ?? false,
      font: editor?.getAttributes("textStyle").fontFamily ?? "Arial",
    }),
  });
  if (!editor || !state) return <p>Carregando editor…</p>;
  return (
    <div className="summary-editor">
      <div
        className="summary-toolbar"
        role="group"
        aria-label="Formatação do resumo"
      >
        <label>
          Fonte
          <select
            aria-label="Fonte"
            value={state.font}
            onChange={(e) =>
              editor.chain().focus().setFontFamily(e.target.value).run()
            }
          >
            {summaryFonts.map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-label="Negrito"
          aria-pressed={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          aria-label="Itálico"
          aria-pressed={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          aria-label="Título H1"
          aria-pressed={state.heading}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => {
            const href = prompt(
              "Link completo (https://, http:// ou mailto:). Deixe vazio para remover.",
              editor.getAttributes("link").href ?? "",
            );
            if (href === null) return;
            if (!href) {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              setError("");
              return;
            }
            if (!safeLink(href)) {
              setError("Use um link válido com https://, http:// ou mailto:.");
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href })
              .run();
            setError("");
          }}
        >
          Link
        </button>
        <button
          type="button"
          aria-label="Desfazer"
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="Refazer"
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <EditorContent editor={editor} />
    </div>
  );
}
export function SummaryView({ value }: { value: SummaryDocument }) {
  return (
    <div className="summary-prose">
      {value.content.map((block, i) => {
        const content = block.content?.map((node, j) => {
          if (node.type === "hardBreak") return <br key={j} />;
          let text: ReactNode = node.text;
          for (const mark of node.marks ?? []) {
            if (mark.type === "bold") text = <strong>{text}</strong>;
            if (mark.type === "italic") text = <em>{text}</em>;
            if (mark.type === "textStyle")
              text = (
                <span style={{ fontFamily: mark.attrs.fontFamily }}>
                  {text}
                </span>
              );
            if (mark.type === "link")
              text = (
                <a
                  href={mark.attrs.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text}
                </a>
              );
          }
          return <span key={j}>{text}</span>;
        });
        return block.type === "heading" ? (
          <h1 key={i}>{content}</h1>
        ) : (
          <p key={i}>{content?.length ? content : <br />}</p>
        );
      })}
    </div>
  );
}
