/**
 * TaskTracker.tsx
 * تتبع مرئي لحالة الطلب — مثل TaskRabbit
 */
import { CheckCircle, Clock, User, Star, Circle } from 'lucide-react';

interface TaskTrackerProps {
  status: string;
  negotiationStatus?: string | null;
}

const STEPS = [
  { key: 'pending',            label: 'الطلب مستلم',       icon: Circle },
  { key: 'waiting_for_worker', label: 'نبحث عن عامل',      icon: Clock },
  { key: 'negotiation',        label: 'التفاوض على السعر',  icon: User },
  { key: 'in_progress',        label: 'جاري التنفيذ',       icon: User },
  { key: 'completed',          label: 'مكتمل',              icon: Star },
];

function getActiveStep(status: string, negotiationStatus?: string | null): number {
  if (status === 'completed') return 4;
  if (status === 'in_progress') {
    return negotiationStatus === 'pending' ? 2 : 3;
  }
  if (status === 'waiting_for_worker') return 1;
  return 0;
}

export function TaskTracker({ status, negotiationStatus }: TaskTrackerProps) {
  const active = getActiveStep(status, negotiationStatus);
  if (status === 'cancelled' || status === 'disputed') return null;

  return (
    <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl">
      <p className="text-xs text-zinc-500 mb-3 font-medium">حالة الطلب</p>
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  done    ? 'bg-emerald-500' :
                  current ? 'bg-amber-500 ring-4 ring-amber-500/20' :
                            'bg-zinc-800'
                }`}>
                  {done ? (
                    <CheckCircle size={14} className="text-white" />
                  ) : (
                    <Icon size={12} className={current ? 'text-black' : 'text-zinc-600'} />
                  )}
                </div>
                <p className={`text-xs mt-1.5 text-center leading-tight max-w-16 ${
                  done ? 'text-emerald-400' : current ? 'text-amber-400 font-medium' : 'text-zinc-600'
                }`}>
                  {step.label}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all ${done ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
