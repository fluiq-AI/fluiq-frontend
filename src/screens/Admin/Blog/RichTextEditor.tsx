import { useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { TableKit } from "@tiptap/extension-table"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  TextBoldIcon,
  TextItalicIcon,
  Heading01Icon,
  Heading02Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  QuoteDownIcon,
  CodeIcon,
  Link01Icon,
  Unlink01Icon,
  Image01Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  Loading03Icon,
  TableIcon,
  ColumnInsertIcon,
  ColumnDeleteIcon,
  RowInsertIcon,
  RowDeleteIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { adminUploadMedia, mediaUrl } from "@/lib/blog"
import "@/styles/blog.css"

interface Props {
  value: string
  onChange: (html: string) => void
  onUploadError?: (message: string) => void
}

export function RichTextEditor({ value, onChange, onUploadError }: Props) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Placeholder.configure({ placeholder: "Write your post…" }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "blog-content min-h-[420px] px-5 py-4 focus:outline-none",
      },
    },
  })

  // Sync external value changes (e.g., when an existing post finishes loading).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) return null

  function setLink() {
    const previous = editor!.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previous ?? "https://")
    if (url === null) return
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  async function handleImageFile(file: File) {
    setUploading(true)
    try {
      const { url } = await adminUploadMedia(file)
      editor!.chain().focus().setImage({ src: mediaUrl(url) }).run()
    } catch (err) {
      onUploadError?.(err instanceof Error ? err.message : "Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="overflow-clip rounded-lg border border-border/60 bg-background">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/95 px-2 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
        <ToolbarButton icon={TextBoldIcon} title="Bold"
          active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton icon={TextItalicIcon} title="Italic"
          active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Divider />
        <ToolbarButton icon={Heading01Icon} title="Heading 2"
          active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolbarButton icon={Heading02Icon} title="Heading 3"
          active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Divider />
        <ToolbarButton icon={LeftToRightListBulletIcon} title="Bullet list"
          active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton icon={LeftToRightListNumberIcon} title="Numbered list"
          active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolbarButton icon={QuoteDownIcon} title="Quote"
          active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolbarButton icon={CodeIcon} title="Code block"
          active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <Divider />
        <ToolbarButton icon={Link01Icon} title="Add link"
          active={editor.isActive("link")} onClick={setLink} />
        <ToolbarButton icon={Unlink01Icon} title="Remove link"
          onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")} />
        <ToolbarButton
          icon={uploading ? Loading03Icon : Image01Icon}
          title="Insert image"
          spin={uploading}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        />
        <Divider />
        <ToolbarButton icon={ArrowTurnBackwardIcon} title="Undo"
          onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
        <ToolbarButton icon={ArrowTurnForwardIcon} title="Redo"
          onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />

        <Divider />
        <ToolbarButton icon={TableIcon} title="Insert table"
          active={editor.isActive("table")}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        {editor.isActive("table") && (
          <>
            <ToolbarButton icon={ColumnInsertIcon} title="Add column"
              onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <ToolbarButton icon={ColumnDeleteIcon} title="Delete column"
              onClick={() => editor.chain().focus().deleteColumn().run()} />
            <ToolbarButton icon={RowInsertIcon} title="Add row"
              onClick={() => editor.chain().focus().addRowAfter().run()} />
            <ToolbarButton icon={RowDeleteIcon} title="Delete row"
              onClick={() => editor.chain().focus().deleteRow().run()} />
            <ToolbarButton icon={Delete02Icon} title="Delete table"
              onClick={() => editor.chain().focus().deleteTable().run()} />
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageFile(file)
            e.target.value = ""
          }}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  icon, title, onClick, active, disabled, spin,
}: {
  icon: typeof TextBoldIcon
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  spin?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors",
        active ? "bg-[#EEF3FD] text-[#1860D3] dark:bg-[#1A2A4A]/40 dark:text-[#6FA8FF]"
               : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      <HugeiconsIcon icon={icon} size={16} className={cn(spin && "animate-spin")} />
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border/70" aria-hidden />
}
