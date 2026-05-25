import { ArrowLeft, ChevronRight, Scale, Shield, UserCheck, AlertTriangle } from 'lucide-react';
import { useApp, LegalDoc } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';

const LAST_UPDATED_AR = 'آخر تحديث: مايو ٢٠٢٦';
const LAST_UPDATED_EN = 'Last updated: May 2026';

interface Section {
  title: string;
  body: string[];
}

interface DocContent {
  icon: React.ElementType;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  sections: { titleAr: string; titleEn: string; pointsAr: string[]; pointsEn: string[] }[];
}

const DOCS: Record<LegalDoc, DocContent> = {
  terms: {
    icon: Scale,
    titleAr: 'شروط الخدمة',
    titleEn: 'Terms of Service',
    subtitleAr: 'يرجى قراءة هذه الشروط بعناية قبل استخدام المنصة.',
    subtitleEn: 'Please read these terms carefully before using the platform.',
    sections: [
      {
        titleAr: 'طبيعة المنصة',
        titleEn: 'Nature of the Platform',
        pointsAr: [
          'أمرني هي منصة وسيطة تهدف فقط إلى ربط الأشخاص بمقدمي الخدمات.',
          'المنصة لا تقدم أي خدمة مباشرة ولا تضمن جودة أي خدمة أو نتيجتها.',
          'المنصة ليست طرفاً في أي اتفاقية بين المستخدم ومقدم الخدمة.',
          'جميع التعاملات بين المستخدمين تتم على مسؤوليتهم الكاملة.',
        ],
        pointsEn: [
          'Amerni is an intermediary platform whose sole purpose is to connect users with service providers.',
          'The platform does not provide any direct service and does not guarantee service quality or outcome.',
          'The platform is not a party to any agreement between a user and a service provider.',
          'All interactions between users occur at their own full responsibility.',
        ],
      },
      {
        titleAr: 'إخلاء مسؤولية المنصة',
        titleEn: 'Platform Disclaimer',
        pointsAr: [
          'المنصة غير مسؤولة عن أي نزاعات أو خلافات بين المستخدمين.',
          'المنصة غير مسؤولة عن أي ضرر أو احتيال أو إخلال من أي مستخدم.',
          'المنصة غير مسؤولة عن الطلبات الفائتة أو غير المكتملة أو المتأخرة.',
          'المنصة غير مسؤولة عن أي خسارة مالية أو نزاعات شخصية بين المستخدمين.',
          'المنصة غير مسؤولة عن سلامة أو قانونية أي تعامل خارج نطاق المنصة.',
        ],
        pointsEn: [
          'The platform is not responsible for any disputes or disagreements between users.',
          'The platform is not responsible for any harm, fraud, or breach by any user.',
          'The platform is not responsible for missed, incomplete, or delayed tasks.',
          'The platform is not responsible for any financial loss or personal disputes between users.',
          'The platform is not responsible for the safety or legality of any off-platform interactions.',
        ],
      },
      {
        titleAr: 'التزامات المستخدم',
        titleEn: 'User Obligations',
        pointsAr: [
          'يجب على المستخدم التحقق من هوية مقدم الخدمة والتعامل بمسؤولية.',
          'يُحظر استخدام المنصة لأي غرض غير مشروع أو مخالف للأنظمة السعودية.',
          'يجب تقديم معلومات صحيحة ودقيقة عند التسجيل.',
          'يحق للمنصة إزالة أي مستخدم يخالف هذه الشروط في أي وقت.',
        ],
        pointsEn: [
          'Users must verify service provider identity and interact responsibly.',
          'Use of the platform for any illegal purpose or in violation of Saudi law is strictly prohibited.',
          'Accurate and truthful information must be provided at registration.',
          'The platform may remove any user violating these terms at any time.',
        ],
      },
    ],
  },
  privacy: {
    icon: Shield,
    titleAr: 'سياسة الخصوصية',
    titleEn: 'Privacy Policy',
    subtitleAr: 'نحن نلتزم بحماية بياناتك الشخصية وخصوصيتك.',
    subtitleEn: 'We are committed to protecting your personal data and privacy.',
    sections: [
      {
        titleAr: 'البيانات التي نجمعها',
        titleEn: 'Data We Collect',
        pointsAr: [
          'رقم الجوال — لأغراض التحقق من الهوية فقط.',
          'البريد الإلكتروني — للتواصل وتسجيل الدخول.',
          'بيانات الاستخدام الأساسية — لتحسين تجربة المنصة.',
          'لا نجمع أي بيانات مالية أو بنكية.',
        ],
        pointsEn: [
          'Phone number — for identity verification purposes only.',
          'Email address — for communication and login.',
          'Basic usage data — to improve the platform experience.',
          'We do not collect any financial or banking data.',
        ],
      },
      {
        titleAr: 'كيف نستخدم بياناتك',
        titleEn: 'How We Use Your Data',
        pointsAr: [
          'التحقق من الهوية وتسجيل الدخول الآمن.',
          'تشغيل وظائف المنصة الأساسية.',
          'التواصل معك بشأن حسابك أو طلباتك.',
          'لا نبيع بياناتك لأي طرف ثالث.',
          'لا نستخدم بياناتك لأغراض تسويقية دون موافقتك.',
        ],
        pointsEn: [
          'Identity verification and secure login.',
          'Operating core platform functions.',
          'Communicating with you about your account or tasks.',
          'We do not sell your data to any third party.',
          'We do not use your data for marketing without your consent.',
        ],
      },
      {
        titleAr: 'حقوقك',
        titleEn: 'Your Rights',
        pointsAr: [
          'يحق لك طلب حذف حسابك وبياناتك في أي وقت.',
          'يحق لك الاطلاع على بياناتك المحفوظة لدينا.',
          'يحق لك تصحيح أي بيانات غير دقيقة.',
          'نلتزم بنظام حماية البيانات الشخصية (PDPL) في المملكة العربية السعودية.',
        ],
        pointsEn: [
          'You have the right to request deletion of your account and data at any time.',
          'You have the right to access your stored personal data.',
          'You have the right to correct any inaccurate data.',
          'We comply with the Personal Data Protection Law (PDPL) of Saudi Arabia.',
        ],
      },
    ],
  },
  provider: {
    icon: UserCheck,
    titleAr: 'شروط مقدمي الخدمة',
    titleEn: 'Service Provider Terms',
    subtitleAr: 'يجب على كل من يقدم خدمات عبر المنصة الموافقة على هذه الشروط.',
    subtitleEn: 'Anyone providing services through the platform must agree to these terms.',
    sections: [
      {
        titleAr: 'الالتزامات الأساسية',
        titleEn: 'Core Obligations',
        pointsAr: [
          'يجب تقديم معلومات دقيقة وصحيحة عند التسجيل.',
          'يُحظر تضليل العملاء أو خداعهم بأي طريقة.',
          'يجب إتمام الطلبات المتفق عليها بأمانة واحترافية.',
          'يُحظر طلب دفع خارج نطاق المنصة.',
          'يجب احترام خصوصية العملاء وبياناتهم الشخصية.',
        ],
        pointsEn: [
          'Accurate and truthful information must be provided at registration.',
          'Misleading or deceiving clients in any way is strictly prohibited.',
          'Agreed tasks must be completed honestly and professionally.',
          'Requesting payment outside the platform is prohibited.',
          'Client privacy and personal data must be respected.',
        ],
      },
      {
        titleAr: 'المسؤولية والعلاقة',
        titleEn: 'Responsibility and Relationship',
        pointsAr: [
          'المنصة غير مسؤولة عن الاتفاقيات بين مقدم الخدمة والعميل.',
          'مقدم الخدمة مسؤول مسؤولية كاملة عن أفعاله وأعماله.',
          'مقدم الخدمة يعمل بصفة مستقلة وليس موظفاً في المنصة.',
          'المنصة لا تضمن توفر الطلبات أو الدخل لمقدمي الخدمة.',
        ],
        pointsEn: [
          'The platform is not responsible for agreements between service providers and clients.',
          'Service providers are fully responsible for their actions and conduct.',
          'Service providers operate independently and are not employees of the platform.',
          'The platform does not guarantee task availability or income for providers.',
        ],
      },
      {
        titleAr: 'العقوبات والإزالة',
        titleEn: 'Penalties and Removal',
        pointsAr: [
          'أي انتهاك لهذه الشروط قد يؤدي إلى تعليق الحساب فوراً.',
          'الاحتيال أو التضليل يؤدي إلى حظر دائم من المنصة.',
          'المنصة تحتفظ بحق الإزالة دون سابق إنذار في حالات الانتهاكات الجسيمة.',
        ],
        pointsEn: [
          'Any violation of these terms may result in immediate account suspension.',
          'Fraud or deception leads to permanent ban from the platform.',
          'The platform reserves the right to remove accounts without notice in cases of serious violations.',
        ],
      },
    ],
  },
  liability: {
    icon: AlertTriangle,
    titleAr: 'إخلاء المسؤولية',
    titleEn: 'Liability Disclaimer',
    subtitleAr: 'يرجى قراءة هذا الإشعار بعناية. يحدد نطاق مسؤولية المنصة.',
    subtitleEn: 'Please read this notice carefully. It defines the scope of platform liability.',
    sections: [
      {
        titleAr: 'المنصة وسيط فقط',
        titleEn: 'Platform as Intermediary Only',
        pointsAr: [
          'أمرني هي منصة رقمية تعمل كوسيط بين المستخدمين فقط.',
          'المنصة لا تتحكم في سلوك أو تصرفات أي مستخدم.',
          'المنصة لا تضمن سلامة أو جودة أو قانونية أي تعامل بين المستخدمين.',
          'استخدامك للمنصة يعني قبولك الكامل لهذه الشروط.',
        ],
        pointsEn: [
          'Amerni is a digital platform operating solely as an intermediary between users.',
          'The platform does not control the behavior or actions of any user.',
          'The platform does not guarantee the safety, quality, or legality of any interaction between users.',
          'Your use of the platform constitutes full acceptance of these terms.',
        ],
      },
      {
        titleAr: 'حدود المسؤولية',
        titleEn: 'Limits of Liability',
        pointsAr: [
          'المنصة غير مسؤولة عن أي ضرر جسدي ناتج عن التفاعل بين المستخدمين.',
          'المنصة غير مسؤولة عن أي نزاعات مالية أو خسائر مادية بين المستخدمين.',
          'المنصة غير مسؤولة عن أضرار الممتلكات الناتجة عن أي تعامل.',
          'المنصة غير مسؤولة عن اتفاقيات خارج نطاق المنصة.',
          'المنصة غير مسؤولة عن الأذى الشخصي أو أي ضرر غير مباشر.',
          'المستخدم يتحمل كامل مسؤولية قراراته واختياراته على المنصة.',
        ],
        pointsEn: [
          'The platform is not liable for any physical harm resulting from interactions between users.',
          'The platform is not liable for any financial disputes or material losses between users.',
          'The platform is not liable for property damage resulting from any interaction.',
          'The platform is not liable for agreements made outside the platform.',
          'The platform is not liable for personal harm or any indirect damages.',
          'Users bear full responsibility for their decisions and choices on the platform.',
        ],
      },
      {
        titleAr: 'الاستخدام على مسؤوليتك',
        titleEn: 'Use at Your Own Risk',
        pointsAr: [
          'تستخدم هذه المنصة على مسؤوليتك الشخصية الكاملة.',
          'يجب عليك التحقق من هوية أي شخص قبل التعامل معه.',
          'يجب الإبلاغ عن أي سلوك مشبوه أو مخالف فوراً.',
          'المنصة توفر بيئة للتواصل فقط وليست ضامنة لأي نتيجة.',
        ],
        pointsEn: [
          'You use this platform at your own full personal risk.',
          'You must verify the identity of any person before interacting with them.',
          'Any suspicious or violating behavior must be reported immediately.',
          'The platform provides a communication environment only and does not guarantee any outcome.',
        ],
      },
    ],
  },
};

export function LegalPage() {
  const { navigate, legalDoc, openLegal } = useApp();
  const { lang, isRTL } = useLanguage();

  const BackIcon = isRTL ? ChevronRight : ArrowLeft;

  const tabs: { id: LegalDoc; labelAr: string; labelEn: string }[] = [
    { id: 'terms', labelAr: 'شروط الخدمة', labelEn: 'Terms' },
    { id: 'privacy', labelAr: 'الخصوصية', labelEn: 'Privacy' },
    { id: 'provider', labelAr: 'مقدمو الخدمة', labelEn: 'Providers' },
    { id: 'liability', labelAr: 'إخلاء المسؤولية', labelEn: 'Liability' },
  ];

  const activeDoc = legalDoc ?? 'terms';
  const doc = DOCS[activeDoc];
  const Icon = doc.icon;

  return (
    <div className="min-h-screen bg-[#080808] pt-16">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back */}
        <button
          onClick={() => navigate('landing')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-8"
        >
          <BackIcon size={14} />
          {lang === 'ar' ? 'الرئيسية' : 'Home'}
        </button>

        {/* Doc tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => openLegal(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeDoc === tab.id
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
            <Icon size={22} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">
            {lang === 'ar' ? doc.titleAr : doc.titleEn}
          </h1>
          <p className="text-zinc-500 text-sm mb-2">
            {lang === 'ar' ? doc.subtitleAr : doc.subtitleEn}
          </p>
          <p className="text-xs text-zinc-700">
            {lang === 'ar' ? LAST_UPDATED_AR : LAST_UPDATED_EN}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {doc.sections.map((section, i) => (
            <div key={i} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4 pb-3 border-b border-zinc-800">
                {lang === 'ar' ? section.titleAr : section.titleEn}
              </h2>
              <ul className="space-y-3">
                {(lang === 'ar' ? section.pointsAr : section.pointsEn).map((point, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
                    <p className="text-sm text-zinc-400 leading-relaxed">{point}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-center">
          <p className="text-xs text-zinc-600 leading-relaxed">
            {lang === 'ar'
              ? 'باستخدامك للمنصة، فأنت توافق على جميع الشروط والأحكام المذكورة أعلاه. للاستفسار: support@amerni.sa'
              : 'By using the platform, you agree to all terms and conditions stated above. For inquiries: support@amerni.sa'}
          </p>
        </div>
      </div>
    </div>
  );
}
