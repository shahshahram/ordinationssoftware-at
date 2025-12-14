import React from 'react';
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

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Beginnen Sie mit der Eingabe...',
  minHeight = 200
}) => {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

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
            '& p.is-editor-empty:first-child::before': {
              content: `"${placeholder}"`,
              float: 'left',
              color: '#adb5bd',
              pointerEvents: 'none',
              height: 0,
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
};

export default RichTextEditor;

