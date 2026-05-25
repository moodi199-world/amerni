/**
 * SmartChat.tsx
 * 
 * محادثة داخلية محمية مع:
 * - فلتر تلقائي يمنع مشاركة أرقام الجوال والإيميلات
 * - رفع ملفات إثبات الإنجاز (مخفية حتى تأكيد الدفع)
 * - زر تأكيد الدفع يكشف الملفات (Escrow)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Lock, Unlock, Upload, CheckCircle,
  AlertTriangle, Star, Image, ShieldAlert
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
  profiles?: { full_name: string };
}

interface TaskFile {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  is_locked: boolean;
  created_at: string;
}

interface SmartChatProps {
  taskId: string;
  taskStatus: string;
  isWorker: boolean;
  clientPrice: number;
  workerPrice?: number | null;
  negotiationStatus?: string | null;
  finalPrice?: number | null;
  aiPriceMin?: number | null;
  aiPriceMax?: number | null;
  onNegotiationResolve?: (resolution: 'accepted' | 'rejected') => void;
  onTaskComplete?: () => void;
}

// ─── Contact info filter patterns ─────────────────────────────────────────────
const FILTER_PATTERNS: Array<{ regex: RegExp; reason: string; label: string }> = [
  {
    regex: /(\+966|00966|05\d{8}|٠٥\d{8})/g,
    reason: 'phone',
    label: 'رقم جوال',
  },
  {
    regex: /[\w.-]+@[\w.-]+\.\w{2,}/g,
    reason: 'email',
    label: 'بريد إلكتروني',
  },
  {
    regex: /wa\.me|whatsapp|واتساب|وتساب|تيليجرام|telegram|t\.me/gi,
    reason: 'social',
    label: 'تواصل خارجي',
  },
  {
    regex: /انستقرام|instagram|سناب|snapchat|تويتر|twitter|تيك تك|tiktok/gi,
    reason: 'social',
    label: 'سوشل ميديا',
  },
  {
    regex: /\b(ايميل|إيميل|email|gmail|hotmail|outlook)\b/gi,
    reason: 'email',
    label: 'بريد إلكتروني',
  },
];

function filterMessage(text: string): { blocked: boolean; reason?: string; label?: string } {
  for (const p of FILTER_PATTERNS) {
    if (p.regex.test(text)) {
      p.regex.lastIndex = 0;
      return { blocked: true, reason: p.reason, label: p.label };
    }
    p.regex.lastIndex = 0;
  }
  return { blocked: false };
}

// ─── Star rating component ─────────────────────────────────────────────────────
function StarRating({
  value, onChange, readonly = false
}: {
  value: number; onChange?: (v: number) => void; readonly?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => !readonly && onChange?.(s)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            size={20}
            className={s <= value ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function SmartChat({
  taskId,
  taskStatus,
  isWorker,
  clientPrice,
  workerPrice,
  negotiationStatus,
  finalPrice,
  aiPriceMin,
  aiPriceMax,
  onNegotiationResolve,
  onTaskComplete,
}: SmartChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load messages ──────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('task_messages')
      .select('*, profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  }, [taskId]);

  // ── Load files ─────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    const { data } = await supabase
      .from('task_files')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (data) setFiles(data as TaskFile[]);
  }, [taskId]);

  useEffect(() => {
    loadMessages();
    loadFiles();

    // Realtime subscription
    const ch = supabase
      .channel(`chat-${taskId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_messages',
        filter: `task_id=eq.${taskId}`,
      }, () => loadMessages())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_files',
        filter: `task_id=eq.${taskId}`,
      }, () => loadFiles())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [taskId, loadMessages, loadFiles]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Check if task was rated ────────────────────────────────────
  useEffect(() => {
    if (taskStatus === 'completed' && !isWorker) {
      supabase
        .from('ratings')
        .select('id')
        .eq('task_id', taskId)
        .single()
        .then(({ data }) => { if (data) setRatingDone(true); });
    }
  }, [taskStatus, taskId, isWorker]);

  // ── Send message ───────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user) return;

    // Filter check
    const check = filterMessage(text);
    if (check.blocked) {
      setBlockedWarning(`⛔ لا يمكن إرسال ${check.label} — التواصل يكون داخل المنصة فقط`);
      setTimeout(() => setBlockedWarning(null), 4000);
      return;
    }

    setSending(true);
    await supabase.from('task_messages').insert({
      task_id: taskId,
      sender_id: user.id,
      content: text,
      is_system_message: false,
    });
    setInput('');
    setSending(false);
  };

  // ── Upload proof file (locked) ─────────────────────────────────
  const uploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `proofs/${taskId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('task-files')
      .upload(path, file, { upsert: false });
    
    {
      const { data: urlData } = supabase.storage
        .from('task-files')
        .getPublicUrl(path);

      await supabase.from('task_files').insert({
        task_id: taskId,
        uploader_id: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        is_locked: true,
        lock_reason: 'awaiting_payment_confirmation',
      });

      // System message
      await supabase.from('task_messages').insert({
        task_id: taskId,
        sender_id: user.id,
        content: `🔒 تم رفع إثبات الإنجاز "${file.name}" — سيظهر للعميل بعد تأكيد استلام المبلغ.`,
        is_system_message: true,
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Confirm payment (worker: received / client: sent) ──────────
  const confirmPayment = async () => {
    if (!user) return;
    setConfirmingPayment(true);

    if (isWorker) {
      await supabase.rpc('unlock_task_files', {
        p_task_id: taskId,
        p_worker_id: user.id,
      });
    } else {
      await supabase.rpc('client_confirm_payment', {
        p_task_id: taskId,
        p_user_id: user.id,
      });
      onTaskComplete?.();
      setShowRating(true);
    }

    await loadFiles();
    setConfirmingPayment(false);
  };

  // ── Submit rating ──────────────────────────────────────────────
  const submitRating = async () => {
    if (!ratingStars || !user) return;
    setSubmittingRating(true);
    await supabase.rpc('submit_rating', {
      p_task_id: taskId,
      p_stars: ratingStars,
      p_comment: ratingComment || null,
    });
    setSubmittingRating(false);
    setRatingDone(true);
    setShowRating(false);
  };

  const hasLockedFiles = files.some(f => f.is_locked);
  const hasUnlockedFiles = files.some(f => !f.is_locked);
  const isCompleted = taskStatus === 'completed';
  const isInProgress = taskStatus === 'in_progress';

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-xl border border-zinc-800 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">المحادثة</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ShieldAlert size={12} className="text-amber-500" />
          محمية — لا يمكن مشاركة بيانات تواصل
        </div>
      </div>

      {/* ── AI Price Banner ──────────────────────────────────────── */}
      {aiPriceMin && aiPriceMax && (
        <div className="mx-3 mt-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
          <div className="text-xs text-zinc-400">السعر المتوقع من الذكاء الاصطناعي</div>
          <div className="text-sm font-bold text-amber-400">
            {aiPriceMin} - {aiPriceMax} ريال
          </div>
        </div>
      )}

      {/* ── Negotiation Bar ──────────────────────────────────────── */}
      {negotiationStatus === 'pending' && workerPrice && (
        <div className="mx-3 mt-2 p-3 bg-zinc-900 border border-zinc-700 rounded-xl">
          <div className="text-xs text-zinc-400 mb-2">عرض سعر العامل</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-white">{workerPrice} ريال</div>
              {aiPriceMin && aiPriceMax && (
                <div className={`text-xs mt-0.5 ${
                  workerPrice >= aiPriceMin && workerPrice <= aiPriceMax
                    ? 'text-emerald-500' : workerPrice < aiPriceMin
                    ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {workerPrice >= aiPriceMin && workerPrice <= aiPriceMax
                    ? '✓ ضمن النطاق المتوقع'
                    : workerPrice < aiPriceMin
                    ? '↓ أقل من المتوقع'
                    : '↑ أعلى من المتوقع'}
                </div>
              )}
            </div>
            {!isWorker && (
              <div className="flex gap-2">
                <button
                  onClick={() => onNegotiationResolve?.('rejected')}
                  className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
                >
                  رفض
                </button>
                <button
                  onClick={() => onNegotiationResolve?.('accepted')}
                  className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
                >
                  قبول {workerPrice} ريال
                </button>
              </div>
            )}
            {isWorker && (
              <div className="text-xs text-zinc-500 text-left">في انتظار رد العميل...</div>
            )}
          </div>
        </div>
      )}

      {negotiationStatus === 'accepted' && finalPrice && (
        <div className="mx-3 mt-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">
            تم الاتفاق على {finalPrice} ريال
          </span>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map(msg => {
          const isMe = msg.sender_id === user?.id;
          const isSystem = msg.is_system_message;

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-center max-w-xs">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMe
                  ? 'bg-amber-500 text-black rounded-tr-sm'
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
              }`}>
                {!isMe && (
                  <div className="text-xs text-zinc-400 mb-1">
                    {msg.profiles?.full_name}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <div className={`text-xs mt-1 ${isMe ? 'text-black/50' : 'text-zinc-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* ── Blocked warning ──────────────────────────────────────── */}
      {blockedWarning && (
        <div className="mx-3 mb-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">{blockedWarning}</span>
        </div>
      )}

      {/* ── Proof files section ───────────────────────────────────── */}
      {(files.length > 0) && (
        <div className="mx-3 mb-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="text-xs text-zinc-400 mb-2 font-medium">ملفات الإنجاز</div>
          <div className="space-y-1.5">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-2">
                {f.is_locked ? (
                  <Lock size={13} className="text-amber-500 flex-shrink-0" />
                ) : (
                  <Unlock size={13} className="text-emerald-400 flex-shrink-0" />
                )}
                {f.is_locked ? (
                  <span className="text-sm text-zinc-500 italic">
                    🔒 {f.file_name} — مخفي حتى تأكيد الدفع
                  </span>
                ) : (
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-amber-400 hover:underline"
                  >
                    📎 {f.file_name}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Confirm payment buttons */}
          {hasLockedFiles && isInProgress && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              {isWorker ? (
                <button
                  onClick={confirmPayment}
                  disabled={confirmingPayment}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={15} />
                  {confirmingPayment ? 'جاري التأكيد...' : 'تأكيد استلام المبلغ — اكشف الملفات'}
                </button>
              ) : (
                <button
                  onClick={confirmPayment}
                  disabled={confirmingPayment}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={15} />
                  {confirmingPayment ? 'جاري التأكيد...' : 'تأكيد إرسال المبلغ — شاهد الملفات'}
                </button>
              )}
              <p className="text-xs text-zinc-600 text-center mt-1.5">
                بالضغط تؤكد إتمام الدفع خارج المنصة
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Rating section ───────────────────────────────────────── */}
      {isCompleted && !isWorker && !ratingDone && (
        <div className="mx-3 mb-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          {!showRating ? (
            <button
              onClick={() => setShowRating(true)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Star size={15} />
              قيّم العامل
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-white">كيف كانت الخدمة؟</div>
              <StarRating value={ratingStars} onChange={setRatingStars} />
              <textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                placeholder="تعليق (اختياري)..."
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none resize-none focus:border-amber-500 transition-colors"
                dir="rtl"
              />
              <button
                onClick={submitRating}
                disabled={!ratingStars || submittingRating}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-sm font-semibold rounded-xl transition-colors"
              >
                {submittingRating ? 'يحفظ...' : 'إرسال التقييم'}
              </button>
            </div>
          )}
        </div>
      )}

      {ratingDone && !isWorker && isCompleted && (
        <div className="mx-3 mb-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="text-sm text-amber-400">تم إرسال تقييمك — شكراً!</span>
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────────── */}
      {!isCompleted && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-3 py-2 focus-within:border-amber-500/50 transition-colors">

            {/* Upload proof (worker only, in_progress) */}
            {isWorker && isInProgress && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={uploadProof}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex-shrink-0 p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
                  title="رفع إثبات إنجاز"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload size={17} />
                  )}
                </button>
              </>
            )}

            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
              dir="rtl"
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="flex-shrink-0 p-1.5 text-amber-500 hover:text-amber-400 disabled:opacity-30 transition-colors"
            >
              <Send size={17} />
            </button>
          </div>

          <p className="text-center text-xs text-zinc-700 mt-1.5">
            🔒 المحادثة محفوظة — لا تشارك بيانات تواصل شخصية
          </p>
        </div>
      )}
    </div>
  );
}
