/**
 * NotificationBell.tsx
 * إشعارات realtime للمستخدمين والعمال
 */
import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;
    fetchNotifs();

    const ch = supabase
      .channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifs(prev => [payload.new as Notif, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifs = async () => {
    const { data } = await supabase
      .from('notifications').select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }).limit(20);
    if (data) setNotifs(data as Notif[]);
  };

  const markAllRead = async () => {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', user!.id).eq('read', false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const ICONS: Record<string, string> = {
    task_accepted: '✅', new_message: '💬',
    task_completed: '🎉', new_task: '🆕', info: 'ℹ️',
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead(); }}
        className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
        <Bell size={18} className="text-zinc-400" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-semibold text-white">الإشعارات</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-amber-400 hover:text-amber-300">
                قراءة الكل
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-zinc-600 text-sm">لا توجد إشعارات</div>
            ) : notifs.map(n => (
              <div key={n.id}
                className={`flex gap-3 px-4 py-3 border-b border-zinc-800/50 last:border-0 transition-colors ${
                  !n.read ? 'bg-amber-500/5' : ''
                }`}>
                <span className="text-lg flex-shrink-0 mt-0.5">{ICONS[n.type] || 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-snug">{n.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-zinc-700 mt-1">
                    {new Date(n.created_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
