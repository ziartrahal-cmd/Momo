export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  source?: string;
}

export interface NoteValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNoteInput(title: string, content: string): NoteValidationResult {
  if (!title.trim() && !content.trim()) {
    return { valid: false, error: "يرجى كتابة عنوان أو نص للملاحظة." };
  }
  if (!content.trim()) {
    return { valid: false, error: "يرجى كتابة محتوى الملاحظة." };
  }
  return { valid: true };
}

export function createNoteItem(input: {
  title: string;
  content: string;
  source?: string;
}): NoteItem {
  const validation = validateNoteInput(input.title, input.content);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid note input");
  }

  const cleanContent = input.content.trim();
  const cleanTitle =
    input.title.trim() ||
    cleanContent.split(/\r?\n/)[0].slice(0, 48).trim() ||
    "ملاحظة محفوظة";

  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: cleanTitle,
    content: cleanContent,
    createdAt: new Date().toISOString(),
    source: input.source,
  };
}

export function filterNotes(notes: NoteItem[], query: string): NoteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return notes;
  }
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q)
  );
}
