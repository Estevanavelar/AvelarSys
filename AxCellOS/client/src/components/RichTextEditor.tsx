import React, { useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  RemoveFormatting,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadImageFile } from '@/lib/storage';
import { cn } from '@/lib/utils';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Se false, esconde a barra de ferramentas (só área de edição). */
  showToolbar?: boolean;
  disabled?: boolean;
}

const TOOLBAR_BUTTON_CLASS =
  'h-9 w-9 p-0 rounded-lg border border-border/60 bg-background hover:bg-muted transition-colors';

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  className,
  minHeight = 'min-h-[280px]',
  showToolbar = true,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const notifyChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value ?? undefined);
    editorRef.current?.focus();
    notifyChange();
  }, [notifyChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      if (html) {
        e.preventDefault();
        document.execCommand('insertHTML', false, html);
        notifyChange();
      } else if (text) {
        e.preventDefault();
        document.execCommand('insertText', false, text);
        notifyChange();
      }
    },
    [notifyChange]
  );

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const url = await uploadImageFile(file, 'terms');
        exec('insertImage', url);
      } catch (err) {
        console.error(err);
      }
    };
    input.click();
  }, [exec]);

  return (
    <div className={cn('rounded-xl border border-border bg-background overflow-hidden', className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => exec('bold')}
            title="Negrito"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => exec('italic')}
            title="Itálico"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => exec('underline')}
            title="Sublinhado"
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>
          <span className="w-px h-6 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => exec('insertUnorderedList')}
            title="Lista com marcadores"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => exec('insertOrderedList')}
            title="Lista numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <span className="w-px h-6 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => {
              const url = window.prompt('URL do link:', 'https://');
              if (url) exec('createLink', url);
            }}
            title="Inserir link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={handleImageUpload}
            title="Inserir imagem"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <span className="w-px h-6 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => exec('removeFormat')}
            title="Remover formatação"
          >
            <RemoveFormatting className="w-4 h-4" />
          </Button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        data-placeholder={placeholder}
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none p-4 outline-none overflow-y-auto',
          minHeight,
          '[&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-muted-foreground'
        )}
        onInput={notifyChange}
        onBlur={notifyChange}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />
    </div>
  );
}
