import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TaskCategory, TaskItem, TaskPriority } from '../types/dashboard';
import { getTodayKey } from '../data/initialData';

interface TaskModalProps {
  isOpen: boolean;
  initialTask?: TaskItem | null;
  defaultCategory?: TaskCategory;
  defaultPriority?: TaskPriority;
  onClose: () => void;
  onSave: (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>, existingId?: string) => void;
}

export function TaskModal({
  isOpen,
  initialTask,
  defaultCategory = TaskCategory.Work,
  defaultPriority = TaskPriority.Medium,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [dueDate, setDueDate] = useState(getTodayKey());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setCategory(initialTask.category);
        setPriority(initialTask.priority);
        setDueDate(initialTask.dueDate);
        setNotes(initialTask.notes ?? '');
      } else {
        setTitle('');
        setCategory(defaultCategory);
        setPriority(defaultPriority);
        setDueDate(getTodayKey());
        setNotes('');
      }
    }
  }, [isOpen, initialTask, defaultCategory, defaultPriority]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(
      {
        title: trimmed,
        category,
        priority,
        dueDate,
        notes: notes.trim() || undefined,
      },
      initialTask?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="task-modal-title" className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {initialTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare weekly engineering memo"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="task-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                id="task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              >
                {Object.values(TaskCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              >
                {Object.values(TaskPriority).map((prio) => (
                  <option key={prio} value={prio}>
                    {prio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-due" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm font-mono tabular-nums bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              id="task-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, links, or checklist details..."
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              {initialTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
