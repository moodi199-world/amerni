/**
 * AdminPanel.tsx — لوحة الأدمن الكاملة
 * يشمل: كل الطلبات، المحادثات، العمال، المستخدمين، الرسائل المحجوبة، الإحصائيات
 */
import { useState, useEffect, useRef } from 'react';
import {
  Users, Briefcase, Shield, CheckCircle, XCircle, Loader2,
  Search, AlertTriangle, BarChart3, MessageCircle, Star,
  Send, Eye, Ban, ShieldAlert, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Profile, Task, WorkerProfile, TaskMessage } from '../types';
import { Button } from '../components/ui/Button';
import { timeAgo } from '../lib/i18n';

type View = 'overview' | 'tasks' | 'workers' | 'users' | 'conversations' | 'blocked';

interface WorkerWithProfile extends WorkerProfile {
  profiles: Profile;
}

interface Rating {
  id: string;
  task_id: string;
  worker_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

interface BlockedMessage {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  reason: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  waiting_for_worker: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_progress:        'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed:          'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled:          'text-zinc-500 bg-zinc-800 border-zinc-700',
  disputed:           'text-red-400 bg-red-500/10 border-red-500/20',
  ai_processing:      'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const STATUS_AR: Record<string, string> = {
  waiting_for_worker: 'بانتظار عامل',
  in_progress: 'جاري التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  disputed: 'متنازع',
  ai_processing: 'يعالج AI',
};

export function AdminPanel() {
  const { lang } = useLanguage();
  const [view, setView] = useState<View>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<WorkerWithProfile[]>([]);
  const [blockedMessages, setBlockedMessages] = useState<BlockedMessage[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [taskMessages]);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: u },
      { data: tsk },
      { data: w },
      { data: bl },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('worker_profiles').select('*, profiles(*)').order('created_at', { ascending: false }),
      supabase.from('blocked_messages').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setUsers(u as Profile[] || []);
    setTasks(tsk as Task[] || []);
    setWorkers(w as WorkerWithProfile[] || []);
    setBlockedMessages(bl as BlockedMessage[] || []);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const openConversation = async (task: Task) => {
    setSelectedTask(task);
    setView('conversations');
    const { data } = await supabase
      .from('task_messages')
      .select('*, profiles(full_name)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    setTaskMessages(data as TaskMessage[] || []);
  };

  const sendAdminReply = async () => {
    if (!adminReply.trim() || !selectedTask) return;
    setSendingReply(true);
    const { data: adminProfile } = await supabase
      .from('profiles').select('id').eq('role', 'admin').single();
    await supabase.from('task_messages').insert({
      task_id: selectedTask.id,
      sender_id: adminProfile?.id,
      content: `[إدارة أمرني] ${adminReply.trim()}`,
      is_system_message: true,
    });
    setAdminReply('');
    const { data } = await supabase
      .from('task_messages')
      .select('*, profiles(full_name)')
      .eq('task_id', selectedTask.id)
      .order('created_at', { ascending: true });
    setTaskMessages(data as TaskMessage[] || []);
    setSendingReply(false);
  };

  const approveWorker = async (workerId: string) => {
    await supabase.from('worker_profiles')
      .update({ is_approved: true, verification_level: 'verified' })
      .eq('id', workerId);
    setWorkers(prev => prev.map(w =>
      w.id === workerId ? { ...w, is_approved: true, verification_level: 'verified' } : w
    ));
  };

  const rejectWorker = async (workerId: string) => {
    await supabase.from('worker_profiles')
      .update({ is_approved: false, verification_level: 'none' })
      .eq('id', workerId);
    setWorkers(prev => prev.map(w =>
      w.id === workerId ? { ...w, is_approved: false, verification_level: 'none' } : w
    ));
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: status as any } : null);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────
  const stats = {
    totalUsers:      users.length,
    totalWorkers:    workers.length,
    pendingWorkers:  workers.filter(w => !w.is_approved).length,
    activeTasks:     tasks.filter(t => t.status === 'in_progress').length,
    completedTasks:  tasks.filter(t => t.status === 'completed').length,
    disputedTasks:   tasks.filter(t => t.status === 'disputed').length,
    waitingTasks:    tasks.filter(t => t.status === 'waiting_for_worker').length,
    blockedMsgs:     blockedMessages.length,
    revenue:         tasks.filter(t => t.status === 'completed')
                       .reduce((sum, t) => sum + (t.final_price || 0) * 0.01, 0),
  };

  // ── Filters ────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredWorkers = workers.filter(w =>
    (w.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    w.city?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-zinc-600" />
    </div>
  );

  const TABS = [
    { id: 'overview',       label: 'نظرة عامة',  icon: BarChart3,      badge: 0 },
    { id: 'tasks',          label: 'الطلبات',     icon: Briefcase,      badge: tasks.length },
    { id: 'conversations',  label: 'المحادثات',   icon: MessageCircle,  badge: stats.disputedTasks },
    { id: 'workers',        label: 'العمال',      icon: Shield,         badge: stats.pendingWorkers },
    { id: 'users',          label: 'المستخدمين',  icon: Users,          badge: 0 },
    { id: 'blocked',        label: 'المحجوب',     icon: Ban,            badge: stats.blockedMsgs },
  ] as const;

  return (
    <div className="min-h-screen bg-[#080808] pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <Shield size={18} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">لوحة الإدارة</h1>
              <p className="text-xs text-zinc-500">لوحة إدارة أمرني</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-6">
          {TABS.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => { setView(id); setSearch(''); setSelectedTask(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                view === id
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
              }`}
            >
              <Icon size={13} /> {label}
              {badge > 0 && (
                <span className={`text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold ${
                  id === 'workers' ? 'bg-amber-500 text-black' :
                  id === 'conversations' ? 'bg-red-500 text-white' :
                  'bg-zinc-600 text-white'
                }`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────────────────── */}
        {view === 'overview' && (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'المستخدمون',      value: stats.totalUsers,     color: 'text-white',      sub: 'مسجل' },
                { label: 'العمال الموثقون',  value: workers.filter(w => w.is_approved).length, color: 'text-emerald-400', sub: 'نشط' },
                { label: 'طلبات جارية',      value: stats.activeTasks,    color: 'text-amber-400',  sub: 'قيد التنفيذ' },
                { label: 'طلبات متنازع',     value: stats.disputedTasks,  color: 'text-red-400',    sub: 'تحتاج انتباه' },
                { label: 'طلبات منجزة',      value: stats.completedTasks, color: 'text-emerald-400',sub: 'اكتملت' },
                { label: 'بانتظار عامل',     value: stats.waitingTasks,   color: 'text-blue-400',   sub: 'منشورة' },
                { label: 'رسائل محجوبة',     value: stats.blockedMsgs,    color: 'text-orange-400', sub: 'فلتر التواصل' },
                { label: 'عمولة متوقعة',     value: `${Math.round(stats.revenue)} ر`, color: 'text-amber-400', sub: '1% من المنجز' },
              ].map(s => (
                <div key={s.label} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
                  <div className={`text-2xl font-black mb-1 ${s.color}`}>{s.value}</div>
                  <div className="text-sm font-medium text-white mb-0.5">{s.label}</div>
                  <div className="text-xs text-zinc-600">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Pending workers alert */}
            {stats.pendingWorkers > 0 && (
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h3 className="font-semibold text-white">طلبات عمال تنتظر موافقتك</h3>
                  <span className="bg-amber-500/15 text-amber-400 text-xs rounded-full px-2 py-0.5 font-bold">
                    {stats.pendingWorkers}
                  </span>
                </div>
                <div className="space-y-2">
                  {workers.filter(w => !w.is_approved).slice(0, 5).map(w => (
                    <div key={w.id} className="flex items-center justify-between bg-[#0d0d0d] border border-zinc-800 rounded-xl px-4 py-3 gap-4">
                      <div>
                        <div className="text-sm font-medium text-white">{w.profiles?.full_name || '—'}</div>
                        <div className="text-xs text-zinc-600">{w.city} · {timeAgo(w.created_at, lang)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveWorker(w.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/20 transition-colors">
                          <CheckCircle size={12} /> موافقة
                        </button>
                        <button onClick={() => rejectWorker(w.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors">
                          <XCircle size={12} /> رفض
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disputed tasks */}
            {stats.disputedTasks > 0 && (
              <div className="bg-red-950/20 border border-red-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h3 className="font-semibold text-white">طلبات متنازع عليها</h3>
                  <span className="bg-red-500/15 text-red-400 text-xs rounded-full px-2 py-0.5 font-bold">{stats.disputedTasks}</span>
                </div>
                {tasks.filter(t => t.status === 'disputed').map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-[#0d0d0d] border border-zinc-800 rounded-xl px-4 py-3 gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{task.title}</div>
                      <div className="text-xs text-zinc-600">{timeAgo(task.created_at, lang)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openConversation(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-lg">
                        <Eye size={12} /> شاهد المحادثة
                      </button>
                      <button onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg">
                        <CheckCircle size={12} /> حل النزاع
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent tasks */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">آخر الطلبات</h3>
              <div className="space-y-2">
                {tasks.slice(0, 10).map(task => (
                  <div key={task.id}
                    className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0 cursor-pointer hover:bg-zinc-800/20 rounded-lg px-2 transition-colors"
                    onClick={() => openConversation(task)}>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_COLORS[task.status] ?? ''}`}>
                      {STATUS_AR[task.status] ?? task.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-200 truncate">{task.title}</div>
                    </div>
                    <div className="text-xs text-zinc-600 flex-shrink-0">{timeAgo(task.created_at, lang)}</div>
                    <Eye size={13} className="text-zinc-700 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tasks ────────────────────────────────────────────────── */}
        {view === 'tasks' && (
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="بحث في الطلبات..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pr-9 pl-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-700"
                />
              </div>
              <select
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              >
                <option value="all">كل الحالات</option>
                {Object.entries(STATUS_AR).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {filteredTasks.map(task => (
                <div key={task.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[task.status] ?? ''}`}>
                          {STATUS_AR[task.status] ?? task.status}
                        </span>
                        <span className="text-xs text-zinc-600">{task.category}</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1 truncate">{task.title}</h3>
                      <p className="text-sm text-zinc-500 line-clamp-1">{task.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-600 mt-2">
                        <span>ميزانية: <span className="text-amber-400">{task.client_price} ريال</span></span>
                        {task.final_price && <span>متفق: <span className="text-emerald-400">{task.final_price} ريال</span></span>}
                        <span>{timeAgo(task.created_at, lang)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => openConversation(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                      >
                        <Eye size={12} /> المحادثة
                      </button>
                      {task.status === 'disputed' && (
                        <>
                          <button onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg">
                            <CheckCircle size={12} /> حل
                          </button>
                          <button onClick={() => updateTaskStatus(task.id, 'cancelled')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg">
                            <XCircle size={12} /> إلغاء
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Conversations ────────────────────────────────────────── */}
        {view === 'conversations' && (
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Task list */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">اختر محادثة</h3>
              <div className="relative mb-3">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="بحث..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pr-9 pl-4 py-2 text-sm text-white placeholder-zinc-600 outline-none"
                />
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {tasks
                  .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
                  .map(task => (
                  <button
                    key={task.id}
                    onClick={() => openConversation(task)}
                    className={`w-full text-right p-3.5 rounded-xl border transition-all ${
                      selectedTask?.id === task.id
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-[#0d0d0d] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[task.status] ?? ''}`}>
                        {STATUS_AR[task.status]}
                      </span>
                      {task.status === 'disputed' && (
                        <AlertTriangle size={12} className="text-red-400" />
                      )}
                    </div>
                    <div className="text-sm font-medium text-white truncate">{task.title}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">{timeAgo(task.created_at, lang)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat view */}
            <div>
              {!selectedTask ? (
                <div className="flex items-center justify-center h-64 border border-zinc-800 rounded-2xl bg-[#0d0d0d]">
                  <div className="text-center">
                    <MessageCircle size={24} className="text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-sm">اختر طلباً لتشوف المحادثة</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
                  {/* Chat header */}
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white truncate">{selectedTask.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[selectedTask.status] ?? ''}`}>
                          {STATUS_AR[selectedTask.status]}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedTask.status === 'disputed' && (
                        <button onClick={() => updateTaskStatus(selectedTask.id, 'completed')}
                          className="text-xs px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg">
                          حل النزاع
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="h-80 overflow-y-auto p-4 space-y-2">
                    {taskMessages.length === 0 ? (
                      <div className="text-center py-8 text-zinc-600 text-sm">لا توجد رسائل</div>
                    ) : taskMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.is_system_message ? 'justify-center' : 'justify-start'}`}>
                        {msg.is_system_message ? (
                          <div className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-center max-w-xs">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="max-w-[80%]">
                            <div className="text-xs text-zinc-500 mb-1">
                              {(msg as any).profiles?.full_name || 'مستخدم'}
                              {' · '}{new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
                              {msg.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Admin reply */}
                  <div className="border-t border-zinc-800 p-3">
                    <div className="text-xs text-zinc-600 mb-2 flex items-center gap-1.5">
                      <ShieldAlert size={11} className="text-amber-500" />
                      ردك سيظهر كرسالة رسمية من إدارة أمرني
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={adminReply}
                        onChange={e => setAdminReply(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendAdminReply()}
                        placeholder="اكتب رد من الإدارة..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50"
                        dir="rtl"
                      />
                      <button
                        onClick={sendAdminReply} disabled={!adminReply.trim() || sendingReply}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black rounded-xl transition-colors"
                      >
                        {sendingReply ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Workers ──────────────────────────────────────────────── */}
        {view === 'workers' && (
          <div>
            <div className="relative mb-4">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث في العمال..."
                className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl pr-9 pl-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none"
              />
            </div>

            {/* Pending first */}
            {filteredWorkers.some(w => !w.is_approved) && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={11} />
                  بانتظار الموافقة ({filteredWorkers.filter(w => !w.is_approved).length})
                </div>
                <div className="space-y-2">
                  {filteredWorkers.filter(w => !w.is_approved).map(w => (
                    <WorkerCard key={w.id} worker={w} onApprove={approveWorker} onReject={rejectWorker} lang={lang} />
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs font-semibold text-zinc-500 mb-2">
              عمال مقبولون ({filteredWorkers.filter(w => w.is_approved).length})
            </div>
            <div className="space-y-2">
              {filteredWorkers.filter(w => w.is_approved).map(w => (
                <WorkerCard key={w.id} worker={w} onApprove={approveWorker} onReject={rejectWorker} lang={lang} />
              ))}
            </div>
          </div>
        )}

        {/* ── Users ────────────────────────────────────────────────── */}
        {view === 'users' && (
          <div>
            <div className="relative mb-4">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث في المستخدمين..."
                className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl pr-9 pl-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none"
              />
            </div>
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['المستخدم', 'الدور', 'الجوال', 'تاريخ التسجيل'].map(h => (
                      <th key={h} className="text-right text-xs text-zinc-600 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{u.full_name || '—'}</div>
                        <div className="text-xs text-zinc-600">{u.id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.role === 'admin'  ? 'bg-amber-950 text-amber-400' :
                          u.role === 'worker' ? 'bg-blue-950 text-blue-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {u.role === 'admin' ? 'أدمن' : u.role === 'worker' ? 'عامل' : 'مستخدم'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{u.phone || '—'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{timeAgo(u.created_at, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Blocked Messages ─────────────────────────────────────── */}
        {view === 'blocked' && (
          <div>
            <div className="flex items-center gap-2 mb-5 p-4 bg-orange-950/20 border border-orange-800/30 rounded-xl">
              <ShieldAlert size={16} className="text-orange-400" />
              <p className="text-sm text-orange-300">
                هذه الرسائل تم حجبها تلقائياً لاحتوائها على بيانات تواصل خارجية.
                تراجع الأنماط المتكررة وعدّل الفلاتر إن احتجت.
              </p>
            </div>
            <div className="space-y-3">
              {blockedMessages.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-sm">
                  <Ban size={24} className="mx-auto mb-3 text-zinc-700" />
                  لا توجد رسائل محجوبة
                </div>
              ) : blockedMessages.map(msg => (
                <div key={msg.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-red-950 text-red-400 border border-red-800 rounded-full px-2 py-0.5">
                      {msg.reason === 'phone'   ? 'رقم جوال' :
                       msg.reason === 'email'   ? 'بريد إلكتروني' :
                       msg.reason === 'social'  ? 'تواصل اجتماعي' : msg.reason}
                    </span>
                    <span className="text-xs text-zinc-600">{timeAgo(msg.created_at, lang)}</span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{msg.content}</p>
                  <div className="text-xs text-zinc-600 mt-2">
                    طلب: <span className="text-zinc-400">{msg.task_id.slice(0, 8)}…</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Worker card component ────────────────────────────────────────────────────
function WorkerCard({
  worker, onApprove, onReject, lang
}: {
  worker: WorkerWithProfile;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  lang: string;
}) {
  return (
    <div className={`bg-[#0d0d0d] border rounded-2xl p-5 ${worker.is_approved ? 'border-zinc-800' : 'border-amber-800/40'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="font-semibold text-white">{worker.profiles?.full_name || '—'}</div>
            {!worker.is_approved && (
              <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 rounded-full px-2 py-0.5">
                بانتظار الموافقة
              </span>
            )}
            {worker.is_approved && (
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full px-2 py-0.5">
                مقبول
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600 mb-2">
            <span>{worker.city}</span>
            <span>{worker.completed_tasks} طلب</span>
            <span className="flex items-center gap-1">
              <Star size={10} className="text-amber-400" />
              {worker.rating > 0 ? worker.rating.toFixed(1) : '—'}
            </span>
            <span>{timeAgo(worker.created_at, lang)}</span>
          </div>
          {worker.skills?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {worker.skills.slice(0, 5).map(s => (
                <span key={s} className="text-xs bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">{s}</span>
              ))}
              {worker.skills.length > 5 && (
                <span className="text-xs text-zinc-600">+{worker.skills.length - 5}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {!worker.is_approved ? (
            <>
              <button onClick={() => onApprove(worker.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/20">
                <CheckCircle size={12} /> موافقة
              </button>
              <button onClick={() => onReject(worker.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20">
                <XCircle size={12} /> رفض
              </button>
            </>
          ) : (
            <button onClick={() => onReject(worker.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700">
              <XCircle size={12} /> سحب الموافقة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
