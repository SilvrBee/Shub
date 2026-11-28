import { useCadenceStyle } from '../hooks/useCadenceStyle';
import { DashboardView } from '../types/dashboard';
import { DoodleHeaderScene } from './DoodleKit';
import { EmptyIllustrationKind, EmptyStateIllustration } from './EmptyStateIllustration';

interface PlaceholderPageViewProps {
  view: DashboardView.Reports;
}

const PLACEHOLDER_META: Record<
  PlaceholderPageViewProps['view'],
  {
    kicker: string;
    title: string;
    subtitle: string;
    illustration: EmptyIllustrationKind;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  [DashboardView.Reports]: {
    kicker: 'Reviews',
    title: 'Reports',
    subtitle: 'Weekly and chapter-level summaries of your cadence',
    illustration: 'reports',
    emptyTitle: 'No reports generated yet',
    emptyDescription:
      'Structured weekly and monthly summaries of your progress will appear here.',
  },
};

export function PlaceholderPageView({ view }: PlaceholderPageViewProps) {
  const activeStyle = useCadenceStyle();
  const meta = PLACEHOLDER_META[view];

  return (
    <div className="space-y-6">
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">EDITION</span>
            <span className="editorial-kicker-text">{meta.kicker}</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {meta.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {meta.subtitle}
          </p>
        </div>

        {activeStyle === 'doodle' && <DoodleHeaderScene tab={view} />}
      </div>

      <section className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <EmptyStateIllustration
          kind={meta.illustration}
          title={meta.emptyTitle}
          description={meta.emptyDescription}
        />
      </section>
    </div>
  );
}
