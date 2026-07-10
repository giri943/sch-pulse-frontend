"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent, ReactRenderer, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { UserLite } from "@/lib/types";

/** Collect the unique user ids of every @-mention currently in the document. */
function collectMentionIds(editor: Editor): string[] {
  const ids: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "mention" && node.attrs.id) ids.push(String(node.attrs.id));
  });
  return [...new Set(ids)];
}

// ── @-mention suggestion dropdown ──────────────────────────────────────────
interface ListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<ListRef, SuggestionProps<UserLite>>((props, ref) => {
  const [index, setIndex] = useState(0);
  const items = props.items;

  useEffect(() => setIndex(0), [items]);

  const select = (i: number) => {
    const item = items[i];
    if (item) props.command({ id: item.id, label: item.name } as never);
  };

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (!items.length) return false;
        if (event.key === "ArrowUp") {
          setIndex((index + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setIndex((index + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          select(index);
          return true;
        }
        return false;
      },
    }),
    [index, items],
  );

  if (!items.length) return null;
  return (
    <div className="max-h-56 w-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
      {items.map((u, i) => (
        <button
          key={u.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            select(i);
          }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
            i === index ? "bg-brand/15 text-brand" : "hover:bg-surface-2",
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">{u.name}</span>
            <span className="ml-1.5 text-[11px] text-muted">{u.email}</span>
          </span>
        </button>
      ))}
    </div>
  );
});
MentionList.displayName = "MentionList";

const mentionSuggestion = {
  items: async ({ query }: { query: string }): Promise<UserLite[]> => {
    try {
      const users = await apiFetch<UserLite[]>(`/users/search?q=${encodeURIComponent(query)}`);
      return users.slice(0, 8);
    } catch {
      return [];
    }
  },
  render: () => {
    let component: ReactRenderer<ListRef, SuggestionProps<UserLite>> | null = null;
    let popup: HTMLDivElement | null = null;

    const place = (clientRect?: (() => DOMRect | null) | null) => {
      if (!popup || !clientRect) return;
      const rect = clientRect();
      if (!rect) return;
      popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
      popup.style.left = `${rect.left + window.scrollX}px`;
    };

    return {
      onStart: (props: SuggestionProps<UserLite>) => {
        component = new ReactRenderer(MentionList, { props, editor: props.editor });
        popup = document.createElement("div");
        popup.style.position = "absolute";
        popup.style.zIndex = "60";
        popup.appendChild(component.element);
        document.body.appendChild(popup);
        place(props.clientRect);
      },
      onUpdate: (props: SuggestionProps<UserLite>) => {
        component?.updateProps(props);
        place(props.clientRect);
      },
      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === "Escape") return true;
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup?.remove();
        component?.destroy();
        popup = null;
        component = null;
      },
    };
  },
};

// ── Editor ──────────────────────────────────────────────────────────────────
/**
 * Rich-text editor for incident notes with Jira-style formatting and @-mentions.
 * Emits the HTML plus the list of mentioned user ids (so the caller can notify
 * newly-tagged people). Controlled by `value`; syncs external changes only while
 * unfocused so it never clobbers in-progress typing.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  editable = true,
  className,
}: {
  value: string;
  onChange: (html: string, mentionIds: string[]) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}) {
  const editor = useEditor({
    editable,
    immediatelyRender: false, // Next.js App Router: avoid SSR hydration mismatch
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Mention.configure({
        HTMLAttributes: { class: "rounded bg-brand/15 px-1 py-0.5 font-medium text-brand" },
        suggestion: mentionSuggestion,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "pulse-editor min-h-[96px] px-3 py-2 text-sm leading-relaxed outline-none" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), collectMentionIds(editor)),
  });

  // Sync external value changes (e.g. after a save refetch) without stealing the
  // caret from someone mid-edit.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  const showPlaceholder = !!placeholder && !!editor?.isEmpty;

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-bg transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
        className,
      )}
    >
      {editable && editor && <Toolbar editor={editor} />}
      <div className="relative">
        {showPlaceholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted/60">{placeholder}</span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────
const TEXT_COLORS = ["#e5484d", "#d97706", "#2da44e", "#3b82f6", "#8b5cf6", "#111827"];
const HIGHLIGHTS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#e9d5ff"];
const EMOJIS = ["😀", "😅", "🙌", "👍", "🎉", "🔥", "🚀", "✅", "❌", "⚠️", "🐛", "💡", "📝", "👀", "🙏", "💥", "⏰", "🔧", "📈", "📉", "❤️", "😢", "🤔", "🚨"];

function Toolbar({ editor }: { editor: Editor }) {
  const inTable = editor.isActive("table");
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
      {/* Text style */}
      <StyleDropdown editor={editor} />
      <Divider />

      {/* Marks */}
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </Btn>
      <Btn label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="underline">U</span>
      </Btn>
      <Btn label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </Btn>
      <Btn label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <span className="font-mono text-[11px]">{"</>"}</span>
      </Btn>
      <Divider />

      {/* Color + highlight */}
      <ColorDropdown editor={editor} />
      <Divider />

      {/* Lists */}
      <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <BulletIcon />
      </Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <span className="text-[10px] font-semibold leading-none">1.</span>
      </Btn>
      <Btn label="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <CheckIcon />
      </Btn>
      <Divider />

      {/* Blocks */}
      <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <span className="text-[15px] leading-none">&ldquo;</span>
      </Btn>
      <Btn label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <span className="font-mono text-[10px] leading-none">{"{ }"}</span>
      </Btn>
      <Btn label="Divider" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <span className="text-sm leading-none">―</span>
      </Btn>
      <Divider />

      {/* Insert */}
      <LinkButton editor={editor} />
      <UrlButton label="Image (URL)" onSubmit={(url) => editor.chain().focus().setImage({ src: url }).run()}>
        <ImageIcon />
      </UrlButton>
      <Btn label="Insert table" active={false} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon />
      </Btn>
      <EmojiDropdown editor={editor} />
      <Divider />

      {/* History */}
      <Btn label="Undo" active={false} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <UndoIcon />
      </Btn>
      <Btn label="Redo" active={false} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <RedoIcon />
      </Btn>

      {/* Contextual table controls */}
      {inTable && (
        <>
          <Divider />
          <Btn label="Add row" active={false} onClick={() => editor.chain().focus().addRowAfter().run()}>
            <span className="text-[10px] leading-none">+Row</span>
          </Btn>
          <Btn label="Add column" active={false} onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <span className="text-[10px] leading-none">+Col</span>
          </Btn>
          <Btn label="Delete table" active={false} onClick={() => editor.chain().focus().deleteTable().run()}>
            <span className="text-[10px] leading-none text-down">✕Tbl</span>
          </Btn>
        </>
      )}

      <span className="ml-auto hidden pr-1 text-[10px] text-muted/70 sm:block">Type @ to mention</span>
    </div>
  );
}

function Btn({
  label,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-sm transition-colors disabled:opacity-40",
        active ? "bg-brand/15 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-border" />;
}

/** A click-away popover anchored under its trigger. */
function Popover({
  label,
  trigger,
  children,
}: {
  label: string;
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-7 min-w-[28px] items-center justify-center gap-0.5 rounded px-1.5 text-sm transition-colors",
          open ? "bg-brand/15 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        {trigger}
        <Chevron />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface p-1 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function StyleDropdown({ editor }: { editor: Editor }) {
  const items: { label: string; active: boolean; run: () => void }[] = [
    { label: "Paragraph", active: editor.isActive("paragraph"), run: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 1", active: editor.isActive("heading", { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  ];
  return (
    <Popover label="Text style" trigger={<span className="text-[13px] font-semibold">T</span>}>
      {(close) => (
        <div className="w-36">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                it.run();
                close();
              }}
              className={cn(
                "block w-full rounded px-2 py-1.5 text-left text-sm transition-colors",
                it.active ? "bg-brand/15 text-brand" : "hover:bg-surface-2",
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function ColorDropdown({ editor }: { editor: Editor }) {
  return (
    <Popover label="Color & highlight" trigger={<span className="text-[13px] font-semibold underline decoration-2">A</span>}>
      {(close) => (
        <div className="w-48 p-1">
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Text</div>
          <div className="flex flex-wrap gap-1 px-1">
            {TEXT_COLORS.map((c) => (
              <Swatch key={c} color={c} onClick={() => { editor.chain().focus().setColor(c).run(); close(); }} />
            ))}
            <ClearSwatch onClick={() => { editor.chain().focus().unsetColor().run(); close(); }} />
          </div>
          <div className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Highlight</div>
          <div className="flex flex-wrap gap-1 px-1 pb-1">
            {HIGHLIGHTS.map((c) => (
              <Swatch key={c} color={c} onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); close(); }} />
            ))}
            <ClearSwatch onClick={() => { editor.chain().focus().unsetHighlight().run(); close(); }} />
          </div>
        </div>
      )}
    </Popover>
  );
}

function Swatch({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-5 w-5 rounded border border-border transition-transform hover:scale-110"
      style={{ backgroundColor: color }}
    />
  );
}

function ClearSwatch({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Clear"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded border border-border text-[10px] text-muted hover:bg-surface-2"
    >
      ✕
    </button>
  );
}

function EmojiDropdown({ editor }: { editor: Editor }) {
  return (
    <Popover label="Emoji" trigger={<span className="text-[13px] leading-none">🙂</span>}>
      {(close) => (
        <div className="grid w-56 grid-cols-8 gap-0.5 p-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                editor.chain().focus().insertContent(e).run();
                close();
              }}
              className="rounded p-1 text-base hover:bg-surface-2"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

/** Link: shows the current href for editing, applies or removes it. */
function LinkButton({ editor }: { editor: Editor }) {
  return (
    <UrlButton
      label="Link"
      active={editor.isActive("link")}
      initial={editor.getAttributes("link").href ?? ""}
      onSubmit={(url) => {
        if (!url) editor.chain().focus().unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }}
    >
      <LinkIcon />
    </UrlButton>
  );
}

/** A toolbar button that opens a small URL input popover (used for links + images). */
function UrlButton({
  label,
  active = false,
  initial = "",
  onSubmit,
  children,
}: {
  label: string;
  active?: boolean;
  initial?: string;
  onSubmit: (url: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setUrl(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const submit = () => {
    onSubmit(url.trim());
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-sm transition-colors",
          active || open ? "bg-brand/15 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        {children}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-64 items-center gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submit(); }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 text-sm outline-none focus:border-brand"
          />
          <button type="button" onClick={submit} className="rounded bg-brand px-2 py-1 text-xs font-medium text-white">
            {label.startsWith("Link") ? "Apply" : "Insert"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tiny inline icons ───────────────────────────────────────────────────────
const S = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Chevron = () => (<svg {...S} width={11} height={11}><path d="M6 9l6 6 6-6" /></svg>);
const BulletIcon = () => (<svg {...S}><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>);
const CheckIcon = () => (<svg {...S}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>);
const LinkIcon = () => (<svg {...S}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>);
const ImageIcon = () => (<svg {...S}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>);
const TableIcon = () => (<svg {...S}><rect x="3" y="3" width="18" height="18" rx="1" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>);
const UndoIcon = () => (<svg {...S}><path d="M3 7v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></svg>);
const RedoIcon = () => (<svg {...S}><path d="M21 7v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 8" /></svg>);
