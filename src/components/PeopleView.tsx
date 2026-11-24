import { useMemo, useState } from 'react';
import { Check, GitMerge, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import {
  JournalEntrySummary,
  PersonProfile,
  PersonSuggestion,
} from '../types/dashboard';

interface PeopleViewProps {
  people: PersonProfile[];
  suggestions: PersonSuggestion[];
  journalEntries: JournalEntrySummary[];
  onCreatePerson: (person: Omit<PersonProfile, 'id' | 'mentionCount' | 'memories' | 'sourceEntryIds'>) => void;
  onUpdatePerson: (id: string, patch: Partial<PersonProfile>) => void;
  onDeletePerson: (id: string) => void;
  onMergePeople: (targetId: string, duplicateId: string) => void;
  onConfirmSuggestion: (suggestion: PersonSuggestion, mergeIntoId?: string) => void;
  onDismissSuggestion: (id: string) => void;
}

export function PeopleView({
  people,
  suggestions,
  journalEntries,
  onCreatePerson,
  onUpdatePerson,
  onDeletePerson,
  onMergePeople,
  onConfirmSuggestion,
  onDismissSuggestion,
}: PeopleViewProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(people[0]?.id ?? '');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newBirthday, setNewBirthday] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRelationship, setEditRelationship] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editAliases, setEditAliases] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [mergeTargetId, setMergeTargetId] = useState('');
  const [linkSuggestionMap, setLinkSuggestionMap] = useState<Record<string, string>>({});

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...people]
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.relationship || '').toLowerCase().includes(q) ||
          p.aliases.some((a) => a.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, search]);

  const activePerson =
    people.find((p) => p.id === selectedId) ?? filteredPeople[0] ?? null;

  const relatedEntries = useMemo(() => {
    if (!activePerson) return [];
    const nameSet = new Set(
      [activePerson.name, ...activePerson.aliases].map((s) => s.toLowerCase())
    );
    return journalEntries
      .filter(
        (e) =>
          activePerson.sourceEntryIds.includes(e.id) ||
          e.mentionedPeople.some((mp) => nameSet.has(mp.toLowerCase()))
      )
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }, [activePerson, journalEntries]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreatePerson({
      name: newName.trim(),
      relationship: newRelationship.trim() || undefined,
      birthday: newBirthday.trim() || undefined,
      aliases: newAliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      notes: newNotes.trim() || undefined,
    });
    setNewName('');
    setNewRelationship('');
    setNewBirthday('');
    setNewAliases('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const startEdit = (person: PersonProfile) => {
    setIsEditing(true);
    setEditName(person.name);
    setEditRelationship(person.relationship || '');
    setEditBirthday(person.birthday || '');
    setEditAliases(person.aliases.join(', '));
    setEditNotes(person.notes || '');
  };

  const saveEdit = () => {
    if (!activePerson || !editName.trim()) return;
    onUpdatePerson(activePerson.id, {
      name: editName.trim(),
      relationship: editRelationship.trim() || undefined,
      birthday: editBirthday.trim() || undefined,
      aliases: editAliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      notes: editNotes.trim() || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            People Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {people.length} {people.length === 1 ? 'person' : 'people'} · Searchable relationships and shared memories
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Person</span>
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            New Person Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name *"
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
            <input
              type="text"
              value={newRelationship}
              onChange={(e) => setNewRelationship(e.target.value)}
              placeholder="Relationship (e.g., Sister, Colleague)"
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
            <input
              type="text"
              value={newBirthday}
              onChange={(e) => setNewBirthday(e.target.value)}
              placeholder="Birthday (e.g., May 14)"
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
            <input
              type="text"
              value={newAliases}
              onChange={(e) => setNewAliases(e.target.value)}
              placeholder="Nicknames / aliases (comma-separated)"
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
          </div>
          <textarea
            rows={2}
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Personal notes..."
            className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
          />
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
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Pending People Suggestions from Gemini */}
      {pendingSuggestions.length > 0 && (
        <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Suggested People from Journal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Confirm new profiles or link a nickname to someone already in your directory
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {pendingSuggestions.length} pending
            </span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {pendingSuggestions.map((sug) => (
              <li
                key={sug.id}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {sug.name}
                    </span>
                    {sug.relationship && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        · {sug.relationship}
                      </span>
                    )}
                    <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
                      · {sug.entryDate}
                    </span>
                  </div>
                  <p className="text-xs italic text-slate-500 dark:text-slate-400">
                    &ldquo;{sug.excerpt}&rdquo;
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {people.length > 0 && (
                    <select
                      aria-label={`Link ${sug.name} to existing person`}
                      value={linkSuggestionMap[sug.id] || ''}
                      onChange={(e) =>
                        setLinkSuggestionMap((prev) => ({
                          ...prev,
                          [sug.id]: e.target.value,
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
                    >
                      <option value="">Create new profile</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          Alias of {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onConfirmSuggestion(sug, linkSuggestionMap[sug.id] || undefined)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{linkSuggestionMap[sug.id] ? 'Link Alias' : 'Create Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissSuggestion(sug.id)}
                    aria-label={`Dismiss ${sug.name}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Main Directory Split */}
      <div className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Left People List */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, alias, relationship..."
                aria-label="Search people"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredPeople.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No people in your directory yet.
              </div>
            ) : (
              filteredPeople.map((person) => {
                const selected = activePerson?.id === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(person.id);
                      setIsEditing(false);
                      setMergeTargetId('');
                    }}
                    className={`w-full text-left px-5 py-3.5 transition-colors ${
                      selected
                        ? 'bg-slate-100/90 dark:bg-slate-800/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {person.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {person.relationship || 'Person'} ·{' '}
                      <span className="font-mono tabular-nums">
                        {person.mentionCount} {person.mentionCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Person Detail Page */}
        <div className="md:col-span-8 p-6 space-y-6">
          {activePerson ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
                {!isEditing ? (
                  <div>
                    <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {activePerson.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{activePerson.relationship || 'No relationship set'}</span>
                      {activePerson.birthday && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Birthday: {activePerson.birthday}</span>
                        </>
                      )}
                      {activePerson.aliases.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Aliases: {activePerson.aliases.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={editRelationship}
                      onChange={(e) => setEditRelationship(e.target.value)}
                      placeholder="Relationship"
                      className="px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={editBirthday}
                      onChange={(e) => setEditBirthday(e.target.value)}
                      placeholder="Birthday"
                      className="px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={editAliases}
                      onChange={(e) => setEditAliases(e.target.value)}
                      placeholder="Aliases (comma-separated)"
                      className="px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(activePerson)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePerson(activePerson.id)}
                        aria-label={`Delete ${activePerson.name}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Last Mentioned</span>
                  <p className="font-mono tabular-nums text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {activePerson.lastMentionedDate || 'Not yet mentioned'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Journal Mentions</span>
                  <p className="font-mono tabular-nums text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {activePerson.mentionCount} entries
                  </p>
                </div>
              </div>

              {/* Personal Notes */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Personal Notes
                </h3>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Personal notes..."
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {activePerson.notes || 'No personal notes added yet.'}
                  </p>
                )}
              </div>

              {/* Memories */}
              {activePerson.memories.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Memories &amp; Moments
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                    {activePerson.memories.map((mem, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-3">
                        <span>• {mem}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePerson(activePerson.id, {
                              memories: activePerson.memories.filter((_, i) => i !== idx),
                            })
                          }
                          aria-label="Remove memory"
                          className="text-xs text-slate-400 hover:text-rose-600 shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Chronological Journal Mentions */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Relevant Journal Entries
                </h3>
                {relatedEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No synced journal entries linked yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg">
                    {relatedEntries.map((entry) => (
                      <li key={entry.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                            {entry.heading}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-slate-400">
                            {entry.entryDate}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {entry.summary}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Merge Duplicate Profile */}
              {people.length > 1 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge duplicate into:</span>
                  </span>
                  <select
                    aria-label="Merge into person"
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
                  >
                    <option value="">Select target profile...</option>
                    {people
                      .filter((p) => p.id !== activePerson.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!mergeTargetId}
                    onClick={() => {
                      if (!mergeTargetId) return;
                      onMergePeople(mergeTargetId, activePerson.id);
                      setSelectedId(mergeTargetId);
                      setMergeTargetId('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    Merge &amp; Archive Duplicate
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select a person or add someone new
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gemini will also suggest profiles as you sync your journal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
