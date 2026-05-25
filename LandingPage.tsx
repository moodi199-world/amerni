import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Shield, CheckCircle, ChevronRight, Zap, Users, Star } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { LegalDoc } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/Button';
import { CustomerOnboard } from './CustomerOnboard';

const ROTATING_EXAMPLES_AR = [
  'أبي أحد يتأكد لي إذا المحل مفتوح',
  'أحتاج أحد يجيب غرض من السوق',
  'أبي أحد يصور موقع أو منتج',
  'أحتاج أحد يمر على مكان عني',
  'أبي أحد يشرح لي شيء',
  'أحتاج مساعدة بسيطة وسريعة',
  'أبي أحد يوصل شيء',
  'أحتاج أحد يطابق لي معلومة',
];

const ROTATING_EXAMPLES_EN = [
  'I need someone to check if a store is open',
  'Need someone to pick something up for me',
  'I want someone to photograph a location',
  'Need someone to pass by a place',
  'I need help with something simple',
  'Need someone to deliver something',
  'Want someone to verify some information',
];

const STATS = [
  { arVal: '+١٠,٠٠٠', enVal: '10,000+', arLabel: 'طلب اتنجز', enLabel: 'Tasks Done' },
  { arVal: '+٢,٤٠٠', enVal: '2,400+', arLabel: 'شخص موثوق', enLabel: 'Trusted Workers' },
  { arVal: '٩٨٪', enVal: '98%', arLabel: 'نسبة الرضا', enLabel: 'Satisfaction' },
  { arVal: 'أقل من ساعتين', enVal: '< 2hrs', arLabel: 'متوسط وقت الرد', enLabel: 'Avg. Response' },
];

const TRUST_AR = [
  'التحقق من الهوية الوطنية السعودية',
  'موثوقين متخصصين في الخدمات اليومية',
  'فلوسك محمية لحين إتمام الشغل',
  'دعم مباشر بالعربي',
  'خصوصيتك محمية وبياناتك سرية',
  'تواصل مباشر مع العامل عبر المحادثة',
];

const TRUST_EN = [
  'Saudi National ID verification',
  'Specialists in everyday real-world tasks',
  'Payment protection until task complete',
  'Direct Arabic support',
  'PDPL-compliant data privacy',
  'Direct in-app chat with your worker',
];

export function LandingPage() {
  const { openAuthModal, navigate, openLegal } = useApp();
  const { user } = useAuth();
  const { t, lang, isRTL } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);

  const examples = lang === 'ar' ? ROTATING_EXAMPLES_AR : ROTATING_EXAMPLES_EN;
  const trustPoints = lang === 'ar' ? TRUST_AR : TRUST_EN;
  const stats = STATS.map(s => ({ value: lang === 'ar' ? s.arVal : s.enVal, label: lang === 'ar' ? s.arLabel : s.enLabel }));

  // Rotate placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % examples.length);
        setPlaceholderVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [examples.length]);

  const handleTaskStart = () => {
    if (user) navigate('dashboard');
    else setShowOnboard(true);
  };

  const ArrowIcon = isRTL ? ChevronRight : ArrowRight;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <CustomerOnboard
        open={showOnboard}
        onClose={() => setShowOnboard(false)}
        onSuccess={() => { setShowOnboard(false); navigate('dashboard'); }}
        initialTask={inputValue}
      />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-amber-500/4 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-amber-500/3 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:72px_72px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#080808_100%)]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-10">
            <Sparkles size={13} />
            {lang === 'ar' ? 'أمرني — اطلب أي شي' : 'Amerni — Request Anything in Saudi Arabia'}
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-[1.1]">
            {lang === 'ar' ? (
              <>
                <span className="text-white">اطلب</span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">أي شيء.</span>
                <br />
                <span className="text-white">في ثواني.</span>
              </>
            ) : (
              <>
                <span className="text-white">Request</span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">anything.</span>
                <br />
                <span className="text-white">In seconds.</span>
              </>
            )}
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto mb-12 leading-relaxed">
            {lang === 'ar'
              ? 'اكتب اللي تبيه — بأي كلام. أشخاص موثوقين يستلمون طلبك على طول وينجزونه.'
              : 'Describe what you need in plain language. Trusted human workers receive your request instantly and get it done.'}
          </p>

          {/* Universal Input */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <div className="relative bg-zinc-900/90 border border-zinc-700/60 rounded-2xl backdrop-blur-xl shadow-2xl shadow-black/60 hover:border-zinc-600/60 focus-within:border-amber-500/40 transition-all duration-300">
              <div className="flex items-center gap-3 px-5 py-4 sm:py-5">
                <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTaskStart()}
                  placeholder={placeholderVisible ? examples[placeholderIdx] : ''}
                  className="flex-1 bg-transparent text-white placeholder-zinc-600 text-base sm:text-lg outline-none transition-opacity duration-300"
                  style={{ opacity: placeholderVisible ? 1 : 0.3 }}
                />
                <button
                  onClick={handleTaskStart}
                  className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/25"
                >
                  {lang === 'ar' ? 'اطلب الان' : 'Go'} <ArrowIcon size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Example pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-14">
            {examples.slice(0, 4).map(ex => (
              <button
                key={ex}
                onClick={() => { setInputValue(ex); }}
                className="text-xs bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/30 hover:text-zinc-200 text-zinc-500 rounded-full px-3.5 py-1.5 transition-all"
              >
                {ex.length > 38 ? ex.slice(0, 38) + '…' : ex}
              </button>
            ))}
          </div>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-600 flex-wrap">
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" />
              {lang === 'ar' ? 'مجاني تماماً' : 'Completely free'}
            </span>
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" />
              {lang === 'ar' ? 'أشخاص موثوقين فقط' : 'Verified workers only'}
            </span>
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" />
              {lang === 'ar' ? 'تنجز في دقايق' : 'Done in minutes'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="relative w-full max-w-3xl mx-auto mt-24 grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/40 rounded-2xl overflow-hidden border border-zinc-800/60">
          {stats.map(stat => (
            <div key={stat.label} className="bg-[#0c0c0c] px-6 py-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-5">
              {lang === 'ar' ? 'كيف تشتغل؟' : 'How it works'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              {lang === 'ar' ? 'بسيطة كالرسالة' : 'As simple as sending a message'}
            </h2>
            <p className="text-zinc-500">
              {lang === 'ar' ? 'ثلاث خطوات وخلاص.' : 'Three steps. That\'s it.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '١', stepEn: '1',
                icon: Sparkles,
                arTitle: 'اكتب اللي تبيه',
                enTitle: 'Write what you need',
                arDesc: 'اكتب طلبك بأي كلام — عربي أو إنجليزي. ما في خيارات أو تصنيفات.',
                enDesc: 'Type your request in plain language — Arabic or English. No categories, no menus.',
              },
              {
                step: '٢', stepEn: '2',
                icon: Zap,
                arTitle: 'عامل يقبل على طول',
                enTitle: 'Worker accepts instantly',
                arDesc: 'الطلب يوصل للعمال المناسبين فوراً. أول واحد يقبل يصير هو العامل الخاص بك.',
                enDesc: 'Your request reaches matching workers instantly. The first to accept becomes your worker.',
              },
              {
                step: '٣', stepEn: '3',
                icon: Users,
                arTitle: 'تكلمه وتابع',
                enTitle: 'Chat and track',
                arDesc: 'محادثة مباشرة تفتح تلقائياً. يرفع لك صور التنفيذ. أنت تؤكد الإنجاز.',
                enDesc: 'Live chat opens automatically. Worker uploads proof. You confirm completion.',
              },
            ].map(({ step, stepEn, icon: Icon, arTitle, enTitle, arDesc, enDesc }, i) => (
              <div key={i} className="relative group bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all duration-300">
                <div className="text-5xl font-black text-zinc-800 mb-5 group-hover:text-zinc-700 transition-colors">
                  {lang === 'ar' ? step : stepEn}
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Icon size={19} className="text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{lang === 'ar' ? arTitle : enTitle}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{lang === 'ar' ? arDesc : enDesc}</p>
                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 z-10">
                    <ArrowRight size={14} className={`text-zinc-700 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-28 px-4 bg-zinc-900/15">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-6">
                <Shield size={13} className="text-emerald-500" />
                {lang === 'ar' ? 'الأمان والثقة' : 'Trust & Safety'}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                {lang === 'ar'
                  ? 'مبنية على الثقة. وكل شخص عندنا موثوق.'
                  : 'Built on trust. Every worker is verified.'}
              </h2>
              <p className="text-zinc-500 mb-8 leading-relaxed">
                {lang === 'ar'
                  ? 'في المملكة، الثقة هي الأساس. عشان كذا كل شخص عندنا يمر بتحقق من الهوية وفحص صارم قبل ما يقبل أي طلب.'
                  : "In Saudi Arabia, trust is everything. Every worker goes through identity verification and strict approval before serving clients."}
              </p>
              <Button onClick={handleTaskStart} size="lg">
                {lang === 'ar' ? 'اطلب الان' : 'Start Your First Task'} <ArrowIcon size={15} />
              </Button>
            </div>

            <div className="space-y-2.5">
              {trustPoints.map(point => (
                <div key={point} className="flex items-center gap-4 bg-[#0d0d0d] border border-zinc-800 rounded-xl px-5 py-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={13} className="text-emerald-500" />
                  </div>
                  <span className="text-sm text-zinc-300">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative bg-gradient-to-b from-zinc-900 to-[#0d0d0d] border border-zinc-800 rounded-3xl px-8 py-16 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#f59e0b07,transparent_65%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-8">
                <Star size={13} fill="currentColor" />
                {lang === 'ar' ? 'جاهز تطلب؟' : 'Ready to request?'}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                {lang === 'ar' ? 'أي شيء تبيه — اطلبه الحين' : 'Anything you need — request it now'}
              </h2>
              <p className="text-zinc-500 mb-10 leading-relaxed">
                {lang === 'ar'
                  ? 'بس اكتب اللي تبيه. ما في تسجيل. ما في تعقيد. فقط طلبك يوصل وينجز.'
                  : 'Just write what you need. No registration. No friction. Your request reaches workers in seconds.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={handleTaskStart}>
                  {lang === 'ar' ? 'اطلب الان' : 'Request Now'} <ArrowIcon size={15} />
                </Button>
                <Button variant="outline" size="lg" onClick={() => openAuthModal('signup')}>
                  {lang === 'ar' ? 'اشتغل معنا' : 'Become a Worker'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                <span className="text-black font-black text-xs">أ</span>
              </div>
              <span className="text-white font-bold">أمرني</span>
            </div>
            <p className="text-xs text-zinc-700">{t('footer_rights')}</p>
            <div className="flex items-center gap-5 text-xs text-zinc-600">
              <button onClick={() => openLegal('privacy')} className="hover:text-zinc-400 transition-colors">{t('footer_privacy')}</button>
              <button onClick={() => openLegal('terms')} className="hover:text-zinc-400 transition-colors">{t('footer_terms')}</button>
              <button onClick={() => openLegal('provider')} className="hover:text-zinc-400 transition-colors">{lang === 'ar' ? 'مقدمو الخدمة' : 'Providers'}</button>
              <button onClick={() => openLegal('liability')} className="hover:text-zinc-400 transition-colors">{lang === 'ar' ? 'إخلاء المسؤولية' : 'Liability'}</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
