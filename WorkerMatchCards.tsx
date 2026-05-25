import { useState } from 'react';
import { Star, Zap, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getAvatarUrl } from '../../lib/supabase';
import type { WorkerProfile } from '../../types';

interface WorkerMatchCardsProps {
  workers: WorkerProfile[];
  onSelect: (workerId: string) => void;
  onAutoMatch: () => void;
  loading?: boolean;
}

export function WorkerMatchCards({ workers, onSelect, onAutoMatch, loading }: WorkerMatchCardsProps) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (workerId: string) => {
    setSelectedId(workerId);
    onSelect(workerId);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white mb-0.5">{t('match_title')}</h3>
        <p className="text-xs text-zinc-500">{t('match_sub')}</p>
      </div>

      {/* Auto-match card */}
      <button
        onClick={onAutoMatch}
        disabled={loading}
        className="w-full bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 rounded-xl p-4 text-start transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-400">{t('match_auto')}</div>
            <div className="text-xs text-zinc-500">{t('match_auto_sub')}</div>
          </div>
        </div>
      </button>

      {/* Worker cards */}
      <div className="space-y-3">
        {workers.map(worker => {
          const isSelected = selectedId === worker.id;
          const name = worker.bio ?? 'Worker';
          return (
            <div
              key={worker.id}
              className={`bg-[#0d0d0d] border rounded-xl p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
              onClick={() => handleSelect(worker.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={getAvatarUrl(name)}
                      alt={name}
                      className="w-10 h-10 rounded-full"
                    />
                    <span
                      className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d0d] ${
                        worker.is_online ? 'bg-emerald-500' : 'bg-zinc-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{name}</div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className={`flex items-center gap-1 ${worker.is_online ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${worker.is_online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        {worker.is_online ? t('match_online') : t('match_offline')}
                      </span>
                      <span>·</span>
                      <span>{worker.completed_tasks ?? 0} {t('match_tasks_done')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <Star size={11} fill="currentColor" />
                    <span className="font-semibold">{worker.rating?.toFixed(1) ?? '5.0'}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleSelect(worker.id); }}
                    disabled={loading}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle size={11} /> {t('match_send')}
                      </span>
                    ) : (
                      t('match_send')
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
