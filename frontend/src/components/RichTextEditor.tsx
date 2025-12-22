import React, { useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Box, Paper, Stack, IconButton, Divider } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  Undo,
  Redo
} from '@mui/icons-material';
import { removeLinksFromPlaceholders } from '../utils/placeholders';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  onPlaceholderInsert?: (placeholder: string) => void;
}

export interface RichTextEditorRef {
  insertPlaceholder: (placeholder: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Beginnen Sie mit der Eingabe...',
  minHeight = 200,
  onPlaceholderInsert,
}, ref) => {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Deaktiviere Link komplett aus StarterKit
        link: false,
        // Deaktiviere underline aus StarterKit, da wir es separat hinzufügen
        underline: false,
      }),
      Underline,
    ],
    content: value ? removeLinksFromPlaceholders(value) : '',
    onUpdate: ({ editor }) => {
      let html = editor.getHTML();
      // Entferne Link-Formatierung von Platzhaltern beim Speichern
      html = removeLinksFromPlaceholders(html);
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
      },
      // Transformiere HTML beim Einfügen, um Links aus Platzhaltern zu entfernen
      transformPastedHTML: (html: string) => {
        return removeLinksFromPlaceholders(html);
      },
      // Verhindere automatische Link-Erkennung beim Tippen
      handleDOMEvents: {
        // Verhindere, dass der Browser automatisch Links erstellt
        beforeinput: (view, event) => {
          // Erlaube normales Input-Verhalten
          return false;
        },
      },
    },
  });

  // Drag & Drop Handler für Platzhalter
  React.useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const placeholder = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('text/html');
      
      if (placeholder && placeholder.includes('{{')) {
        // Setze Cursor-Position basierend auf Drop-Position
        const { view } = editor;
        const coordinates = view.posAtCoords({ left: e.clientX, top: e.clientY });
        
        if (coordinates) {
          editor.commands.setTextSelection(coordinates.pos);
          editor.commands.insertContent(placeholder);
          
          if (onPlaceholderInsert) {
            onPlaceholderInsert(placeholder);
          }
        } else {
          // Fallback: Einfügen an aktueller Position
          editor.commands.insertContent(placeholder);
          
          if (onPlaceholderInsert) {
            onPlaceholderInsert(placeholder);
          }
        }
      }
    };

    editorElement.addEventListener('dragover', handleDragOver);
    editorElement.addEventListener('drop', handleDrop);

    return () => {
      editorElement.removeEventListener('dragover', handleDragOver);
      editorElement.removeEventListener('drop', handleDrop);
    };
  }, [editor, onPlaceholderInsert]);

  // MutationObserver, um Links aus Platzhaltern zu entfernen
  React.useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    
    const cleanupLinks = () => {
      // Prüfe, ob es Links gibt, die Platzhalter enthalten
      const links = editorElement.querySelectorAll('a');
      let needsUpdate = false;
      
      links.forEach((link) => {
        const text = link.textContent || '';
        const href = link.getAttribute('href') || '';
        // Wenn der Link einen Platzhalter enthält (im Text oder href)
        if ((text.includes('{{') && text.includes('}}')) || (href.includes('{{') && href.includes('}}'))) {
          // Ersetze den Link durch seinen Textinhalt
          const parent = link.parentNode;
          if (parent) {
            const textNode = document.createTextNode(text);
            parent.replaceChild(textNode, link);
            needsUpdate = true;
          }
        }
      });
      
      // Wenn Links entfernt wurden, aktualisiere den Editor
      if (needsUpdate) {
        const html = editor.getHTML();
        const cleaned = removeLinksFromPlaceholders(html);
        if (cleaned !== html) {
          // Verwende requestAnimationFrame, um sicherzustellen, dass die DOM-Änderungen abgeschlossen sind
          requestAnimationFrame(() => {
            editor.commands.setContent(cleaned);
          });
        }
      }
    };
    
    const observer = new MutationObserver(() => {
      // Führe Cleanup mit einer kleinen Verzögerung aus, um Race Conditions zu vermeiden
      setTimeout(cleanupLinks, 10);
    });

    // Beobachte Änderungen im Editor
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    // Führe auch direkt nach dem Mount einen Cleanup durch
    cleanupLinks();

    return () => {
      observer.disconnect();
    };
  }, [editor]);

  React.useEffect(() => {
    if (editor) {
      // Entferne Link-Formatierung von Platzhaltern vor dem Setzen
      const cleanedValue = removeLinksFromPlaceholders(value || '');
      const currentHtml = editor.getHTML();
      
      // Nur aktualisieren, wenn sich der Inhalt wirklich geändert hat
      if (cleanedValue !== currentHtml) {
        editor.commands.setContent(cleanedValue);
      }
    }
  }, [value, editor]);

  // Expose insertPlaceholder method via ref
  useImperativeHandle(ref, () => ({
    insertPlaceholder: (placeholder: string) => {
      if (editor) {
        editor.chain().focus().insertContent(placeholder).run();
        if (onPlaceholderInsert) {
          onPlaceholderInsert(placeholder);
        }
      }
    },
  }), [editor, onPlaceholderInsert]);

  if (!editor) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        '& .rich-text-editor-content': {
          minHeight: `${minHeight}px`,
          padding: 2,
          outline: 'none',
          '& p': {
            margin: '0.5em 0',
          },
          '& ul, & ol': {
            paddingLeft: '1.5em',
            margin: '0.5em 0',
          },
          '& h1, & h2, & h3': {
            marginTop: '1em',
            marginBottom: '0.5em',
          },
        },
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          p: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          color={editor.isActive('bold') ? 'primary' : 'default'}
          title="Fett"
        >
          <FormatBold />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          color={editor.isActive('italic') ? 'primary' : 'default'}
          title="Kursiv"
        >
          <FormatItalic />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            if (editor.isActive('underline')) {
              editor.chain().focus().unsetUnderline().run();
            } else {
              editor.chain().focus().setUnderline().run();
            }
          }}
          color={editor.isActive('underline') ? 'primary' : 'default'}
          title="Unterstrichen"
        >
          <FormatUnderlined />
        </IconButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          color={editor.isActive('bulletList') ? 'primary' : 'default'}
          title="Aufzählung"
        >
          <FormatListBulleted />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          color={editor.isActive('orderedList') ? 'primary' : 'default'}
          title="Nummerierte Liste"
        >
          <FormatListNumbered />
        </IconButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Rückgängig"
        >
          <Undo />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Wiederholen"
        >
          <Redo />
        </IconButton>
      </Box>

      {/* Editor Content */}
      <Box
        sx={{
          '& .ProseMirror': {
            minHeight: `${minHeight}px`,
            padding: 2,
            outline: 'none',
            '& p.is-editor-empty:first-of-type::before': {
              content: `"${placeholder}"`,
              float: 'left',
              color: '#adb5bd',
              pointerEvents: 'none',
              height: 0,
            },
            // Stelle sicher, dass Platzhalter nicht als Links formatiert werden
            // Entferne Link-Formatierung für alle Links, die Platzhalter enthalten
            '& a': {
              // Prüfe, ob der Link einen Platzhalter enthält
              '&:has-text("{{")': {
                textDecoration: 'none !important',
                color: 'inherit !important',
                cursor: 'text !important',
                pointerEvents: 'none !important',
              },
            },
            // Zusätzliche CSS-Regel für Platzhalter in Links (falls :has-text nicht funktioniert)
            '& a[href*="{{"]': {
              textDecoration: 'none !important',
              color: 'inherit !important',
              cursor: 'text !important',
              pointerEvents: 'none !important',
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

