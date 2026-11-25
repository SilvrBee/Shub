import React, { useEffect } from 'react';
import { FolderCog, X } from 'lucide-react';
import { CategoryItem, ScheduleBlock, TaskItem } from '../../types/dashboard';
import { CategoryManager } from './CategoryManager';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  tasks: TaskItem[];
  schedule: ScheduleBlock[];
  onAddCategory: (category: CategoryItem) => void;
  onUpdateCategory: (id: string, patch: Partial<CategoryItem>) => void;
  onReorderCategories: (nextOrder: CategoryItem[]) => void;
  onDeleteCategory: (id: string, reassignToName: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  tasks,
  schedule,
  onAddCategory,
  onUpdateCategory,
  onReorderCategories,
  onDeleteCategory,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const openPopover = document.querySelector('[data-portal-popover="true"]');
        if (openPopover) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-category-manager-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-manager-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cadence-card editorial-modal editorial-preserve-pad bg-white dark:bg-slate-900 w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FolderCog className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <div>
              <h2
                id="category-manager-modal-title"
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                Manage Categories
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add, rename, reorder, or reassign categories across tasks and schedule blocks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close category manager"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          <CategoryManager
            categories={categories}
            tasks={tasks}
            schedule={schedule}
            onAddCategory={onAddCategory}
            onUpdateCategory={onUpdateCategory}
            onReorderCategories={onReorderCategories}
            onDeleteCategory={onDeleteCategory}
          />
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
