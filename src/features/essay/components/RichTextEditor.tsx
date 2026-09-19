import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import styles from './RichTextEditor.module.css'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  large?: boolean
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder,
  large = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: false,
        underline: false,
      }),
      Underline,
      Highlight,
      TextAlign.configure({ types: ['paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML())
    },
  })

  if (!editor) return null

  const locked = disabled || !editor.isEditable

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button
          type="button"
          data-active={editor.isActive('bold')}
          disabled={locked}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          加粗
        </button>
        <button
          type="button"
          data-active={editor.isActive('italic')}
          disabled={locked}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          斜体
        </button>
        <button
          type="button"
          data-active={editor.isActive('underline')}
          disabled={locked}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          下划线
        </button>
        <button
          type="button"
          data-active={editor.isActive('highlight')}
          disabled={locked}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          高亮
        </button>
        <button
          type="button"
          data-active={editor.isActive({ textAlign: 'left' })}
          disabled={locked}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          左对齐
        </button>
        <button
          type="button"
          data-active={editor.isActive({ textAlign: 'center' })}
          disabled={locked}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          居中
        </button>
        <button
          type="button"
          data-active={editor.isActive({ textAlign: 'right' })}
          disabled={locked}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          右对齐
        </button>
      </div>
      <EditorContent
        editor={editor}
        className={large ? `${styles.surface} ${styles.surfaceLarge}` : styles.surface}
      />
    </div>
  )
}
