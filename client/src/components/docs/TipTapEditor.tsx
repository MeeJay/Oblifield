import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link as LinkIcon,
  ImageIcon,
  Code2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import './editor.css';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
}

export function TipTapEditor({ content, onChange, editable = true, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: !editable,
        HTMLAttributes: { class: 'tiptap-link' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'tiptap-image' },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Commencez a ecrire...',
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const url = prompt('URL du lien :');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = prompt('URL de l\'image :');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const btnClass = (active: boolean) =>
    cn(
      'p-1.5 rounded transition-colors',
      active
        ? 'bg-accent/20 text-accent'
        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
    );

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-bg-tertiary px-2 py-1.5">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Gras">
            <Bold size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italique">
            <Italic size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Barre">
            <Strikethrough size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="Code inline">
            <Code size={14} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="Titre 1">
            <Heading1 size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Titre 2">
            <Heading2 size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="Titre 3">
            <Heading3 size={14} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Liste a puces">
            <List size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Liste numerotee">
            <ListOrdered size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Citation">
            <Quote size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btnClass(editor.isActive('codeBlock'))} title="Bloc de code">
            <Code2 size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass(false)} title="Ligne horizontale">
            <Minus size={14} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <button type="button" onClick={addLink} className={btnClass(editor.isActive('link'))} title="Lien">
            <LinkIcon size={14} />
          </button>
          <button type="button" onClick={addImage} className={btnClass(false)} title="Image">
            <ImageIcon size={14} />
          </button>

          <div className="flex-1" />

          <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={cn(btnClass(false), 'disabled:opacity-30')} title="Annuler">
            <Undo size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={cn(btnClass(false), 'disabled:opacity-30')} title="Refaire">
            <Redo size={14} />
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="tiptap-editor-content" />
    </div>
  );
}
