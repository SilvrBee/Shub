import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { NoteItem } from '../types/dashboard';

interface NotesViewProps {
  notes: NoteItem[];
  onCreateNote: () => string;
  onUpdateNote: (id: string, patch: Partial<Pick<NoteItem, 'title' | 'category' | 'content'>>) => void;
  onDeleteNote: (id: string) => void;
}

export function NotesView({
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: NotesViewProps) {
  const [selectedId, setSelectedId] = useState<string>(notes[0]?.id ?? '');
  const [search, setSearch] = useState('');

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, search]);

  const activeNote =
    notes.find((n) => n.id === selectedId) ?? filteredNotes[0] ?? null;

  const handleCreate = () => {
    const newId = onCreateNote();
    setSelectedId(newId);
    setSearch('');
  };

  const handleDelete = (id: string) => {
    const remaining = notes.filter((n) => n.id !== id);
    onDeleteNote(id);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? '');
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Notes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved locally
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
        {/* Left Note Index */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                aria-label="Search notes"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No notes match your search.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      isSelected
                        ? 'bg-slate-100/90 dark:bg-slate-800/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {note.title || 'Untitled Note'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {note.content || 'Empty note'}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 mt-2">
                      {note.category} · {formatTimestamp(note.updatedAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Distraction-Free Editor */}
        <div className="md:col-span-8 flex flex-col">
          {activeNote ? (
            <>
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <label htmlFor="note-category" className="sr-only">
                    Note category
                  </label>
                  <input
                    id="note-category"
                    type="text"
                    value={activeNote.category}
                    onChange={(e) => onUpdateNote(activeNote.id, { category: e.target.value })}
                    className="w-28 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Updated {formatTimestamp(activeNote.updatedAt)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(activeNote.id)}
                  aria-label="Delete note"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col gap-4">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => onUpdateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Note title"
                  aria-label="Note title"
                  className="font-display text-xl font-semibold bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                />
                <textarea
                  value={activeNote.content}
                  onChange={(e) => onUpdateNote(activeNote.id, { content: e.target.value })}
                  placeholder="Start writing..."
                  aria-label="Note body"
                  className="flex-1 w-full bg-transparent text-sm leading-relaxed text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none resize-none min-h-[340px]"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No note selected
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Note</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
