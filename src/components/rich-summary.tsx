"use client";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import { useState, type ReactNode } from "react";
import {
  summaryFonts,
  summarySizes,
  summaryAlignments,
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
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: false, isAllowedUri: safeLink },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
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
      underline: editor?.isActive("underline") ?? false,
      strike: editor?.isActive("strike") ?? false,
      level: editor?.getAttributes("heading").level ?? 0,
      align:
        editor?.getAttributes("paragraph").textAlign ??
        editor?.getAttributes("heading").textAlign ??
        "left",
      size: editor?.getAttributes("textStyle").fontSize ?? "16px",
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
        <label>
          Tamanho
          <select
            aria-label="Tamanho da fonte"
            value={state.size}
            onChange={(e) =>
              editor.chain().focus().setFontSize(e.target.value).run()
            }
          >
            {summarySizes.map((size) => (
              <option key={size} value={size}>
                {size.replace("px", " px")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estilo
          <select
            aria-label="Estilo do parágrafo"
            value={state.level}
            onChange={(e) => {
              const level = Number(e.target.value);
              if (level)
                editor
                  .chain()
                  .focus()
                  .setHeading({ level: level as 1 | 2 | 3 })
                  .run();
              else editor.chain().focus().setParagraph().run();
            }}
          >
            <option value={0}>Texto normal</option>
            <option value={1}>Título 1</option>
            <option value={2}>Título 2</option>
            <option value={3}>Título 3</option>
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
          aria-label="Sublinhado"
          aria-pressed={state.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          aria-label="Tachado"
          aria-pressed={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </button>
        <label>
          Alinhamento
          <select
            aria-label="Alinhamento"
            value={state.align}
            onChange={(e) =>
              editor.chain().focus().setTextAlign(e.target.value).run()
            }
          >
            {summaryAlignments.map((align, i) => (
              <option key={align} value={align}>
                {["Esquerda", "Centro", "Direita", "Justificado"][i]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetAllMarks()
              .setParagraph()
              .unsetTextAlign()
              .run()
          }
        >
          Limpar formatação
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
    <div
      className="summary-prose"
      tabIndex={0}
      role="region"
      aria-label="Conteúdo do documento"
    >
      {value.content.map((block, i) => {
        const content = block.content?.map((node, j) => {
          if (node.type === "hardBreak") return <br key={j} />;
          let text: ReactNode = node.text;
          for (const mark of node.marks ?? []) {
            if (mark.type === "bold") text = <strong>{text}</strong>;
            if (mark.type === "italic") text = <em>{text}</em>;
            if (mark.type === "underline") text = <u>{text}</u>;
            if (mark.type === "strike") text = <s>{text}</s>;
            if (mark.type === "textStyle")
              text = (
                <span
                  style={{
                    fontFamily: mark.attrs.fontFamily ?? undefined,
                    fontSize: mark.attrs.fontSize ?? undefined,
                  }}
                >
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
        const style = { textAlign: block.attrs?.textAlign ?? undefined };
        if (block.type === "heading") {
          if (block.attrs.level === 2)
            return (
              <h2 key={i} style={style}>
                {content}
              </h2>
            );
          if (block.attrs.level === 3)
            return (
              <h3 key={i} style={style}>
                {content}
              </h3>
            );
          return (
            <h1 key={i} style={style}>
              {content}
            </h1>
          );
        }
        return (
          <p key={i} style={style}>
            {content?.length ? content : <br />}
          </p>
        );
      })}
    </div>
  );
}
