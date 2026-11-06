"use client";
import { SourcesContext } from "./area-sources";
import { sourceDecorations } from "@/lib/source-decorations";
import { quoteState } from "@/lib/source-model";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import {
  useState,
  useContext,
  createContext,
  useEffect,
  useRef,
  useId,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/react";
import { parseRichField } from "@/lib/rich-fields";
import {
  summaryFonts,
  summarySizes,
  summaryAlignments,
  parseSummary,
  safeLink,
  type SummaryDocument,
} from "@/lib/rich-summary";

type ActiveField = { id: string; label: string; editor: Editor };
const RichFieldsContext = createContext<{
  activate: (field: ActiveField) => void;
  validity: (id: string, valid: boolean) => void;
  remove: (id: string) => void;
} | null>(null);

export function RichFieldsScope({
  children,
  onValidity,
  enabled,
}: {
  children: ReactNode;
  onValidity: (valid: boolean) => void;
  enabled: boolean;
}) {
  const [active, setActive] = useState<ActiveField | null>(null);
  const invalid = useRef(new Set<string>());
  const validity = (id: string, valid: boolean) => {
    if (valid) invalid.current.delete(id);
    else invalid.current.add(id);
    onValidity(invalid.current.size === 0);
  };
  if (!enabled) return children;
  return (
    <RichFieldsContext.Provider
      value={{
        activate: setActive,
        validity,
        remove: (id) => {
          setActive((a) => (a?.id === id ? null : a));
          validity(id, true);
        },
      }}
    >
      <div
        className="rich-fields-scope"
        onFocusCapture={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.matches("input, textarea, select") &&
            !target.closest(".shared-rich-toolbar")
          )
            setActive(null);
        }}
      >
        <div className="shared-rich-toolbar">
          <p className="subtle" role="status">
            {active
              ? `Formatando: ${active.label}`
              : "Selecione um campo de texto para formatar."}
          </p>
          {active && !active.editor.isDestroyed && (
            <RichToolbar
              key={active.id}
              editor={active.editor}
              label="Formatação dos campos"
            />
          )}
        </div>
        {children}
      </div>
    </RichFieldsContext.Provider>
  );
}

export function RichSummaryEditor({
  initial,
  onChange,
  onValidity,
  label = "Resumo executivo",
  describedBy,
  field = false,
  sourceField,
}: {
  initial: SummaryDocument;
  onChange: (value: string) => void;
  onValidity: (valid: boolean) => void;
  label?: string;
  describedBy?: string;
  field?: boolean;
  sourceField?: string;
}) {
  const [error, setError] = useState("");
  const shared = useContext(RichFieldsContext);
  const id = useId();
  const sourcesContext = useContext(SourcesContext);
  const linked =
    sourcesContext?.sources.flatMap((s) =>
      s.links
        .filter(
          (l) =>
            l.area === sourcesContext.area &&
            (l.field === sourceField ||
              (sourceField === "document" && !!l.field)),
        )
        .map((l) => ({ ...l, name: s.name })),
    ) ?? [];
  const [selectionMessage, setSelectionMessage] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      sourceDecorations,
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
        "aria-label": label,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        "aria-multiline": "true",
        class: "summary-prose",
      },
    },
    onFocus: ({ editor }) => shared?.activate({ id, label, editor }),
    onUpdate: ({ editor }) => {
      const value = JSON.stringify(editor.getJSON());
      try {
        if (field) parseRichField(value);
        else parseSummary(value);
        onChange(value);
        onValidity(true);
        shared?.validity(id, true);
        setError("");
      } catch {
        onValidity(false);
        shared?.validity(id, false);
        setError(
          "O texto contém formatação não suportada ou excede o limite. Desfaça a última alteração ou cole como texto simples antes de salvar.",
        );
      }
    },
  });
  useEffect(
    () => () => {
      shared?.remove(id);
    },
    // Cleanup follows editor lifetime, not toolbar focus changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );
  useEffect(() => {
    if (editor && !editor.isDestroyed)
      editor.view.dispatch(
        editor.state.tr.setMeta(
          "privateSources",
          sourcesContext?.sources.flatMap((s) =>
            s.links
              .filter(
                (l) =>
                  l.area === sourcesContext.area &&
                  (l.field === sourceField ||
                    (sourceField === "document" && !!l.field)),
              )
              .map((l) => ({ id: l.source_id, quote: l.quote })),
          ) ?? [],
        ),
      );
  }, [editor, sourcesContext?.sources, sourcesContext?.area, sourceField]);
  if (!editor) return <p>Carregando editor…</p>;
  return (
    <div
      className="summary-editor"
      onClick={(event) => {
        const target = (event.target as HTMLElement).closest(
          "[data-source-id]",
        );
        if (target)
          sourcesContext?.open(
            undefined,
            target.getAttribute("data-source-id")!,
          );
      }}
    >
      {!shared && (
        <RichToolbar editor={editor} label="Formatação do documento" />
      )}
      {error && <p role="alert">{error}</p>}
      {sourceField && sourcesContext && (
        <div className="source-field-actions">
          <button
            type="button"
            className="source-link-button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const { from, to } = editor.state.selection;
              const quote = editor.state.doc.textBetween(from, to, "\n").trim();
              if (!quote || quote.length > 2000) {
                setSelectionMessage(
                  "Selecione uma frase ou parágrafo de até 2.000 caracteres.",
                );
                return;
              }
              setSelectionMessage("");
              sourcesContext.open({ field: sourceField, quote });
            }}
          >
            Vincular fonte
          </button>
          {selectionMessage && <span role="status">{selectionMessage}</span>}
        </div>
      )}
      <EditorContent editor={editor} />
      {linked.length > 0 && (
        <div className="source-field-links" aria-label="Fontes deste campo">
          {linked.map((l) => (
            <button
              type="button"
              key={l.id}
              onClick={() => sourcesContext?.open(undefined, l.source_id)}
            >
              Fonte: {l.name} ·{" "}
              {quoteState(
                editor.state.doc.textBetween(
                  0,
                  editor.state.doc.content.size,
                  "\n",
                ),
                l.quote,
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function RichToolbar({ editor, label }: { editor: Editor; label: string }) {
  const [error, setError] = useState("");
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
  if (!state) return null;
  return (
    <>
      <div className="summary-toolbar" role="group" aria-label={label}>
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
    </>
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
