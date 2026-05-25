import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, MessageCircle, Loader2, Upload, CheckCircle, Clock, ChevronRight, Plus, Image, ArrowLeft, ShieldAlert, Wallet, Scale, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useApp } from '../contexts/AppContext';
import { Task, TaskMessage, ParsedTask, TaskFile } from '../types';
import { Button } from '../components/ui/Button';
import { timeAgo } from '../lib/i18n';
import { TaskStatusBar } from '../components/task/TaskStatusBar';
import { CustomerOnboard } from './CustomerOnboard';
import { useIsVerified } from '../components/ui/VerificationBanner';
import { TaskListSkeleton } from '../components/ui/Skeleton';

type View = 'home' | 'new-task' | 'task-detail';

interface AIMessage {
  role: 'user' | 'assistant' | 'parsed';
  content: string;
  parsedTask?: ParsedTask;
}

const STATUS_COLOR: Record<string, string> = {
  waiting_for_worker: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-zinc-500 bg-zinc-800 border-zinc-700',
  disputed: 'text-red-400 bg-red-500/10 border-red-500/20',
  pending: 'text-zinc-400 bg-zinc-800 border-zinc-700',
  ai_processing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export function UserDashboard() {
  const { user } = useAuth();
  const isVerified = useIsVerified();
  const { lang, isRTL } = useLanguage();
  const { navigate } = useApp();
  const [view, setView] = useState<View>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);

  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [clientBudget, setClientBudget] = useState('');
  const [resolvingNeg, setResolvingNeg] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Realtime channel refs — cleaned up on unmount / task change
  const taskChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const t = (key: string) => {
    const ar: Record<string, string> = {
      home: 'الرئيسية',
      active_task: 'طلبك المباشر',
      no_active: 'ما عندك طلب مباشر الحين',
      no_active_sub: 'اكتب اللي تبيه وابدأ في ثواني.',
      start_now: 'اطلب الحين',
      past_tasks: 'طلباتك السابقة',
      new_task: 'طلب جديد',
      write_task: 'اكتب طلبك',
      write_task_sub: 'بأي كلام — عربي أو إنجليزي',
      ai_greeting: 'هلا! اكتبلي اللي تبيه بأي كلام وأنا أرتبه لك.',
      ai_placeholder: 'اكتب اللي تبيه...',
      ai_structured: 'رتبت لك الطلب. شوف:',
      ai_rephrase: 'ما فهمت. عيد اكتب طلبك بشكل ثاني.',
      ai_error: 'صار خطأ. جرب مرة ثانية.',
      ai_label: 'مساعد AI',
      ai_post: 'أرسل الطلب',
      ai_refine: 'عدّل',
      ai_refine_msg: 'لا بأس! زيد تفاصيل.',
      cancel: 'إلغاء',
      back: 'ارجع',
      chat_title: 'المحادثة',
      chat_placeholder: 'اكتب رسالة...',
      chat_waiting: 'ندور لك شخص...',
      chat_empty: 'ما في رسائل بعد.',
      status_waiting_for_worker: 'ندور لك شخص',
      status_in_progress: 'قاعد يشتغل',
      status_completed: 'خلص',
      status_cancelled: 'ملغي',
      status_pending: 'في الانتظار',
      status_ai_processing: 'يعالج',
      status_disputed: 'فيه مشكلة',
      confirm_done: 'تأكيد الإنجاز',
      confirming: 'يؤكد...',
      proof_title: 'صور وملفات التسليم',
      proof_empty: 'العامل ما رفع صور بعد.',
      est_price: 'السعر التقريبي',
      worker_assigned: 'العامل',
      task_live: 'مباشر',
      loading: 'يحمّل...',
    };
    const en: Record<string, string> = {
      home: 'Home',
      active_task: 'Your Live Task',
      no_active: 'No active task right now',
      no_active_sub: 'Write what you need and start in seconds.',
      start_now: 'Request Now',
      past_tasks: 'Past Tasks',
      new_task: 'New Task',
      write_task: 'Write your task',
      write_task_sub: 'In any language — Arabic or English',
      ai_greeting: "Hi! Tell me what you need in plain words and I'll structure it for you.",
      ai_placeholder: 'Write what you need…',
      ai_structured: "Here's your structured task:",
      ai_rephrase: "Could you rephrase that? I didn't quite understand.",
      ai_error: 'Something went wrong. Try again.',
      ai_label: 'AI Assistant',
      ai_post: 'Post Task',
      ai_refine: 'Refine',
      ai_refine_msg: "No problem! Add more details.",
      cancel: 'Cancel',
      back: 'Back',
      chat_title: 'Chat',
      chat_placeholder: 'Send a message…',
      chat_waiting: 'Finding you a worker…',
      chat_empty: 'No messages yet.',
      status_waiting_for_worker: 'Finding Worker',
      status_in_progress: 'In Progress',
      status_completed: 'Completed',
      status_cancelled: 'Cancelled',
      status_pending: 'Pending',
      status_ai_processing: 'Processing',
      status_disputed: 'Disputed',
      confirm_done: 'Confirm Completion',
      confirming: 'Confirming…',
      proof_title: 'Delivery Photos & Files',
      proof_empty: 'Worker has not uploaded proof yet.',
      est_price: 'Est. Price',
      worker_assigned: 'Worker',
      task_live: 'Live',
      loading: 'Loading…',
    };
    return (lang === 'ar' ? ar[key] : en[key]) ?? key;
  };

  const formatSAR = (min: number, max: number) =>
    lang === 'ar'
      ? `${min.toLocaleString('ar-SA')}–${max.toLocaleString('ar-SA')} ريال`
      : `SAR ${min.toLocaleString()}–${max.toLocaleString()}`;

  useEffect(() => {
    if (user) {
      fetchTasks();
      setAiMessages([{ role: 'assistant', content: t('ai_greeting') }]);
      // Realtime: listen for changes on user's own tasks
      const ch = supabase
        .channel(`user-tasks-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        }, payload => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t));
            setSelectedTask(prev => prev?.id === (payload.new as Task).id ? payload.new as Task : prev);
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as Task).id));
          }
        })
        .subscribe();
      taskChannelRef.current = ch;
      return () => { supabase.removeChannel(ch); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Separate effect for lang change — just refresh greeting
  useEffect(() => {
    setAiMessages([{ role: 'assistant', content: t('ai_greeting') }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Realtime: subscribe to messages for the selected task
  useEffect(() => {
    if (!selectedTask) return;
    fetchMessages(selectedTask.id);

    const ch = supabase
      .channel(`task-messages-${selectedTask.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_messages',
        filter: `task_id=eq.${selectedTask.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as TaskMessage]);
      })
      .subscribe();
    msgChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiMessages]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setTasks((data as Task[]) || []);
    setLoadingTasks(false);
  };

  const fetchMessages = async (taskId: string) => {
    const { data } = await supabase
      .from('task_messages')
      .select('*, profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    setMessages((data as TaskMessage[]) || []);
  };

  const fetchFiles = async (taskId: string) => {
    const { data } = await supabase
      .from('task_files')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    setFiles((data as TaskFile[]) || []);
  };

  const openTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setView('task-detail');
    fetchFiles(task.id);
    // fetchMessages is called via the selectedTask effect (realtime subscription)
  }, []);

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ request: userMsg }),
      });
      if (res.ok) {
        const parsed: ParsedTask = await res.json();
        setParsedTask(parsed);
        setAiMessages(prev => [...prev, { role: 'parsed', content: t('ai_structured'), parsedTask: parsed }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: t('ai_rephrase') }]);
      }
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: t('ai_error') }]);
    }
    setAiLoading(false);
  };

  const submitTask = async () => {
    if (!parsedTask || !user) return;
    const budget = parseFloat(clientBudget);
    if (!clientBudget || isNaN(budget) || budget <= 0) {
      // Scroll to budget input — handled by UI validation below
      return;
    }
    setSubmittingTask(true);
    const originalRequest = aiMessages.find(m => m.role === 'user')?.content || '';
    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: parsedTask.title,
      original_request: originalRequest,
      description: parsedTask.description,
      category: parsedTask.category,
      status: 'waiting_for_worker',
      urgency: parsedTask.urgency,
      estimated_price_min: parsedTask.suggested_price_min,
      estimated_price_max: parsedTask.suggested_price_max,
      client_price: budget,
      requires_verification: parsedTask.requires_verification,
      ai_processed: true,
    }).select().maybeSingle();

    if (!error && data) {
      await fetchTasks();
      setSelectedTask(data as Task);
      setView('task-detail');
      fetchMessages((data as Task).id);
      setAiMessages([{ role: 'assistant', content: t('ai_greeting') }]);
      setParsedTask(null);
      setClientBudget('');
    }
    setSubmittingTask(false);
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

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedTask || sendingMessage) return;
    setSendingMessage(true);
    const content = chatInput.trim();
    setChatInput('');
    await supabase.from('task_messages').insert({ task_id: selectedTask.id, sender_id: user!.id, content });
    await fetchMessages(selectedTask.id);
    setSendingMessage(false);
  };

  const confirmCompletion = async () => {
    if (!selectedTask) return;
    setConfirming(true);
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', selectedTask.id);
    setSelectedTask(prev => prev ? { ...prev, status: 'completed' } : null);
    await fetchTasks();
    setConfirming(false);
  };

  const activeTask = tasks.find(t => ['waiting_for_worker', 'in_progress', 'ai_processing', 'pending'].includes(t.status));
  const pastTasks = tasks.filter(t => ['completed', 'cancelled', 'disputed'].includes(t.status));

  const BackIcon = isRTL ? ChevronRight : ArrowLeft;

  if (loadingTasks) {
    return (
      <div className="min-h-screen bg-[#080808] pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <TaskListSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] pt-16">
      <CustomerOnboard
        open={showOnboard}
        onClose={() => setShowOnboard(false)}
        onSuccess={() => { setShowOnboard(false); fetchTasks(); }}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Home ── */}
        {view === 'home' && (
          <div className="space-y-6">
            {/* Active task card */}
            {activeTask ? (
              <div
                onClick={() => openTask(activeTask)}
                className="cursor-pointer bg-[#0d0d0d] border border-amber-500/20 rounded-2xl p-6 hover:border-amber-500/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{t('active_task')}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLOR[activeTask.status]}`}>
                    {t(`status_${activeTask.status}`)}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mb-1 leading-snug">{activeTask.title}</h2>
                <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{activeTask.description}</p>
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(activeTask.created_at, lang)}</span>
                  <span className="text-amber-400 font-medium">{formatSAR(activeTask.estimated_price_min, activeTask.estimated_price_max)}</span>
                </div>
                <div className="mt-4">
                  <TaskStatusBar status={activeTask.status} />
                </div>
              </div>
            ) : (
              <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                  <Sparkles size={24} className="text-amber-500" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">{t('no_active')}</h2>
                <p className="text-sm text-zinc-500 mb-6">{t('no_active_sub')}</p>
                {isVerified ? (
                  <Button size="lg" onClick={() => setView('new-task')}>
                    <Plus size={15} /> {t('start_now')}
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
                    <ShieldAlert size={15} />
                    {lang === 'ar' ? 'يجب التحقق من رقم جوالك أولاً' : 'Phone verification required'}
                  </div>
                )}
              </div>
            )}

            {/* New task button if already has active */}
            {activeTask && isVerified && (
              <button
                onClick={() => setView('new-task')}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-amber-500/40 rounded-2xl py-4 text-sm text-zinc-500 hover:text-amber-400 transition-all"
              >
                <Plus size={15} /> {t('new_task')}
              </button>
            )}

            {/* Past tasks */}
            {pastTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">{t('past_tasks')}</h3>
                <div className="space-y-2">
                  {pastTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => openTask(task)}
                      className="w-full bg-[#0d0d0d] border border-zinc-800 hover:border-zinc-700 rounded-xl px-5 py-4 text-start transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate mb-0.5">{task.title}</div>
                        <div className="text-xs text-zinc-600">{timeAgo(task.created_at, lang)}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLOR[task.status]}`}>
                        {t(`status_${task.status}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── New Task (AI chat) ── */}
        {view === 'new-task' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">{t('write_task')}</h1>
                <p className="text-sm text-zinc-500 mt-0.5">{t('write_task_sub')}</p>
              </div>
              <button onClick={() => setView('home')} className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
                <BackIcon size={14} /> {t('cancel')}
              </button>
            </div>

            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="h-[420px] overflow-y-auto p-5 space-y-4">
                {aiMessages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="bg-amber-500 text-black rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs text-sm font-medium">
                          {msg.content}
                        </div>
                      </div>
                    ) : msg.role === 'parsed' && msg.parsedTask ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Sparkles size={12} className="text-amber-500" />
                          </div>
                          <span className="text-xs text-zinc-500">{t('ai_label')}</span>
                        </div>
                        <p className="text-sm text-zinc-400 mb-3">{msg.content}</p>
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-xl p-4 space-y-2.5">
                          <h3 className="font-semibold text-white text-sm">{msg.parsedTask.title}</h3>
                          <p className="text-xs text-zinc-400 leading-relaxed">{msg.parsedTask.description}</p>
                        </div>

                        {/* Budget input — required before posting */}
                        <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                            <Wallet size={12} />
                            {lang === 'ar' ? 'ميزانيتك (مطلوب)' : 'Your Budget (required)'}
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={clientBudget}
                                onChange={e => setClientBudget(e.target.value)}
                                placeholder={lang === 'ar' ? 'مثال: 50' : 'e.g. 50'}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-colors"
                              />
                            </div>
                            <span className="text-xs text-zinc-500 flex-shrink-0">{lang === 'ar' ? 'ريال' : 'SAR'}</span>
                          </div>
                          {clientBudget && (parseFloat(clientBudget) <= 0 || isNaN(parseFloat(clientBudget))) && (
                            <p className="text-xs text-red-400 mt-1">{lang === 'ar' ? 'أدخل ميزانية صحيحة' : 'Enter a valid budget'}</p>
                          )}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={submitTask}
                            loading={submittingTask}
                            disabled={!clientBudget || parseFloat(clientBudget) <= 0}
                          >
                            <CheckCircle size={13} /> {t('ai_post')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setParsedTask(null);
                            setAiMessages(prev => [...prev, { role: 'assistant', content: t('ai_refine_msg') }]);
                          }}>
                            {t('ai_refine')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Sparkles size={12} className="text-amber-500" />
                          </div>
                          <span className="text-xs text-zinc-500">{t('ai_label')}</span>
                        </div>
                        <div className="text-sm text-zinc-300 bg-zinc-900/50 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Sparkles size={12} className="text-amber-500" />
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-zinc-800 p-4 flex gap-3">
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
                  placeholder={t('ai_placeholder')}
                  disabled={aiLoading}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
                />
                <Button onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading} className="px-4">
                  <Send size={15} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Task Detail ── */}
        {view === 'task-detail' && selectedTask && (
          <div>
            <button onClick={() => { setView('home'); fetchTasks(); }} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6">
              <BackIcon size={14} /> {t('back')}
            </button>

            {/* Status bar */}
            <div className="mb-5">
              <TaskStatusBar status={selectedTask.status} />
            </div>

            {/* Task title */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-bold text-white text-base leading-snug flex-1">{selectedTask.title}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${STATUS_COLOR[selectedTask.status]}`}>
                  {t(`status_${selectedTask.status}`)}
                </span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed mb-4">{selectedTask.description}</p>
              <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-zinc-800 pt-3">
                <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(selectedTask.created_at, lang)}</span>
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Wallet size={11} />
                  {lang === 'ar' ? `ميزانيتك: ${selectedTask.client_price} ريال` : `Budget: ${selectedTask.client_price} SAR`}
                </span>
              </div>
            </div>

            {/* ── Negotiation Panel ── */}
            {selectedTask.worker_price != null && (
              <div className={`rounded-2xl p-5 mb-5 border ${
                selectedTask.negotiation_status === 'accepted'
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : selectedTask.negotiation_status === 'rejected'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-amber-500/5 border-amber-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Scale size={15} className={
                    selectedTask.negotiation_status === 'accepted' ? 'text-emerald-400' :
                    selectedTask.negotiation_status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                  } />
                  <h3 className="text-sm font-semibold text-white">
                    {lang === 'ar' ? 'التفاوض على السعر' : 'Price Negotiation'}
                  </h3>
                  {selectedTask.negotiation_status && (
                    <span className={`ms-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                      selectedTask.negotiation_status === 'accepted'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : selectedTask.negotiation_status === 'rejected'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {selectedTask.negotiation_status === 'accepted'
                        ? (lang === 'ar' ? 'تم الاتفاق' : 'Agreed')
                        : selectedTask.negotiation_status === 'rejected'
                        ? (lang === 'ar' ? 'مرفوض' : 'Rejected')
                        : (lang === 'ar' ? 'في الانتظار' : 'Pending')}
                    </span>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-zinc-500 mb-1">{lang === 'ar' ? 'ميزانيتك' : 'Client Budget'}</p>
                    <p className="text-sm font-bold text-white">{selectedTask.client_price}</p>
                    <p className="text-xs text-zinc-600">{lang === 'ar' ? 'ريال' : 'SAR'}</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-zinc-500 mb-1">{lang === 'ar' ? 'عرض العامل' : 'Worker Price'}</p>
                    <p className="text-sm font-bold text-amber-400">{selectedTask.worker_price}</p>
                    <p className="text-xs text-zinc-600">{lang === 'ar' ? 'ريال' : 'SAR'}</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-zinc-500 mb-1">{lang === 'ar' ? 'النطاق' : 'Range'}</p>
                    <p className="text-xs font-bold text-zinc-300">
                      {Math.min(selectedTask.client_price, selectedTask.worker_price!)}–{Math.max(selectedTask.client_price, selectedTask.worker_price!)}
                    </p>
                    <p className="text-xs text-zinc-600">{lang === 'ar' ? 'ريال' : 'SAR'}</p>
                  </div>
                </div>

                {/* Negotiation range banner */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 mb-4 text-center">
                  <p className="text-xs text-zinc-400">
                    {lang === 'ar' ? 'نطاق التفاوض:' : 'Negotiation Range:'}{' '}
                    <span className="font-bold text-white">
                      {Math.min(selectedTask.client_price, selectedTask.worker_price!)} – {Math.max(selectedTask.client_price, selectedTask.worker_price!)} {lang === 'ar' ? 'ريال' : 'SAR'}
                    </span>
                  </p>
                </div>

                {/* Action buttons — only when pending */}
                {selectedTask.negotiation_status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveNegotiation('accepted')}
                      disabled={resolvingNeg}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      <ThumbsUp size={14} /> {lang === 'ar' ? 'قبول السعر' : 'Accept Deal'}
                    </button>
                    <button
                      onClick={() => resolveNegotiation('rejected')}
                      disabled={resolvingNeg}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      <ThumbsDown size={14} /> {lang === 'ar' ? 'رفض السعر' : 'Reject Deal'}
                    </button>
                  </div>
                )}

                {selectedTask.negotiation_status === 'accepted' && selectedTask.final_price != null && (
                  <div className="text-center text-sm text-emerald-400 font-semibold">
                    {lang === 'ar' ? `تم الاتفاق على: ${selectedTask.final_price} ريال` : `Agreed price: ${selectedTask.final_price} SAR`}
                  </div>
                )}

                {selectedTask.negotiation_status === 'rejected' && (
                  <div className="text-center text-xs text-zinc-500">
                    {lang === 'ar' ? 'تفاوض عبر المحادثة للوصول لسعر مناسب.' : 'Negotiate via chat to reach an agreed price.'}
                  </div>
                )}
              </div>
            )}

            {/* Proof / uploaded files */}
            {files.length > 0 && (
              <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Image size={14} className="text-zinc-500" /> {t('proof_title')}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {files.map(file => (
                    <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer"
                      className="aspect-square bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center hover:border-zinc-700 transition-colors overflow-hidden">
                      {file.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2">
                          <Upload size={16} className="text-zinc-600 mx-auto mb-1" />
                          <span className="text-xs text-zinc-600 truncate block">{file.file_name}</span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {files.length === 0 && selectedTask.status === 'in_progress' && (
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                <Image size={14} className="text-zinc-600 flex-shrink-0" />
                <p className="text-xs text-zinc-600">{t('proof_empty')}</p>
              </div>
            )}

            {/* Confirm completion */}
            {selectedTask.status === 'in_progress' && (
              <div className="mb-5">
                <Button onClick={confirmCompletion} loading={confirming} className="w-full" size="lg" variant="secondary">
                  <CheckCircle size={15} /> {confirming ? t('confirming') : t('confirm_done')}
                </Button>
              </div>
            )}

            {/* Chat */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
                <MessageCircle size={14} className="text-zinc-500" />
                <h3 className="text-sm font-semibold text-white">{t('chat_title')}</h3>
              </div>

              <div className="h-72 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle size={20} className="text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-600">
                      {selectedTask.status === 'waiting_for_worker' ? t('chat_waiting') : t('chat_empty')}
                    </p>
                  </div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    {msg.is_system_message ? (
                      <div className="text-xs text-zinc-600 bg-zinc-900/50 border border-zinc-800 rounded-full px-3 py-1 mx-auto">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.sender_id === user?.id
                          ? 'bg-amber-500 text-black rounded-tr-sm font-medium'
                          : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-zinc-800 p-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={selectedTask.worker_id ? t('chat_placeholder') : t('chat_waiting')}
                  disabled={!selectedTask.worker_id || sendingMessage}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors disabled:opacity-40"
                />
                <Button onClick={sendMessage} disabled={!chatInput.trim() || !selectedTask.worker_id || sendingMessage} className="px-4">
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating new task button on home — only for verified users */}
      {view === 'home' && isVerified && (
        <button
          onClick={() => setView('new-task')}
          className="fixed bottom-6 end-6 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-xl shadow-amber-500/30 flex items-center justify-center transition-all active:scale-95 z-30"
        >
          <Plus size={22} />
        </button>
      )}
    </div>
  );
}
