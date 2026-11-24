import { useMemo, useState } from 'react';
import {
  ExternalLink,
  FileText,
  Link2,
  Music,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  PersonProfile,
  TimelineEvent,
  VaultItem,
  VaultItemKind,
} from '../types/dashboard';
import { sanitizeExternalUrl } from '../services/googleWorkspace';

interface VaultViewProps {
  items: VaultItem[];
  people: PersonProfile[];
  timelineEvents: TimelineEvent[];
  onCreateItem: (item: Omit<VaultItem, 'id'>) => void;
  onUpdateItem: (id: string, patch: Partial<VaultItem>) => void;
  onDeleteItem: (item: VaultItem) => void;
}

const KIND_TABS: Array<{ id: 'all' | VaultItemKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'link', label: 'Links' },
  { id: 'song', label: 'Songs' },
  { id: 'note', label: 'Notes' },
];

function KindIcon({ kind }: { kind: VaultItemKind }) {
  if (kind === 'link') return <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
  if (kind === 'song') return <Music className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
  return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
}

export function VaultView({
  items,
  people,
  timelineEvents,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: VaultViewProps) {
  const [activeKind, setActiveKind] = useState<'all' | VaultItemKind>('all');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [formKind, setFormKind] = useState<VaultItemKind>('link');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPersonId, setFormPersonId] = useState('');
  const [formTimelineId, setFormTimelineId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editPersonId, setEditPersonId] = useState('');
  const [editTimelineId, setEditTimelineId] = useState('');

  const approvedTimelineEvents = useMemo(
    () =>
      timelineEvents
        .filter((ev) => ev.status === 'approved')
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [timelineEvents]
  );

  const visibleVaultItems = useMemo(
    () =>
      items.filter(
        (it) => it.kind === 'link' || it.kind === 'song' || it.kind === 'note'
      ),
    [items]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of visibleVaultItems) {
      for (const tag of item.tags) {
        if (tag.trim()) set.add(tag.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [visibleVaultItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...visibleVaultItems]
      .filter((it) => {
        if (activeKind !== 'all' && it.kind !== activeKind) return false;
        if (selectedTag && !it.tags.includes(selectedTag)) return false;
        if (!q) return true;
        return (
          it.title.toLowerCase().includes(q) ||
          (it.description || '').toLowerCase().includes(q) ||
          (it.artist || '').toLowerCase().includes(q) ||
          (it.personName || '').toLowerCase().includes(q) ||
          it.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
  }, [visibleVaultItems, activeKind, selectedTag, search]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const person = people.find((p) => p.id === formPersonId);
    const tl = approvedTimelineEvents.find((ev) => ev.id === formTimelineId);
    const safeUrl = sanitizeExternalUrl(formUrl.trim());

    onCreateItem({
      kind: formKind,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      url: safeUrl,
      artist: formKind === 'song' ? formArtist.trim() || undefined : undefined,
      dateAdded: new Date().toISOString().slice(0, 10),
      tags: formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
      personId: person?.id,
      personName: person?.name,
      timelineEventId: tl?.id,
      timelineEventTitle: tl?.title,
    });

    setFormTitle('');
    setFormDescription('');
    setFormUrl('');
    setFormArtist('');
    setFormTags('');
    setFormPersonId('');
    setFormTimelineId('');
    setShowAddForm(false);
  };

  const startEdit = (item: VaultItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditUrl(item.url || '');
    setEditArtist(item.artist || '');
    setEditTags(item.tags.join(', '));
    setEditPersonId(item.personId || '');
    setEditTimelineId(item.timelineEventId || '');
  };

  const saveEdit = (item: VaultItem) => {
    if (!editTitle.trim()) return;
    const person = people.find((p) => p.id === editPersonId);
    const tl = approvedTimelineEvents.find((ev) => ev.id === editTimelineId);

    onUpdateItem(item.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      url: sanitizeExternalUrl(editUrl.trim()) ?? '',
      artist: item.kind === 'song' ? editArtist.trim() : '',
      tags: editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
      personId: person?.id || '',
      personName: person?.name || '',
      timelineEventId: tl?.id || '',
      timelineEventTitle: tl?.title || '',
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Personal Vault
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {visibleVaultItems.length} saved {visibleVaultItems.length === 1 ? 'item' : 'items'} · Links, songs &amp; notes
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add to Vault</span>
        </button>
      </div>

      {/* Manual Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Save to Personal Vault
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <select
              aria-label="Item type"
              value={formKind}
              onChange={(e) => setFormKind(e.target.value as VaultItemKind)}
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            >
              <option value="link">Link</option>
              <option value="song">Song</option>
              <option value="note">Note</option>
            </select>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Title *"
              className="sm:col-span-3 px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
          </div>

          <textarea
            rows={2}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Notes, reflection, or why it mattered..."
            className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(formKind === 'link' || formKind === 'song') && (
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
              />
            )}
            {formKind === 'song' && (
              <input
                type="text"
                value={formArtist}
                onChange={(e) => setFormArtist(e.target.value)}
                placeholder="Artist"
                className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
              />
            )}
            <input
              type="text"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
            <select
              aria-label="Link person"
              value={formPersonId}
              onChange={(e) => setFormPersonId(e.target.value)}
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            >
              <option value="">Link Person (optional)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Link timeline milestone"
              value={formTimelineId}
              onChange={(e) => setFormTimelineId(e.target.value)}
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            >
              <option value="">Link Milestone (optional)</option>
              {approvedTimelineEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.eventDate} · {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Item</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg self-start">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveKind(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeKind === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vault..."
              aria-label="Search vault items"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
          </div>

          {allTags.length > 0 && (
            <select
              aria-label="Filter by tag"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            >
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Vault Items Grid */}
      {filteredItems.length === 0 ? (
        <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No vault items match your current view.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Save meaningful links, songs, or notes to revisit later.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => {
            const isEditing = editingId === item.id;
            const safeUrl = sanitizeExternalUrl(item.url);

            return (
              <article
                key={item.id}
                className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6 space-y-3 flex-1">
                  {!isEditing ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <KindIcon kind={item.kind} />
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            {item.kind}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{item.dateAdded}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            aria-label={`Edit "${item.title}"`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item)}
                            aria-label={`Delete "${item.title}"`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>
                        {item.artist && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            by {item.artist}
                          </p>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {item.description}
                        </p>
                      )}

                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          <span>{safeUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        {item.tags.length > 0 && (
                          <span>{item.tags.map((t) => `#${t}`).join('  ')}</span>
                        )}
                        {item.personName && <span>Person: {item.personName}</span>}
                        {item.timelineEventTitle && (
                          <span>Milestone: {item.timelineEventTitle}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                      />
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                      />
                      {item.kind === 'song' && (
                        <input
                          type="text"
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          placeholder="Artist"
                          className="w-full px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                        />
                      )}
                      {(item.kind === 'link' || item.kind === 'song') && (
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                        />
                      )}
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="Tags (comma-separated)"
                        className="w-full px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          aria-label="Edit linked person"
                          value={editPersonId}
                          onChange={(e) => setEditPersonId(e.target.value)}
                          className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                        >
                          <option value="">No linked person</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="Edit linked milestone"
                          value={editTimelineId}
                          onChange={(e) => setEditTimelineId(e.target.value)}
                          className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                        >
                          <option value="">No linked milestone</option>
                          {approvedTimelineEvents.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.eventDate} · {ev.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
