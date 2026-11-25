import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { TaskCategory, TaskItem, TaskPriority } from '../types/dashboard';
import { TaskCheckButton } from './TaskCheckButton';
import { EmptyStateIllustration } from './EmptyStateIllustration';

interface TasksViewProps {
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onOpenNewTask: () => void;
}

export function TasksView({
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
}: TasksViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'All' | TaskCategory>('All');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (statusFilter === 'active' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
        if (q && !t.title.toLowerCase().includes(q) && !(t.notes ?? '').toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (sortBy === 'priority') {
          const rank = { High: 0, Medium: 1, Low: 2 };
          if (rank[a.priority] !== rank[b.priority]) {
            return rank[a.priority] - rank[b.priority];
          }
        }
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [tasks, search, statusFilter, categoryFilter, sortBy]);

  const priorityClass = (priority: TaskPriority) => {
    if (priority === TaskPriority.High) return 'text-rose-600 dark:text-rose-400 font-medium';
    if (priority === TaskPriority.Medium) return 'text-amber-600 dark:text-amber-400 font-medium';
    return 'text-slate-500 dark:text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">01</span>
            <span className="editorial-kicker-text">Action Directory</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {tasks.filter((t) => !t.completed).length} active · {tasks.filter((t) => t.completed).length} completed
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewTask}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="editorial-rise editorial-rise-2 editorial-toolbar cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or notes..."
            aria-label="Search tasks"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            {(['all', 'active', 'completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'All' | TaskCategory)}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600"
          >
            <option value="All">All Categories</option>
            {Object.values(TaskCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort tasks"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'dueDate')}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600"
          >
            <option value="priority">Sort: Priority</option>
            <option value="dueDate">Sort: Due Date</option>
          </select>
        </div>
      </div>

      {/* High-Density Clean Task Table */}
      <div className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filteredTasks.length === 0 ? (
          <EmptyStateIllustration
            kind="tasks"
            title={
              tasks.length === 0
                ? 'No tasks yet'
                : 'No tasks match your filters'
            }
            description={
              tasks.length === 0
                ? 'Create your first task to organize daily priorities and track progress.'
                : 'Try clearing your search or switching category and status filters.'
            }
            action={
              <button
                type="button"
                onClick={onOpenNewTask}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-6 pr-3 w-12">Done</th>
                  <th className="py-3 px-3">Task</th>
                  <th className="py-3 px-3 hidden sm:table-cell">Category</th>
                  <th className="py-3 px-3 hidden md:table-cell">Priority</th>
                  <th className="py-3 px-3 text-right">Due Date</th>
                  <th className="py-3 pl-3 pr-6 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-3 align-top">
                      <TaskCheckButton
                        checked={task.completed}
                        label={
                          task.completed
                            ? `Mark "${task.title}" incomplete`
                            : `Mark "${task.title}" complete`
                        }
                        onToggle={() => onToggleTask(task.id)}
                      />
                    </td>
                    <td className="py-3.5 px-3 align-top">
                      <p
                        className={`font-medium ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {task.notes}
                        </p>
                      )}
                      <div className="sm:hidden flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className={priorityClass(task.priority)}>{task.priority}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 align-top hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {task.category}
                    </td>
                    <td className={`py-3.5 px-3 align-top hidden md:table-cell text-xs whitespace-nowrap ${priorityClass(task.priority)}`}>
                      {task.priority}
                    </td>
                    <td className="py-3.5 px-3 align-top text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {task.dueDate}
                    </td>
                    <td className="py-3.5 pl-3 pr-6 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          aria-label={`Edit "${task.title}"`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={`Delete "${task.title}"`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
