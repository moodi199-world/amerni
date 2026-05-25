import { CheckCircle, Clock, Zap, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TaskStatus } from '../../types';

interface TaskStatusBarProps {
  status: TaskStatus;
}

const STEPS: { key: TaskStatus; labelKey: 'taskbar_new' | 'taskbar_accepted' | 'taskbar_in_progress' | 'taskbar_done' }[] = [
  { key: 'waiting_for_worker', labelKey: 'taskbar_new' },
  { key: 'in_progress', labelKey: 'taskbar_accepted' },
  { key: 'in_progress', labelKey: 'taskbar_in_progress' },
  { key: 'completed', labelKey: 'taskbar_done' },
];

const STATUS_STEP: Record<TaskStatus, number> = {
  pending: 0,
  ai_processing: 0,
  waiting_for_worker: 0,
  in_progress: 2,
  completed: 4,
  disputed: 2,
  cancelled: 0,
};

const STEP_ICONS = [Zap, CheckCircle, Clock, Star];

export function TaskStatusBar({ status }: TaskStatusBarProps) {
  const { t } = useLanguage();
  const currentStep = STATUS_STEP[status] ?? 0;

  return (
    <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 start-0 end-0 h-px bg-zinc-800 mx-8" />
        <div
          className="absolute top-5 start-8 h-px bg-amber-500 transition-all duration-700"
          style={{ width: `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 4rem)` }}
        />

        {STEPS.map(({ labelKey }, idx) => {
          const Icon = STEP_ICONS[idx];
          const done = idx < currentStep;
          const active = idx === currentStep || (currentStep >= STEPS.length && idx === STEPS.length - 1);
          return (
            <div key={labelKey + idx} className="flex flex-col items-center gap-2 z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  done
                    ? 'bg-amber-500 border-amber-500'
                    : active
                    ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'bg-[#0d0d0d] border-zinc-700'
                }`}
              >
                <Icon
                  size={16}
                  className={done ? 'text-black' : active ? 'text-amber-400' : 'text-zinc-600'}
                />
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  done || active ? 'text-amber-400' : 'text-zinc-600'
                }`}
              >
                {t(labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
