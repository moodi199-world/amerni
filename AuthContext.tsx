/**
 * WorkerSchedule.tsx
 * العامل يحدد أيام عمله وساعاته
 */

import { useState, useEffect } from 'react';
import { Clock, Save, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const DAYS = [
  { label: 'الأحد',    short: 'أح', value: 0 },
  { label: 'الاثنين',  short: 'ثن', value: 1 },
  { label: 'الثلاثاء', short: 'ثل', value: 2 },
  { label: 'الأربعاء', short: 'أر', value: 3 },
  { label: 'الخميس',   short: 'خم', value: 4 },
  { label: 'الجمعة',   short: 'جم', value: 5 },
  { label: 'السبت',    short: 'سب', value: 6 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? 'ص' : 'م';
  return { value: i, label: `${h}:00 ${ampm}` };
});

export function WorkerSchedule() {
  const { user } = useAuth();
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('worker_schedule')
      .select('*')
      .eq('worker_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setWorkDays(data.work_days || [0,1,2,3,4]);
          setStartHour(data.start_hour ?? 8);
          setEndHour(data.end_hour ?? 22);
          setIsAvailable(data.is_available ?? true);
        }
        setLoading(false);
      });
  }, [user]);

  const toggleDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('worker_schedule')
      .upsert({
        worker_id: user.id,
        work_days: workDays,
        start_hour: startHour,
        end_hour: endHour,
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'worker_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-6">

      {/* Availability toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">حالة التوفر</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {isAvailable ? 'أنت متاح — الطلبات تصلك' : 'أنت غير متاح — لا طلبات'}
          </div>
        </div>
        <button
          onClick={() => setIsAvailable(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isAvailable ? 'bg-emerald-500' : 'bg-zinc-700'
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
            isAvailable ? 'left-7' : 'left-1'
          }`} />
        </button>
      </div>

      {isAvailable && (
        <>
          {/* Work days */}
          <div>
            <div className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              أيام العمل
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${
                    workDays.includes(day.value)
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-xs text-zinc-600 text-center">
              {workDays.length === 0
                ? 'لم تختر أي يوم'
                : DAYS.filter(d => workDays.includes(d.value)).map(d => d.label).join('، ')}
            </div>
          </div>

          {/* Hours */}
          <div>
            <div className="text-sm font-medium text-white mb-3">ساعات العمل</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-500 mb-1.5">من</div>
                <select
                  value={startHour}
                  onChange={e => setStartHour(+e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                >
                  {HOURS.filter(h => h.value < endHour).map(h => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1.5">إلى</div>
                <select
                  value={endHour}
                  onChange={e => setEndHour(+e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                >
                  {HOURS.filter(h => h.value > startHour).map(h => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2 text-xs text-zinc-500 text-center">
              متاح من {HOURS[startHour].label} حتى {HOURS[endHour].label}
            </div>
          </div>
        </>
      )}

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving || saved}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-500 hover:bg-amber-400 text-black'
        }`}
      >
        {saved ? (
          <><CheckCircle size={16} /> تم الحفظ</>
        ) : saving ? (
          <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> يحفظ...</>
        ) : (
          <><Save size={16} /> حفظ الجدول</>
        )}
      </button>
    </div>
  );
}
