import { AlertCircle, CheckCircle, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export function VerificationBanner() {
  const { profile } = useAuth();
  const { lang } = useLanguage();

  if (!profile) return null;

  // Phone-verified guests are fully verified for this MVP
  if (profile.phone_verified) return null;

  return (
    <div className="bg-amber-500/8 border-b border-amber-500/20 px-4 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
        <p className="text-xs text-amber-300 flex-1">
          {lang === 'ar'
            ? 'رقم جوالك لم يتم التحقق منه بعد. بعض الميزات مقيدة حتى يتم التحقق.'
            : 'Your phone number is not yet verified. Some features are restricted until verified.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Hook — returns whether the current user can perform platform actions.
 * Guest users (phone-verified via OTP) are considered verified.
 * Email/password users need phone_verified to be true.
 */
export function useIsVerified(): boolean {
  const { user, profile } = useAuth();
  if (!user) return false;
  // If profile hasn't loaded yet, optimistically allow (prevents flash of blocked UI)
  if (!profile) return true;
  return profile.phone_verified === true;
}
