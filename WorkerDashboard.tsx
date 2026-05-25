/**
 * WorkerDashboard.tsx — نسخة محسّنة
 * يشمل: SmartChat المحمية، جدول التوفر، البروفايل، التقييمات
 */
import { useState, useEffect } from 'react';
import {
  CheckCircle, Clock, ArrowRight, Loader2, TrendingUp, Star,
  Briefcase, ChevronRight, Zap, WifiOff, Wifi, Wallet,
  Scale, ThumbsUp, ThumbsDown, Calendar, User, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Task, TaskMessage, WorkerProfile, AvailabilityStatus } from '../types';
import { Button } from '../components/ui/Button';
import { timeAgo } from '../lib/i18n';
import { TaskListSkeleton } from '../components/ui/Skeleton';
import { SmartChat } from '../components/chat/SmartChat';
import { WorkerSchedule } from '../components/worker/WorkerSchedule';
import { WorkerPublicProfile } from '../components/worker/WorkerPublicProfile';

type View = 'feed' | 'my-tasks' | 'task-detail' | 'schedule' | 'profile';

export function WorkerDashboard() {
  const { user, refreshProfile } = useAuth();
  const { lang, isRTL } = useLanguage();
  const [view, setView] = useState<View>('feed');
  const [feedTasks, setFeedTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingTask, setAcceptingTask] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [workerPriceInput, setWorkerPriceInput] = useState('');
  const [showPricePrompt, setShowPricePrompt] = useState(false);
  const [resolvingNeg, setResolvingNeg] = useState(false);

  // Onboarding
  const [onboardForm, setOnboardForm] = useState({
    fullName: '', phone: '', city: '', nationality: '', bio: ''
  });
  const [onboardErr, setOnboardErr] = useState('');
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);

  const STATUS_COLOR: Record<string, string> = {
    waiting_for_worker: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    in_progress:        'text-blue-400 bg-blue-500/10 border-blue-500/20',
    completed:          'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    cancelled:          'text-zinc-500 bg-zinc-800 border-zinc-700',
    disputed:           'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      waiting_for_worker: 'بانتظار عامل',
      in_progress: 'جاري التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      disputed: 'متنازع عليه',
    };
    return labels[s] ?? s;
  };

  useEffect(() => {
    if (!user) return;
    fetchWorkerProfile();
    fetchFeedTasks();
    fetchMyTasks();

    const ch = supabase
      .channel('worker-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        const updated = payload.new as Task | undefined;
        if (payload.eventType === 'INSERT' && updated?.status === 'waiting_for_worker') {
          setFeedTasks(prev => [updated, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setFeedTasks(prev =>
            updated?.status === 'waiting_for_worker'
              ? prev.map(t => t.id === updated.id ? updated : t)
              : prev.filter(t => t.id !== updated?.id)
          );
          setMyTasks(prev =>
            updated?.worker_id === user.id
              ? prev.map(t => t.id === updated.id ? updated : t)
              : prev
          );
          setSelectedTask(prev => prev?.id === updated?.id ? updated ?? prev : prev);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const fetchWorkerProfile = async () => {
    const { data } = await supabase
      .from('worker_profiles').select('*').eq('user_id', user!.id).maybeSingle();
    setWorkerProfile(data as WorkerProfile | null);
    setLoading(false);
  };

  const fetchFeedTasks = async () => {
    const { data } = await supabase
      .from('tasks').select('*').eq('status', 'waiting_for_worker')
      .order('created_at', { ascending: false });
    setFeedTasks(data as Task[] || []);
  };

  const fetchMyTasks = async () => {
    const { data } = await supabase
      .from('tasks').select('*').eq('worker_id', user!.id)
      .order('created_at', { ascending: false });
    setMyTasks(data as Task[] || []);
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setView('task-detail');
  };

  const toggleAvailability = async () => {
    if (!workerProfile) return;
    setTogglingAvail(true);
    const next: AvailabilityStatus =
      workerProfile.availability_status === 'online' ? 'offline' : 'online';
    await supabase
      .from('worker_profiles')
      .update({ availability_status: next, is_online: next === 'online' })
      .eq('id', workerProfile.id);
    setWorkerProfile(prev => prev
      ? { ...prev, availability_status: next, is_online: next === 'online' }
      : null);
    setTogglingAvail(false);
  };

  const submitAcceptWithPrice = async () => {
    if (!selectedTask || !user) return;
    const price = parseFloat(workerPriceInput);
    if (!workerPriceInput || isNaN(price) || price <= 0) return;
    setAcceptingTask(true);
    setShowPricePrompt(false);

    const { data } = await supabase.rpc('accept_task', {
      p_task_id: selectedTask.id,
      p_worker_id: user.id,
      p_worker_price: price,
    });

    if (data === 'ok') {
      const updated = {
        ...selectedTask,
        worker_id: user.id,
        status: 'in_progress' as const,
        worker_price: price,
        negotiation_status: 'pending' as const,
      };
      setSelectedTask(updated);
      setFeedTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      setMyTasks(prev => [updated, ...prev.filter(t => t.id !== selectedTask.id)]);
    }
    setWorkerPriceInput('');
    setAcceptingTask(false);
  };

  const resolveNegotiation = async (resolution: 'accepted' | 'rejected') => {
    if (!selectedTask || !user) return;
    setResolvingNeg(true);
    const { data } = await supabase.rpc('resolve_negotiation', {
      p_task_id: selectedTask.id,
      p_resolution: resolution,
      p_resolved_by: user.id,
    });
    if (data === 'ok') {
      setSelectedTask(prev => prev ? {
        ...prev,
        negotiation_status: resolution,
        final_price: resolution === 'accepted' ? prev.worker_price : prev.final_price,
      } : null);
    }
    setResolvingNeg(false);
  };

  const submitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardErr('');
    if (!onboardForm.fullName.trim()) { setOnboardErr('اكتب اسمك الكامل.'); return; }
    if (!onboardForm.phone.trim())    { setOnboardErr('اكتب رقم جوالك.'); return; }
    if (!onboardForm.city.trim())     { setOnboardErr('اكتب مدينتك.'); return; }
    setOnboardSubmitting(true);
    await supabase.from('worker_profiles').insert({
      user_id: user!.id,
      full_name: onboardForm.fullName.trim(),
      phone: onboardForm.phone.trim(),
      city: onboardForm.city.trim(),
      nationality: onboardForm.nationality.trim(),
      bio: onboardForm.bio.trim(),
      availability_status: 'offline',
      is_online: false,
      skills: [],
    });
    await supabase.from('profiles').update({ role: 'worker' }).eq('id', user!.id);
    await refreshProfile();
    await fetchWorkerProfile();
    setOnboardSubmitting(false);
  };

  const isOnline = workerProfile?.availability_status === 'online';

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-16">
      <div className="max-w-2xl mx-auto px-4 py-8"><TaskListSkeleton count={4} /></div>
    </div>
  );

  // ── Onboarding ──────────────────────────────────────────────────────────────
  if (!workerProfile) return (
    <div className="min-h-screen bg-[#080808] pt-16 px-4">
      <div className="max-w-md mx-auto py-10">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <Briefcase size={26} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">سجّل كعامل</h1>
        <p className="text-zinc-500 text-sm mb-8">عبّي بياناتك عشان تبدأ تقبل طلبات</p>

        <div className="grid grid-cols-2 gap-2 mb-8">
          {['حدد وقتك وتوفرك بنفسك','اختار الطلبات اللي تناسبك',
            'ابني سمعتك من خلال التقييمات','مجاني تماماً للانضمام'].map(p => (
            <div key={p} className="flex items-start gap-2 bg-[#0d0d0d] border border-zinc-800 rounded-xl p-3">
              <CheckCircle size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-zinc-400 leading-relaxed">{p}</span>
            </div>
          ))}
        </div>

        <form onSubmit={submitOnboarding} className="space-y-4">
          {[
            { key: 'fullName', label: 'الاسم الكامل', ph: 'أحمد العتيبي', type: 'text' },
            { key: 'phone',    label: 'رقم الجوال',   ph: '05XXXXXXXX',   type: 'tel' },
            { key: 'city',     label: 'المدينة',       ph: 'الرياض',       type: 'text' },
            { key: 'nationality', label: 'الجنسية',    ph: 'سعودي',        type: 'text' },
          ].map(({ key, label, ph, type }) => (
            <div key={key}>
              <label className="block text-xs text-zinc-500 mb-1.5 font-medium">{label}</label>
              <input
                type={type} placeholder={ph}
                value={onboardForm[key as keyof typeof onboardForm]}
                onChange={e => setOnboardForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
          ))}
          {onboardErr && (
            <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">{onboardErr}</div>
          )}
          <Button type="submit" size="lg" className="w-full" loading={onboardSubmitting}>
            <Briefcase size={15} /> {onboardSubmitting ? 'يسجّل...' : 'سجّل الحين'}
          </Button>
        </form>
      </div>
    </div>
  );

  // ── Pending ─────────────────────────────────────────────────────────────────
  if (!workerProfile.is_approved) return (
    <div className="min-h-screen bg-[#080808] pt-16 flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
          <Clock size={24} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">طلبك قيد المراجعة</h2>
        <p className="text-zinc-500 text-sm leading-relaxed">
          راح نوافق عليك قريباً وتقدر تبدأ تقبل طلبات.
        </p>
      </div>
    </div>
  );

  // ── Main Dashboard ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] pt-16">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {view !== 'task-detail' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl font-bold text-white">لوحة الشغل</h1>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                  <Star size={11} className="text-amber-400" />
                  {workerProfile.rating > 0 ? workerProfile.rating.toFixed(1) : '—'}
                  {' · '}{workerProfile.completed_tasks} طلب منجز
                </div>
              </div>
              <button
                onClick={toggleAvailability}
                disabled={togglingAvail}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  isOnline
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                }`}
              >
                {togglingAvail
                  ? <Loader2 size={14} className="animate-spin" />
                  : isOnline
                  ? <><Wifi size={14} /> متاح</>
                  : <><WifiOff size={14} /> أوفلاين</>}
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'منجز', value: workerProfile.completed_tasks, color: 'text-amber-400' },
                { label: 'التقييم', value: workerProfile.rating > 0 ? `${workerProfile.rating.toFixed(1)}★` : '—', color: 'text-white' },
                { label: 'المكاسب', value: `${workerProfile.total_earnings.toLocaleString('ar')} ر`, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-3 text-center">
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Nav tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-5">
              {[
                { id: 'feed',     label: 'الطلبات المتاحة', icon: TrendingUp, badge: feedTasks.length },
                { id: 'my-tasks', label: 'شغلي',             icon: Briefcase,  badge: myTasks.filter(t => t.status === 'in_progress').length },
                { id: 'schedule', label: 'جدولي',             icon: Calendar,   badge: 0 },
                { id: 'profile',  label: 'بروفايلي',          icon: User,       badge: 0 },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setView(tab.id as View)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      view === tab.id
                        ? 'bg-zinc-700 text-white'
                        : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className="bg-amber-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Feed ────────────────────────────────────────────────── */}
        {view === 'feed' && (
          <div className="space-y-3">
            {!isOnline && (
              <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-zinc-500 mb-4">
                <WifiOff size={14} />
                أنت أوفلاين — فعّل التوفر عشان تشوف الطلبات الجديدة
              </div>
            )}
            {feedTasks.length === 0 ? (
              <div className="text-center py-16">
                <TrendingUp size={24} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">ما في طلبات متاحة الحين</p>
                <p className="text-zinc-700 text-xs mt-1">اتأكد أنك متاح وانتظر</p>
              </div>
            ) : feedTasks.map(task => (
              <button
                key={task.id}
                onClick={() => openTask(task)}
                className="w-full bg-[#0d0d0d] border border-zinc-800 hover:border-amber-500/30 rounded-2xl p-5 text-right transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-amber-500/15 border border-amber-500/25 text-amber-400 rounded-full px-2 py-0.5 font-medium">جديد</span>
                      {task.ai_price_min && (
                        <span className="text-xs text-zinc-500">
                          نطاق: {task.ai_price_min}–{task.ai_price_max} ريال
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white mb-1 leading-snug">{task.title}</h3>
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-2">{task.description}</p>
                    <div className="text-xs text-zinc-600 flex items-center gap-1">
                      <Clock size={11} /> {timeAgo(task.created_at, lang)}
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <div className="text-sm font-bold text-amber-400 mb-1">
                      {task.estimated_price_min}–{task.estimated_price_max} ر
                    </div>
                    <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-400 transition-colors ms-auto" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── My Tasks ────────────────────────────────────────────── */}
        {view === 'my-tasks' && (
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase size={24} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">ما قبلت أي طلب بعد</p>
              </div>
            ) : myTasks.map(task => (
              <button
                key={task.id}
                onClick={() => openTask(task)}
                className="w-full bg-[#0d0d0d] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 text-right transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[task.status] ?? ''}`}>
                      {statusLabel(task.status)}
                    </span>
                    <h3 className="font-semibold text-white mt-2 mb-1 truncate">{task.title}</h3>
                    <div className="text-xs text-zinc-600">{timeAgo(task.created_at, lang)}</div>
                  </div>
                  <div className="text-sm font-bold text-amber-400">
                    {task.final_price
                      ? `${task.final_price} ريال`
                      : `${task.estimated_price_min}–${task.estimated_price_max} ر`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Schedule ─────────────────────────────────────────────── */}
        {view === 'schedule' && <WorkerSchedule />}

        {/* ── Profile ──────────────────────────────────────────────── */}
        {view === 'profile' && user && (
          <WorkerPublicProfile workerId={user.id} />
        )}

        {/* ── Task Detail ──────────────────────────────────────────── */}
        {view === 'task-detail' && selectedTask && (
          <div>
            <button
              onClick={() => setView('my-tasks')}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-5"
            >
              <ArrowRight size={14} /> رجوع
            </button>

            {/* Task Info */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-bold text-white text-base leading-snug flex-1">{selectedTask.title}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${STATUS_COLOR[selectedTask.status] ?? ''}`}>
                  {statusLabel(selectedTask.status)}
                </span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed mb-4">{selectedTask.description}</p>

              {/* Price info */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800">
                <div className="text-center">
                  <div className="text-xs text-zinc-600 mb-1">ميزانية العميل</div>
                  <div className="text-sm font-bold text-white">{selectedTask.client_price} ر</div>
                </div>
                {selectedTask.ai_price_min && (
                  <div className="text-center">
                    <div className="text-xs text-zinc-600 mb-1">نطاق AI</div>
                    <div className="text-sm font-bold text-amber-400">
                      {selectedTask.ai_price_min}–{selectedTask.ai_price_max}
                    </div>
                  </div>
                )}
                {selectedTask.final_price && (
                  <div className="text-center">
                    <div className="text-xs text-zinc-600 mb-1">السعر المتفق</div>
                    <div className="text-sm font-bold text-emerald-400">{selectedTask.final_price} ر</div>
                  </div>
                )}
              </div>
            </div>

            {/* Accept with price */}
            {selectedTask.status === 'waiting_for_worker' && !selectedTask.worker_id && (
              <div className="mb-4">
                {!showPricePrompt ? (
                  <Button onClick={() => setShowPricePrompt(true)} className="w-full" size="lg">
                    <Zap size={15} /> اقبل الطلب
                  </Button>
                ) : (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet size={14} className="text-amber-400" />
                      <p className="text-sm font-semibold text-white">كم تطلب مقابل هذا الطلب؟</p>
                    </div>
                    {selectedTask.ai_price_min && (
                      <div className="text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2 mb-4">
                        🤖 الذكاء الاصطناعي يقترح: {selectedTask.ai_price_min}–{selectedTask.ai_price_max} ريال
                      </div>
                    )}
                    <div className="flex gap-2 items-center mb-4">
                      <input
                        type="number" min="1" autoFocus
                        value={workerPriceInput}
                        onChange={e => setWorkerPriceInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitAcceptWithPrice()}
                        placeholder="مثال: 80"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-amber-500/50"
                      />
                      <span className="text-sm text-zinc-500">ريال</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={submitAcceptWithPrice} loading={acceptingTask}
                        disabled={!workerPriceInput || parseFloat(workerPriceInput) <= 0}
                        className="flex-1"
                      >
                        <CheckCircle size={14} /> قبول وإرسال السعر
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setShowPricePrompt(false); setWorkerPriceInput(''); }}
                        className="px-4"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Negotiation panel */}
            {selectedTask.negotiation_status === 'pending' && selectedTask.worker_id === user?.id && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Scale size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-white">التفاوض على السعر</span>
                  <span className="text-xs bg-amber-500/15 text-amber-400 rounded-full px-2 py-0.5 ms-auto">في الانتظار</span>
                </div>
                <div className="text-sm text-zinc-400 mb-3">
                  عرضك: <span className="text-white font-bold">{selectedTask.worker_price} ريال</span>
                  {' '} — ميزانية العميل: <span className="text-amber-400">{selectedTask.client_price} ريال</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveNegotiation('accepted')} disabled={resolvingNeg}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl py-2.5 text-sm font-semibold transition-all"
                  >
                    <ThumbsUp size={14} /> قبول
                  </button>
                  <button
                    onClick={() => resolveNegotiation('rejected')} disabled={resolvingNeg}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl py-2.5 text-sm font-semibold transition-all"
                  >
                    <ThumbsDown size={14} /> رفض
                  </button>
                </div>
              </div>
            )}

            {/* SmartChat — replaces old chat */}
            <div className="h-[520px]">
              <SmartChat
                taskId={selectedTask.id}
                taskStatus={selectedTask.status}
                isWorker={true}
                clientPrice={selectedTask.client_price}
                workerPrice={selectedTask.worker_price}
                negotiationStatus={selectedTask.negotiation_status}
                finalPrice={selectedTask.final_price}
                aiPriceMin={selectedTask.ai_price_min}
                aiPriceMax={selectedTask.ai_price_max}
                onNegotiationResolve={resolveNegotiation}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
