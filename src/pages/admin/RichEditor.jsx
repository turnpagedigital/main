import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { NEON, FONT, INK, INK_60, LINE } from "../../data/tokens.js";

/* ── Toolbar button ─────────────────────────────────────────────────────── */
function Btn({ onClick, active, title, children, wide }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        fontWeight: active ? 800 : 600,
        padding: `0.22rem ${wide ? "0.6rem" : "0.35rem"}`,
        border: `1px solid ${active ? "#aaa" : "transparent"}`,
        background: active ? "#E5E7EB" : "transparent",
        borderRadius: 3,
        cursor: "pointer",
        color: active ? INK : INK_60,
        lineHeight: 1.4,
        minWidth: wide ? 32 : 26,
        textAlign: "center",
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <span style={{
      display: "inline-block", width: 1, height: 18,
      background: LINE, margin: "0 0.15rem", flexShrink: 0,
      alignSelf: "center",
    }} />
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function RichEditor({ value, onChange, disabled, minHeight = 420, placeholder: _placeholder }) {
  // Track the last value we pushed INTO the editor so we can avoid
  // an infinite loop when the parent syncs back the same string.
  const internalRef = useRef(value ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Markdown.configure({ transformPastedText: true, transformCopiedText: false }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown();
      internalRef.current = md;
      onChange(md);
    },
  });

  // Sync externally-changed value (e.g. loading a post from the API)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value !== internalRef.current) {
      internalRef.current = value ?? "";
      editor.commands.setContent(value || "", false);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep editable state in sync with disabled prop
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  function addLink() {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("URL:", prev);
    if (url === null) return; // cancelled
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }

  if (!editor) return null;

  const e = editor;

  return (
    <div style={{
      border: `1px solid ${LINE}`,
      borderRadius: 0,
      overflow: "hidden",
      opacity: disabled ? 0.65 : 1,
      pointerEvents: disabled ? "none" : "auto",
    }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.15rem",
        alignItems: "center", padding: "0.42rem 0.6rem",
        background: "#F4F5F7", borderBottom: `1px solid ${LINE}`,
      }}>

        {/* Text style */}
        <Btn onClick={() => e.chain().focus().toggleBold().run()}
          active={e.isActive("bold")} title="Bold (⌘B)">
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => e.chain().focus().toggleItalic().run()}
          active={e.isActive("italic")} title="Italic (⌘I)">
          <em style={{ fontStyle: "italic" }}>I</em>
        </Btn>
        <Btn onClick={() => e.chain().focus().toggleStrike().run()}
          active={e.isActive("strike")} title="Strikethrough">
          <s>S</s>
        </Btn>
        <Btn onClick={() => e.chain().focus().toggleCode().run()}
          active={e.isActive("code")} title="Inline code">
          <span style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>`c`</span>
        </Btn>

        <Sep />

        {/* Headings */}
        <Btn onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()}
          active={e.isActive("heading", { level: 1 })} title="Heading 1" wide>H1</Btn>
        <Btn onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
          active={e.isActive("heading", { level: 2 })} title="Heading 2" wide>H2</Btn>
        <Btn onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
          active={e.isActive("heading", { level: 3 })} title="Heading 3" wide>H3</Btn>

        <Sep />

        {/* Lists */}
        <Btn onClick={() => e.chain().focus().toggleBulletList().run()}
          active={e.isActive("bulletList")} title="Bullet list">
          ≡
        </Btn>
        <Btn onClick={() => e.chain().focus().toggleOrderedList().run()}
          active={e.isActive("orderedList")} title="Numbered list">
          1≡
        </Btn>

        <Sep />

        {/* Block elements */}
        <Btn onClick={() => e.chain().focus().toggleBlockquote().run()}
          active={e.isActive("blockquote")} title="Block quote">
          ❝
        </Btn>
        <Btn onClick={() => e.chain().focus().toggleCodeBlock().run()}
          active={e.isActive("codeBlock")} title="Code block">
          <span style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{`</>`}</span>
        </Btn>
        <Btn onClick={() => e.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule">
          —
        </Btn>

        <Sep />

        {/* Link */}
        <Btn onClick={addLink} active={e.isActive("link")} title="Insert / edit link">
          🔗
        </Btn>
        {e.isActive("link") && (
          <Btn onClick={() => e.chain().focus().unsetLink().run()} title="Remove link">
            ✂
          </Btn>
        )}

        <Sep />

        {/* History */}
        <Btn onClick={() => e.chain().focus().undo().run()} title="Undo (⌘Z)">↩</Btn>
        <Btn onClick={() => e.chain().focus().redo().run()} title="Redo (⌘⇧Z)">↪</Btn>
      </div>

      {/* ── Editable area ───────────────────────────────────────────────── */}
      <EditorContent
        editor={editor}
        onClick={() => !disabled && editor.commands.focus()}
      />

      {/* ── Scoped styles ───────────────────────────────────────────────── */}
      <style>{`
        .tiptap {
          padding: 1rem 1.15rem;
          min-height: ${minHeight}px;
          outline: none;
          font-family: ${FONT};
          font-size: 0.95rem;
          line-height: 1.72;
          color: ${INK};
          background: #fff;
          cursor: text;
        }
        .tiptap > * + * { margin-top: 0.85rem; }
        .tiptap p { margin: 0; }
        .tiptap h1 { font-size: 1.75rem; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; }
        .tiptap h2 { font-size: 1.3rem; font-weight: 800; line-height: 1.25; letter-spacing: -0.015em; padding-top: 1.25rem; border-top: 1px solid ${LINE}; }
        .tiptap h3 { font-size: 1.05rem; font-weight: 700; line-height: 1.3; }
        .tiptap strong { font-weight: 800; }
        .tiptap em { font-style: italic; }
        .tiptap s  { text-decoration: line-through; opacity: 0.6; }
        .tiptap code {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 0.85em;
          background: #F4F5F7;
          padding: 0.1em 0.35em;
          border-radius: 3px;
        }
        .tiptap pre {
          background: #1a1a1a;
          color: #e8e8e8;
          padding: 1rem 1.2rem;
          border-radius: 4px;
          overflow-x: auto;
        }
        .tiptap pre code { background: none; padding: 0; font-size: 0.88rem; color: inherit; }
        .tiptap blockquote {
          border-left: 4px solid ${NEON};
          background: rgba(212,255,0,0.06);
          padding: 0.75rem 1.2rem;
          border-radius: 0 4px 4px 0;
          font-weight: 600;
        }
        .tiptap ul { list-style: disc; padding-left: 1.6rem; }
        .tiptap ol { list-style: decimal; padding-left: 1.6rem; }
        .tiptap li + li { margin-top: 0.2rem; }
        .tiptap hr { border: none; border-top: 2px solid ${LINE}; }
        .tiptap a { color: #0055cc; text-decoration: underline; }
        .tiptap a:hover { color: #0033aa; }
        /* Placeholder */
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: ${INK_60};
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>
    </div>
  );
}
