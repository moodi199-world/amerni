import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

export default function AuthModal() {
  const { signUp, signIn } = useAuth();
  const { authModalTab, closeAuthModal } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', role: 'client'
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (authModalTab === 'signup') {
      if (!form.fullName.trim()) { setError('اكتب اسمك الكامل'); return; }
      if (!form.email.includes('@')) { setError('البريد الإلكتروني غير صحيح'); return; }
      if (form.password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return; }
    }
    setLoading(true);
    try {
      if (authModalTab === 'signup') {
        const { error: err } = await signUp(form.email, form.password, form.fullName, form.role);
        if (err) { setError(err.message); return; }
      } else {
        const { error: err } = await signIn(form.email, form.password);
        if (err) { setError('البريد أو كلمة المرور غير صحيحة'); return; }
      }
      closeAuthModal();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {authModalTab === 'signup' ? 'إنشاء حساب' : 'تسجيل دخول'}
            </h2>
            <p className="text-zinc-500 text-sm mt-0.5">
              {authModalTab === 'signup' ? 'انضم إلى أمرني' : 'أهلاً بعودتك'}
            </p>
          </div>
          <button onClick={closeAuthModal} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === 'signup' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">الاسم الكامل</label>
                <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  placeholder="محمد العتيبي" type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-colors" />
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">أنت...</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'client', label: 'أطلب خدمة', emoji: '🙋', sub: 'احتاج مساعدة' },
                    { val: 'worker', label: 'أشتغل معكم', emoji: '💼', sub: 'أبي أكسب' },
                  ].map(r => (
                    <button key={r.val} type="button" onClick={() => set('role', r.val)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        form.role === r.val
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}>
                      <div className="text-2xl mb-1">{r.emoji}</div>
                      <div className="text-sm font-medium text-white">{r.label}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">البريد الإلكتروني</label>
            <input value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="name@example.com" type="email" dir="ltr"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-colors" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">كلمة المرور</label>
            <div className="relative">
              <input value={form.password} onChange={e => set('password', e.target.value)}
                type={showPw ? 'text' : 'password'} placeholder="••••••••" dir="ltr"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-colors pr-10" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              جاري التحميل...</>
            ) : authModalTab === 'signup' ? 'إنشاء الحساب' : 'دخول'}
          </button>
        </form>

        {/* Note for workers */}
        {authModalTab === 'signup' && form.role === 'worker' && (
          <p className="text-xs text-zinc-600 text-center mt-3">
            بعد التسجيل ستُطلب منك بيانات إضافية للتحقق من هويتك
          </p>
        )}
      </div>
    </div>
  );
}
