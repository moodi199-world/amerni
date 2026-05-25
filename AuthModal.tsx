/**
 * AIPriceSuggestion.tsx
 * الذكاء الاصطناعي يعطي رينج سعر منطقي للطلب
 * يُستخدم في صفحة إنشاء الطلب
 */

import { useState } from 'react';
import { Sparkles, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface PriceRange {
  min: number;
  max: number;
  label: string;       // "خدمة بسيطة" | "متوسطة" | "متخصصة"
  reasoning: string;   // تفسير قصير
}

interface AIPriceSuggestionProps {
  taskTitle: string;
  taskCategory: string;
  onPriceSelect: (min: number, max: number) => void;
}

// ─── Price logic based on category & keywords ─────────────────────────────────
function estimatePrice(title: string, category: string): PriceRange {
  const text = (title + ' ' + category).toLowerCase();

  // Specialized / expert tasks
  if (/قانون|محام|طبيب|مهندس|خبير|ترجمة رسمية|برمجة|تطبيق|موقع|تصميم احترافي/.test(text)) {
    return { min: 150, max: 500, label: 'خدمة متخصصة', reasoning: 'تتطلب خبرة أو شهادة متخصصة' };
  }

  // Medium tasks
  if (/تصوير|تصميم|شرح|تدريس|ترجمة|تقرير|بحث|مونتاج|محتوى/.test(text)) {
    return { min: 80, max: 200, label: 'خدمة متوسطة', reasoning: 'تتطلب مهارة ووقتاً' };
  }

  // Field tasks
  if (/توصيل|إيصال|وثيقة|طابور|معاملة|أبشر|بلدية|تسجيل|التحقق من/.test(text)) {
    return { min: 50, max: 120, label: 'مهمة ميدانية', reasoning: 'تتطلب حضوراً مادياً' };
  }

  // Simple / quick tasks
  if (/تأكد|تحقق|سؤال|معلومة|اتصل|اسأل|شوف|شوف لي/.test(text)) {
    return { min: 20, max: 60, label: 'مهمة بسيطة', reasoning: 'سريعة ولا تحتاج وقتاً طويلاً' };
  }

  // Default
  return { min: 40, max: 100, label: 'خدمة عامة', reasoning: 'تقدير بناءً على الطلب' };
}

const LABEL_COLOR: Record<string, string> = {
  'خدمة بسيطة':    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'مهمة بسيطة':    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'مهمة ميدانية':  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'خدمة متوسطة':   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'خدمة عامة':     'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'خدمة متخصصة':   'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export function AIPriceSuggestion({ taskTitle, taskCategory, onPriceSelect }: AIPriceSuggestionProps) {
  const [expanded, setExpanded] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [mode, setMode] = useState<'ai' | 'custom'>('ai');

  const estimate = estimatePrice(taskTitle, taskCategory);
  const labelColor = LABEL_COLOR[estimate.label] || 'text-zinc-400 bg-zinc-800 border-zinc-700';

  const handleAISelect = () => {
    setMode('ai');
    onPriceSelect(estimate.min, estimate.max);
  };

  const handleCustom = () => {
    const min = parseInt(customMin);
    const max = parseInt(customMax);
    if (min > 0 && max > min) {
      setMode('custom');
      onPriceSelect(min, max);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Sparkles size={14} className="text-amber-500" />
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-white">السعر المتوقع</div>
            <div className="text-xs text-zinc-500">الذكاء الاصطناعي يقترح نطاق منطقي</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-base font-bold text-amber-400">
            {estimate.min} - {estimate.max} ريال
          </div>
          {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-4">

          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs border rounded-full px-3 py-1 ${labelColor}`}>
              {estimate.label}
            </span>
            <span className="text-xs text-zinc-600">{estimate.reasoning}</span>
          </div>

          {/* AI suggestion card */}
          <button
            onClick={handleAISelect}
            className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
              mode === 'ai'
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                mode === 'ai' ? 'border-amber-500' : 'border-zinc-600'
              }`}>
                {mode === 'ai' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-amber-500" />
                <span className="text-xs text-amber-500 font-medium">مقترح الذكاء الاصطناعي</span>
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {estimate.min} - {estimate.max}
              <span className="text-sm font-normal text-zinc-400 mr-1">ريال</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              العامل يقترح سعره ضمن هذا النطاق
            </div>
          </button>

          {/* Custom price */}
          <div
            onClick={() => setMode('custom')}
            className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
              mode === 'custom'
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                mode === 'custom' ? 'border-amber-500' : 'border-zinc-600'
              }`}>
                {mode === 'custom' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <span className="text-xs text-zinc-400 font-medium">حدد ميزانيتك</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-zinc-600 mb-1">من (ريال)</div>
                <input
                  type="number"
                  value={customMin}
                  onChange={e => setCustomMin(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder={String(estimate.min)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <div className="text-xs text-zinc-600 mb-1">إلى (ريال)</div>
                <input
                  type="number"
                  value={customMax}
                  onChange={e => setCustomMax(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder={String(estimate.max)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
            {mode === 'custom' && customMin && customMax && (
              <button
                onClick={e => { e.stopPropagation(); handleCustom(); }}
                className="mt-2 w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-colors"
              >
                تأكيد الميزانية
              </button>
            )}
          </div>

          {/* Info */}
          <p className="text-xs text-zinc-600 text-center">
            💡 العامل يقترح سعره — وتقدر تفاوض إذا ما عجبك
          </p>
        </div>
      )}
    </div>
  );
}
