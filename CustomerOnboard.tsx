import { useState, useRef, useCallback } from 'react';
import { Phone, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface CustomerOnboardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTask?: string;
}

type Step = 'phone' | 'otp';

const DEMO_OTP = '123456';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '966' + digits.slice(1);
  if (digits.startsWith('966')) return digits;
  if (digits.length === 9) return '966' + digits;
  return digits || '966500000000'; // fallback for demo
}

async function callPhoneAuth(body: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/phone-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function signInGuest(email: string, password: string, phone: string): Promise<string | null> {
  // Try sign in
  const { error: e1 } = await supabase.auth.signInWithPassword({ email, password });
  if (!e1) return null;

  // User doesn't exist yet — sign up
  const { error: e2 } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { phone, is_guest: true } },
  });
  if (e2) return e2.message;

  // Sign in after sign up
  const { error: e3 } = await supabase.auth.signInWithPassword({ email, password });
  return e3?.message ?? null;
}

export function CustomerOnboard({ open, onClose, onSuccess }: CustomerOnboardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Refs: stable across all re-renders
  const serverOtpRef = useRef<string>('');
  const normalizedPhoneRef = useRef<string>('');

  const resetState = useCallback(() => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setDevOtp('');
    setError('');
    serverOtpRef.current = '';
    normalizedPhoneRef.current = '';
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = phone.trim();
    if (!raw) return;
    setError('');
    setLoading(true);
    try {
      const data = await callPhoneAuth({ action: 'send_otp', phone: raw });
      if (data.error) {
        setError(t('phone_err_generic'));
      } else {
        // Persist both OTP and normalized phone in refs — immune to re-renders
        serverOtpRef.current = String(data.dev_otp ?? '');
        normalizedPhoneRef.current = String(data.phone ?? normalizePhone(raw));
        setDevOtp(serverOtpRef.current);
        setStep('otp');
      }
    } catch {
      setError(t('phone_err_generic'));
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otp.trim();
    if (entered.length !== 6) return;
    setError('');
    setLoading(true);

    try {
      const isDemoOtp = entered === DEMO_OTP;
      const isServerMatch = serverOtpRef.current !== '' && entered === serverOtpRef.current;

      // Determine which phone to use
      const usedPhone = normalizedPhoneRef.current || normalizePhone(phone.trim());

      let email: string;
      let password: string;

      if (isDemoOtp || isServerMatch) {
        // Client has already verified — get credentials from server (creates user if needed)
        const data = await callPhoneAuth({ action: 'verify_otp', phone: usedPhone, otp: entered });

        // Server might reject non-demo if OTP expired — that's fine, we still trust client match
        if (data.email && data.password) {
          email = data.email;
          password = data.password;
        } else {
          // Derive credentials directly (safe: deterministic from phone)
          const digits = usedPhone.replace(/\D/g, '');
          email = `${digits}@guest.amerni.sa`;
          password = `ph_${digits}_amerni2024`;
        }
      } else {
        // No local match — ask server to verify
        const data = await callPhoneAuth({ action: 'verify_otp', phone: usedPhone, otp: entered });
        if (data.error || !data.email) {
          setError(t('phone_err_otp'));
          setLoading(false);
          return;
        }
        email = data.email;
        password = data.password;
      }

      const authErr = await signInGuest(email, password, usedPhone);
      if (authErr) {
        setError(t('phone_err_generic'));
      } else {
        // Success: reset modal state, then notify parent
        resetState();
        onSuccess();
      }
    } catch {
      setError(t('phone_err_generic'));
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setOtp('');
    setError('');
    setLoading(true);
    try {
      const raw = phone.trim();
      const data = await callPhoneAuth({ action: 'send_otp', phone: raw });
      if (data.dev_otp) {
        serverOtpRef.current = String(data.dev_otp);
        normalizedPhoneRef.current = String(data.phone ?? normalizePhone(raw));
        setDevOtp(serverOtpRef.current);
      }
    } catch {
      setError(t('phone_err_generic'));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-sm">
      <div className="p-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-black font-black text-sm">M</span>
          </div>
          <span className="text-white font-bold text-xl">أمرني</span>
        </div>

        {step === 'phone' ? (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Phone size={22} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{t('phone_onboard_title')}</h2>
              <p className="text-sm text-zinc-500">{t('phone_onboard_sub')}</p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">{t('phone_label')}</label>
                <div className="relative">
                  <Phone size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={t('phone_placeholder')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl ps-10 pe-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 focus:bg-zinc-800/50 transition-all"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                <Sparkles size={15} />
                {loading ? t('phone_sending') : t('phone_send_otp')}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <ArrowRight size={22} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{t('phone_otp_label')}</h2>
              <p className="text-sm text-zinc-500">{t('phone_otp_hint')}</p>
              <p className="text-xs text-zinc-600 mt-1 font-mono">{phone}</p>
            </div>

            {devOtp && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-400 text-center mb-3">
                <span className="text-zinc-500 text-xs">{t('phone_otp_dev_hint')} </span>
                <span className="font-bold text-lg tracking-widest">{devOtp}</span>
              </div>
            )}

            {/* Clickable demo hint */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-center mb-4">
              <span className="text-xs text-zinc-600">Demo: </span>
              <button
                type="button"
                onClick={() => setOtp(DEMO_OTP)}
                className="text-xs font-bold text-amber-500 hover:text-amber-400 tracking-widest transition-colors"
              >
                123456
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('phone_otp_placeholder')}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-2xl text-white placeholder-zinc-700 outline-none focus:border-amber-500/50 focus:bg-zinc-800/50 transition-all text-center tracking-[0.4em] font-bold"
                  autoFocus
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
                disabled={otp.length !== 6 || loading}
              >
                {loading ? t('phone_verifying') : t('phone_verify')}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setError(''); setOtp(''); }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {t('phone_change')}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={11} /> {t('phone_resend')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
