import { useEffect, useRef } from "react"
import {
  EditorView,
  lineNumbers,
  keymap,
  placeholder as cmPlaceholder,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  MatchDecorator,
  ViewPlugin,
  Decoration,
  ViewUpdate,
} from "@codemirror/view"
import type { DecorationSet } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands"

// ── Template variable highlighters ────────────────────────────────────────────
// Two placeholder dialects live in the app: prompts written on the Prompts page
// use {{variable}}, while LLM-as-Judge prompts use Python string.Template
// ($variable / ${variable}). Callers pick which one to highlight so a literal
// "$" in a completion prompt is not painted as a placeholder.

function highlighterFor(matcher: MatchDecorator) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = matcher.createDeco(view)
      }
      update(update: ViewUpdate) {
        this.decorations = matcher.updateDeco(update, this.decorations)
      }
    },
    { decorations: (v) => v.decorations },
  )
}

const bracesHighlighter = highlighterFor(
  new MatchDecorator({
    regexp: /\{\{[^}]+\}\}/g,
    decoration: Decoration.mark({ class: "cm-template-var" }),
  }),
)

// The braced form is listed first so ${var} is matched whole. An identifier must
// follow the "$", which keeps prices such as "$100" unhighlighted.
const dollarHighlighter = highlighterFor(
  new MatchDecorator({
    regexp: /\$\{[A-Za-z_]\w*\}|\$[A-Za-z_]\w*/g,
    decoration: Decoration.mark({ class: "cm-template-var" }),
  }),
)

// ── Theme ─────────────────────────────────────────────────────────────────────

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    fontSize: "14px",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    overflow: "auto",
    height: "100%",
  },
  ".cm-content": {
    padding: "14px 0",
    caretColor: "var(--foreground)",
  },
  ".cm-line": {
    padding: "0 18px",
    lineHeight: "1.7",
  },
  ".cm-gutters": {
    backgroundColor: "var(--muted)",
    borderRight: "1px solid var(--border)",
    color: "var(--muted-foreground)",
    userSelect: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 8px",
    minWidth: "42px",
    textAlign: "right",
    fontSize: "11px",
    opacity: "0.55",
  },
  ".cm-lineNumbers .cm-activeLineGutter": {
    opacity: "1",
    color: "var(--foreground)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--primary) 3%, transparent)",
  },
  ".cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--foreground)",
    borderLeftWidth: "2px",
  },
  ".cm-selectionBackground": {
    background: "color-mix(in srgb, var(--primary) 14%, transparent)",
  },
  "&.cm-focused .cm-selectionBackground": {
    background: "color-mix(in srgb, var(--primary) 20%, transparent)",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
    opacity: "0.4",
    fontStyle: "normal",
  },
  ".cm-template-var": {
    color: "var(--fluiq-var-color, #2563eb)",
    fontWeight: "600",
  },
})

// ── Component ─────────────────────────────────────────────────────────────────

interface PromptEditorProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  /**
   * Which placeholder dialect to highlight. `"braces"` (default) highlights
   * `{{variable}}`; `"dollar"` highlights `$variable` and `${variable}`, which
   * is what judge prompts and custom scorers use; `"both"` highlights either.
   */
  /** Which placeholder dialect to paint. "none" for bodies that have no
   *  placeholders at all — a code scorer's `{` is a dict, not a variable. */
  varSyntax?: "braces" | "dollar" | "both" | "none"
}

export function PromptEditor({
  value,
  onChange,
  placeholder,
  className,
  varSyntax = "braces",
}: PromptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      lineNumbers(),
      history(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      EditorView.lineWrapping,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      ...(varSyntax === "dollar" ? [dollarHighlighter] : []),
      ...(varSyntax === "braces" ? [bracesHighlighter] : []),
      ...(varSyntax === "both" ? [bracesHighlighter, dollarHighlighter] : []),
      editorTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
    ]

    if (placeholder) {
      extensions.push(cmPlaceholder(placeholder))
    }

    viewRef.current = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full${className ? ` ${className}` : ""}`}
    />
  )
}
