import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Toolbar,
  Divider,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Save,
  Preview,
  Download,
  History,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  InsertPhoto,
  TableChart,
  Code,
  Undo,
  Redo
} from '@mui/icons-material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
// import { TextAlign } from '@tiptap/extension-text-align';

interface DocumentEditorProps {
  template?: any;
  onSave?: (content: string, placeholders: any) => void;
  onPreview?: (content: string, placeholders: any) => void;
  onGeneratePDF?: (content: string, placeholders: any) => void;
  readOnly?: boolean;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  template,
  onSave,
  onPreview,
  onGeneratePDF,
  readOnly = false
}) => {
  const [placeholders, setPlaceholders] = useState<any>({});
  const [showPlaceholderDialog, setShowPlaceholderDialog] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>('');
  const [placeholderValue, setPlaceholderValue] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Beginnen Sie mit der Eingabe...',
      }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: template?.content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Handle content updates
    },
  });

  useEffect(() => {
    if (editor && template) {
      editor.commands.setContent(template.content);
      setPlaceholders(template.placeholders || {});
    }
  }, [template, editor]);

  const handleSave = () => {
    if (editor && onSave) {
      onSave(editor.getHTML(), placeholders);
    }
  };

  const handlePreview = () => {
    if (editor && onPreview) {
      onPreview(editor.getHTML(), placeholders);
    }
  };

  const handleGeneratePDF = async () => {
    if (editor && onGeneratePDF) {
      setIsGeneratingPDF(true);
      try {
        await onGeneratePDF(editor.getHTML(), placeholders);
      } finally {
        setIsGeneratingPDF(false);
      }
    }
  };

  const insertPlaceholder = (placeholderName: string) => {
    if (editor) {
      editor.commands.insertContent(`{{${placeholderName}}}`);
    }
  };

  const handlePlaceholderClick = (placeholderName: string) => {
    setSelectedPlaceholder(placeholderName);
    setPlaceholderValue(placeholders[placeholderName] || '');
    setShowPlaceholderDialog(true);
  };

  const handlePlaceholderSave = () => {
    setPlaceholders((prev: any) => ({
      ...prev,
      [selectedPlaceholder]: placeholderValue
    }));
    setShowPlaceholderDialog(false);
  };

  const replacePlaceholders = (content: string) => {
    let processedContent = content;
    Object.keys(placeholders).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = placeholders[key] || '';
      processedContent = processedContent.replace(
        new RegExp(placeholder, 'g'),
        `<span class="template-placeholder">${value}</span>`
      );
    });
    return processedContent;
  };

  if (!editor) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      {!readOnly && (
        <Paper elevation={1} sx={{ mb: 2 }}>
          <Toolbar variant="dense">
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {/* Text formatting */}
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBold().run()}
                color={editor.isActive('bold') ? 'primary' : 'default'}
              >
                <FormatBold />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                color={editor.isActive('italic') ? 'primary' : 'default'}
              >
                <FormatItalic />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                color={editor.isActive('underline') ? 'primary' : 'default'}
              >
                <FormatUnderlined />
              </IconButton>

              <Divider orientation="vertical" flexItem />

              {/* Lists */}
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                color={editor.isActive('bulletList') ? 'primary' : 'default'}
              >
                <FormatListBulleted />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                color={editor.isActive('orderedList') ? 'primary' : 'default'}
              >
                <FormatListNumbered />
              </IconButton>

              <Divider orientation="vertical" flexItem />

              {/* Actions */}
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
              >
                <Undo />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
              >
                <Redo />
              </IconButton>
            </Stack>
          </Toolbar>
        </Paper>
      )}

      {/* Placeholders */}
      {template?.placeholders && template.placeholders.length > 0 && (
        <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Verfügbare Platzhalter:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {template.placeholders.map((placeholder: any) => (
              <Chip
                key={placeholder.name}
                label={placeholder.name}
                variant="outlined"
                size="small"
                onClick={() => handlePlaceholderClick(placeholder.name)}
                color={placeholders[placeholder.name] ? 'primary' : 'default'}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Editor */}
      <Paper elevation={1} sx={{ minHeight: 400 }}>
        <Box
          sx={{
            '& .ProseMirror': {
              minHeight: 400,
              padding: 2,
              outline: 'none',
              '& .template-placeholder': {
                backgroundColor: '#ffffcc',
                padding: '2px 4px',
                borderRadius: '3px',
                fontWeight: 'bold'
              }
            }
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Paper>

      {/* Action Buttons */}
      {!readOnly && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<Preview />}
            onClick={handlePreview}
          >
            Vorschau
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? <CircularProgress size={20} /> : 'PDF generieren'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
          >
            Speichern
          </Button>
        </Box>
      )}

      {/* Placeholder Dialog */}
      <Dialog
        open={showPlaceholderDialog}
        onClose={() => setShowPlaceholderDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Platzhalter bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Platzhalter"
            value={selectedPlaceholder}
            disabled
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Wert"
            value={placeholderValue}
            onChange={(e) => setPlaceholderValue(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPlaceholderDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={handlePlaceholderSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentEditor;
