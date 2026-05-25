/**
 * WorkerSearch.tsx
 * صفحة البحث عن عامل متاح — مثل TaskRabbit browse
 */
import { useState, useEffect } from 'react';
import { Search, Star, MapPin, Clock, CheckCircle, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../lib/supabase';

interface Worker {
  id: string;
  user_id: string;
  full_name: string;
  city: string;
  rating: number;
  completed_tasks: number;
  skills: string[];
  availability_status: string;
  is_approved: boolean;
  verification_level: string;
}

const CITIES = ['الكل','الرياض','جدة','مكة المكرمة','الدمام','الخبر','الطائف','تبوك','أبها'];
const SKILL_FILTERS = ['تعليم وشرح','مهام ميدانية','تقني وبرمجة','تصميم وإبداع','إداري وأعمال','منزلي وصيانة'];

interface WorkerSearchProps {
  onSelectWorker?: (workerId: string) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function WorkerSearch({ onSelectWorker, onClose, embedded = false }: WorkerSearchProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('الكل');
  const [skillFilter, setSkillFilter] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);

  useEffect(() => { fetchWorkers(); }, []);

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('is_approved', true)
      .order('rating', { ascending: false });
    setWorkers(data as Worker[] || []);
    setLoading(false);
  };

  const filtered = workers.filter(w => {
    const matchSearch = !search || w.full_name.toLowerCase().includes(search.toLowerCase()) ||
      w.skills?.some(s => s.includes(search));
    const matchCity = city === 'الكل' || w.city === city;
    const matchSkill = !skillFilter || w.skills?.some(s => s.includes(skillFilter.replace(/^[^ ]+ /,'')));
    const matchOnline = !onlineOnly || w.availability_status === 'online';
    return matchSearch && matchCity && matchSkill && matchOnline;
  });

  const content = (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو المهارة..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pr-9 pl-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50"
            dir="rtl" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CITIES.map(c => (
            <button key={c} onClick={() => setCity(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                city === c ? 'bg-amber-500 text-black' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
              }`}>
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setOnlineOnly(o => !o)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 flex items-center gap-1.5 transition-all ${
              onlineOnly ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${onlineOnly ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            متاح الآن
          </button>
          {SKILL_FILTERS.map(sf => (
            <button key={sf} onClick={() => setSkillFilter(skillFilter === sf ? '' : sf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                skillFilter === sf ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
              }`}>
              {sf}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Search size={24} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">لا يوجد عمال بهذه المواصفات</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">{filtered.length} عامل متاح</p>
          {filtered.map(worker => (
            <div key={worker.id}
              onClick={() => onSelectWorker?.(worker.user_id)}
              className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 transition-all ${
                onSelectWorker ? 'cursor-pointer hover:border-amber-500/40' : ''
              }`}
              dir="rtl">
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <img src={getAvatarUrl(worker.full_name)} alt={worker.full_name}
                    className="w-12 h-12 rounded-xl" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${
                    worker.availability_status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{worker.full_name}</span>
                    {worker.verification_level === 'verified' && (
                      <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} /> {worker.city}
                    </span>
                    {worker.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        {worker.rating.toFixed(1)} ({worker.completed_tasks} طلب)
                      </span>
                    )}
                    {worker.availability_status === 'online' && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Clock size={10} /> متاح الآن
                      </span>
                    )}
                  </div>

                  {worker.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {worker.skills.slice(0, 4).map(s => (
                        <span key={s} className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full px-2 py-0.5">
                          {s}
                        </span>
                      ))}
                      {worker.skills.length > 4 && (
                        <span className="text-xs text-zinc-600">+{worker.skills.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>

                {onSelectWorker && (
                  <button className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors">
                    اختر
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-[#080808] pt-20 px-4 pb-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">تصفح العمال</h1>
            <p className="text-zinc-500 text-sm mt-0.5">اختر عاملاً مناسباً لطلبك</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
        {content}
      </div>
    </div>
  );
}
