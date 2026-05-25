import { TaskStatus, TaskCategory, UrgencyLevel, VerificationLevel } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

const statusClassName: Record<TaskStatus, string> = {
  pending: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  ai_processing: 'bg-amber-950 text-amber-400 border-amber-800',
  waiting_for_worker: 'bg-blue-950 text-blue-400 border-blue-800',
  in_progress: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  completed: 'bg-green-950 text-green-400 border-green-800',
  disputed: 'bg-red-950 text-red-400 border-red-800',
  cancelled: 'bg-zinc-900 text-zinc-500 border-zinc-800',
};

const urgencyClassName: Record<UrgencyLevel, string> = {
  low: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  medium: 'bg-blue-950 text-blue-400 border-blue-800',
  high: 'bg-orange-950 text-orange-400 border-orange-800',
  urgent: 'bg-red-950 text-red-400 border-red-800',
};

const verificationClassName: Record<VerificationLevel, { cls: string; icon: string }> = {
  none: { cls: 'bg-zinc-800 text-zinc-500', icon: '○' },
  basic: { cls: 'bg-blue-950 text-blue-400', icon: '◐' },
  verified: { cls: 'bg-emerald-950 text-emerald-400', icon: '✓' },
  trusted: { cls: 'bg-amber-950 text-amber-400', icon: '★' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useLanguage();
  const key = `status_${status}` as Parameters<typeof t>[0];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClassName[status]}`}>
      {t(key)}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const { t } = useLanguage();
  const key = `urgency_${urgency}` as Parameters<typeof t>[0];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${urgencyClassName[urgency]}`}>
      {t(key)}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TaskCategory }) {
  const { t } = useLanguage();
  const key = `cat_${category}` as Parameters<typeof t>[0];
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
      {t(key)}
    </span>
  );
}

export function VerificationBadge({ level }: { level: VerificationLevel }) {
  const { t } = useLanguage();
  const { cls, icon } = verificationClassName[level];
  const key = `verify_${level}` as Parameters<typeof t>[0];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <span>{icon}</span>
      {t(key)}
    </span>
  );
}
