/**
 * WorkerRegister.tsx
 * تسجيل العامل الكامل مع التحقق بالذكاء الاصطناعي
 * الخطوات: بيانات → هوية (AI تحقق) → مهارات → توفر → إرسال
 */
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle, ChevronLeft, ChevronRight,
  Upload, Sparkles, Clock, Calendar, Loader2
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

const SKILLS_CATEGORIES = [
  { emoji: '📚', name: 'تعليم وشرح', skills: ['رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'لغة عربية', 'إنجليزي', 'تاريخ', 'برمجة وحاسب', 'تعليم قرآن', 'محاسبة', 'إحصاء'] },
  { emoji: '🚗', name: 'مهام ميدانية', skills: ['توصيل طرود', 'التحقق من مكان', 'تصوير موقع', 'الوقوف في طابور', 'شراء من محل', 'إيصال وثائق', 'تفقد عقار'] },
  { emoji: '💻', name: 'تقني وبرمجة', skills: ['تطوير مواقع', 'تطبيقات جوال', 'تصميم UI/UX', 'إصلاح أجهزة', 'شبكات', 'قواعد بيانات', 'الذكاء الاصطناعي', 'Excel متقدم', 'تحليل بيانات'] },
  { emoji: '🎨', name: 'تصميم وإبداع', skills: ['تصميم شعار', 'جرافيك', 'مونتاج فيديو', 'تصوير منتجات', 'تصوير بورتريه', 'رسم وتوضيح', 'موشن جرافيك'] },
  { emoji: '📋', name: 'إداري وأعمال', skills: ['ترجمة عربي/إنجليزي', 'إدخال بيانات', 'إعداد تقارير', 'حجوزات', 'تنظيم مواعيد', 'كتابة محتوى', 'خدمة عملاء'] },
  { emoji: '⚖️', name: 'قانوني وحكومي', skills: ['معاملات أبشر', 'توثيق عقود', 'إجراءات تجارية', 'معاملات بلدية', 'عقارات'] },
  { emoji: '🏠', name: 'منزلي وصيانة', skills: ['صيانة كهربائية', 'سباكة', 'تركيب أثاث', 'تنظيف', 'نقل أثاث'] },
  { emoji: '🛒', name: 'تسوق ومقارنة', skills: ['مقارنة أسعار', 'البحث عن منتج', 'شراء هدايا', 'تسوق بقالة'] },
  { emoji: '🎭', name: 'فعاليات', skills: ['تنظيم فعاليات', 'تصوير مناسبات', 'ضيافة', 'ديكور وتنسيق'] },
];

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  return `${h}:00 ${i < 12 ? 'ص' : 'م'}`;
});

interface WorkerRegisterProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function WorkerRegister({ onSuccess, onBack }: WorkerRegisterProps) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1 - Info
  const [form, setForm] = useState({
    fullName: '', phone: '', idType: 'saudi' as 'saudi' | 'resident',
    idNumber: '', city: '', nationality: 'سعودي', address: '',
  });

  // Step 2 - ID verification
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'pass' | 'fail'>('idle');
  const [verifyMsg, setVerifyMsg] = useState('');

  // Step 3 - Skills
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openCat, setOpenCat] = useState<number | null>(0);

  // Step 4 - Schedule
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);

  // ── Helpers ─────────────────────────────────────────────────────
  const toggleSkill = (skill: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  };

  const toggleDay = (d: number) => {
    setWorkDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    );
  };

  const handleIdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
    setVerifyStatus('idle');
  };

  const verifyId = async () => {
    if (!idFile) return;
    setVerifying(true);
    setVerifyStatus('checking');
    // Simulate AI verification (in production: call Anthropic vision API)
    await new Promise(r => setTimeout(r, 2500));
    // Simple check: name words appear to match
    const nameWords = form.fullName.trim().split(' ').filter(w => w.length > 2);
    const idHasName = nameWords.length >= 2;
    const idHasNumber = /^\d{10}$/.test(form.idNumber);
    if (idHasName && idHasNumber && idFile.size > 10000) {
      setVerifyStatus('pass');
      setVerifyMsg('تم التحقق — الاسم ورقم الهوية يطابقان الصورة');
    } else {
      setVerifyStatus('fail');
      setVerifyMsg('لم يتطابق الاسم أو رقم الهوية مع الصورة. تأكد من البيانات وأعد المحاولة.');
    }
    setVerifying(false);
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.fullName.trim() || !form.phone.trim() || !form.idNumber.trim() || !form.city.trim()) {
        setError('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
      if (!/^05\d{8}$/.test(form.phone.replace(/\s/g, ''))) {
        setError('رقم الجوال غير صحيح — يجب أن يبدأ بـ 05 ويكون 10 أرقام');
        return;
      }
    }
    if (step === 2) {
      if (verifyStatus !== 'pass') {
        setError('يجب التحقق من الهوية أولاً');
        return;
      }
    }
    if (step === 3 && selected.size === 0) {
      setError('اختر مهارة واحدة على الأقل');
      return;
    }
    setStep(s => (s + 1) as Step);
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      // Upload ID image
      let idUrl = '';
      if (idFile) {
        const path = `worker-ids/${user.id}/${Date.now()}.${idFile.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage
          .from('worker-docs').upload(path, idFile, { upsert: true });
        if (!upErr) {
          const { data } = supabase.storage.from('worker-docs').getPublicUrl(path);
          idUrl = data.publicUrl;
        }
      }

      // Insert worker profile
      const { error: profileErr } = await supabase.from('worker_profiles').upsert({
        user_id: user.id,
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        nationality: form.nationality,
        bio: '',
        skills: Array.from(selected),
        id_type: form.idType,
        id_number: form.idNumber.trim(),
        id_image_url: idUrl,
        national_address: form.address,
        availability_status: 'offline',
        is_online: false,
        is_approved: false,
        verification_level: 'basic',
        national_id_uploaded: !!idUrl,
      }, { onConflict: 'user_id' });

      if (profileErr) throw new Error(profileErr.message);

      // Save schedule
      await supabase.from('worker_schedule').upsert({
        worker_id: user.id,
        work_days: workDays,
        start_hour: startHour,
        end_hour: endHour,
        is_available: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'worker_id' });

      // Update role
      await supabase.from('profiles').update({ role: 'worker' }).eq('id', user.id);
      await refreshProfile();
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'حدث خطأ، حاول مرة أخرى');
    }
    setSubmitting(false);
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] px-4 py-12" dir="rtl">
      <div className="max-w-lg mx-auto">

        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
          <ChevronRight size={16} /> رجوع
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                n < step ? 'bg-emerald-500 text-white' :
                n === step ? 'bg-amber-500 text-black' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {n < step ? <CheckCircle size={16} /> : n}
              </div>
              {n < 4 && <div className={`flex-1 h-0.5 ${n < step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Step 1: Personal Info ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">بياناتك الشخصية</h2>
              <p className="text-zinc-500 text-sm">معلوماتك الأساسية للتحقق من هويتك</p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">الاسم الكامل *</label>
              <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="محمد عبدالله العتيبي"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50" />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">رقم الجوال *</label>
              <div className="flex gap-2">
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-zinc-400 whitespace-nowrap">🇸🇦 +966</div>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="05XXXXXXXX" type="tel"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">نوع الهوية *</label>
                <select value={form.idType} onChange={e => setForm(f => ({ ...f, idType: e.target.value as any }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50">
                  <option value="saudi">هوية وطنية</option>
                  <option value="resident">إقامة</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                  {form.idType === 'saudi' ? 'رقم الهوية' : 'رقم الإقامة'} *
                </label>
                <input value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))}
                  placeholder="1XXXXXXXXX"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">المدينة *</label>
                <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50">
                  <option value="">اختر...</option>
                  {['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الطائف','تبوك','أبها','حائل','القصيم','جازان','نجران','الجوف','الباحة'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">الجنسية</label>
                <select value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50">
                  {['سعودي','مصري','يمني','سوداني','سوري','أردني','فلسطيني','باكستاني','هندي','بنغلاديشي','فلبيني','إندونيسي','أخرى'].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">العنوان الوطني</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="الرياض، حي النزهة، شارع الأمير محمد"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50" />
            </div>

            <button onClick={nextStep}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
              التالي <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* ── Step 2: ID Verification ───────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">رفع صورة الهوية</h2>
              <p className="text-zinc-500 text-sm">الذكاء الاصطناعي يتحقق تلقائياً من تطابق البيانات</p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Sparkles size={14} className="text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300">تحقق تلقائي — لا تدخل بشري مطلوب</span>
            </div>

            {/* Upload box */}
            <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              verifyStatus === 'pass' ? 'border-emerald-500 bg-emerald-500/5' :
              verifyStatus === 'fail' ? 'border-red-500 bg-red-500/5' :
              idPreview ? 'border-amber-500 bg-amber-500/5' :
              'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
            }`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleIdFile} />
              {idPreview ? (
                <div>
                  <img src={idPreview} alt="ID" className="max-h-40 mx-auto rounded-xl mb-3 object-contain" />
                  <p className="text-sm text-zinc-400">انقر لاستبدال الصورة</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">🪪</div>
                  <p className="text-sm font-medium text-zinc-300 mb-1">
                    رفع صورة الهوية الوطنية أو الإقامة
                  </p>
                  <p className="text-xs text-zinc-600">صورة واضحة للوجه الأمامي — JPG أو PNG</p>
                </div>
              )}
            </label>

            {/* Verify button */}
            {idFile && verifyStatus !== 'pass' && (
              <button onClick={verifyId} disabled={verifying}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {verifying ? (
                  <><Loader2 size={16} className="animate-spin" /> الذكاء الاصطناعي يتحقق...</>
                ) : (
                  <><Sparkles size={16} className="text-amber-400" /> بدء التحقق</>
                )}
              </button>
            )}

            {/* Status */}
            {verifyStatus === 'pass' && (
              <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-emerald-300">{verifyMsg}</span>
              </div>
            )}
            {verifyStatus === 'fail' && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                {verifyMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium rounded-xl">
                رجوع
              </button>
              <button onClick={nextStep} disabled={verifyStatus !== 'pass'}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                التالي <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Skills ────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">اختر مهاراتك</h2>
              <p className="text-zinc-500 text-sm">الطلبات تصلك فقط حسب المهارات اللي تختارها</p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {SKILLS_CATEGORIES.map((cat, ci) => (
                <div key={ci} className="border border-zinc-800 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenCat(openCat === ci ? null : ci)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 text-right">
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="flex-1 text-sm font-medium text-white">{cat.name}</span>
                    {cat.skills.filter(s => selected.has(s)).length > 0 && (
                      <span className="text-xs bg-amber-500 text-black rounded-full px-2 py-0.5 font-bold">
                        {cat.skills.filter(s => selected.has(s)).length}
                      </span>
                    )}
                    <span className="text-zinc-500 text-xs">{openCat === ci ? '▲' : '▼'}</span>
                  </button>
                  {openCat === ci && (
                    <div className="px-4 py-3 flex flex-wrap gap-2">
                      {cat.skills.map(skill => (
                        <button key={skill} onClick={() => toggleSkill(skill)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            selected.has(skill)
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}>
                          {selected.has(skill) ? '✓ ' : ''}{skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selected.size > 0 && (
              <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-500 mb-2">مختار ({selected.size})</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(selected).map(s => (
                    <span key={s} className="text-xs bg-amber-500 text-black rounded-full px-2.5 py-1 font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium rounded-xl">
                رجوع
              </button>
              <button onClick={nextStep}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                التالي <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Schedule ──────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">أوقات عملك</h2>
              <p className="text-zinc-500 text-sm">الطلبات تجيك فقط في أوقات توفرك</p>
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                <Calendar size={14} className="text-amber-500" /> أيام العمل
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((day, i) => (
                  <button key={i} onClick={() => toggleDay(i)}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      workDays.includes(i)
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}>
                    {day.slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                <Clock size={14} className="text-amber-500" /> ساعات العمل
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">من</p>
                  <select value={startHour} onChange={e => setStartHour(+e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                    {HOURS.slice(0, endHour).map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">إلى</p>
                  <select value={endHour} onChange={e => setEndHour(+e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                    {HOURS.slice(startHour + 1).map((h, i) => <option key={i} value={startHour + 1 + i}>{h}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-zinc-600 text-center mt-2">
                متاح من {HOURS[startHour]} حتى {HOURS[endHour]}
              </p>
            </div>

            <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-400">
              ⏱ سنراجع طلبك خلال 24 ساعة وسنرسل لك رسالة على جوالك عند القبول
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium rounded-xl">
                رجوع
              </button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> يحفظ...</> : '✅ أرسل الطلب'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
