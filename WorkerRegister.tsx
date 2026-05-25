import { useState } from 'react';
import { Menu, X, ChevronDown, LogOut, LayoutDashboard, Briefcase, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { NotificationBell } from '../ui/NotificationBell';
import { getAvatarUrl } from '../../lib/supabase';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { page, navigate, openAuthModal, openLegal } = useApp();
  const { t, lang, setLang, isRTL } = useLanguage();
  const isVerified = profile?.phone_verified === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isLanding = page === 'landing';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${isLanding ? 'bg-transparent' : 'bg-[#080808]/95 border-b border-zinc-800/50 backdrop-blur-xl'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => navigate('landing')} className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 transition-all">
              <span className="text-black font-black text-sm">أ</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">أمرني</span>
          </button>

          {/* Desktop center nav links */}
          <div className="hidden md:flex items-center gap-8">
            {isLanding && (
              <>
                <a href="#how-it-works" className="text-zinc-400 hover:text-white text-sm transition-colors">{t('nav_how_it_works')}</a>
                <a href="#features" className="text-zinc-400 hover:text-white text-sm transition-colors">{t('nav_features')}</a>
                <a href="#trust" className="text-zinc-400 hover:text-white text-sm transition-colors">{t('nav_trust')}</a>
              </>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setLang('ar')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${lang === 'ar' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                عربي
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${lang === 'en' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                EN
              </button>
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  <img
                    src={profile?.avatar_url || getAvatarUrl(profile?.full_name || user.email || '')}
                    alt="avatar"
                    className="w-7 h-7 rounded-full"
                  />
                  <span className="text-sm text-white hidden sm:block">{profile?.full_name || t('nav_account')}</span>
                  <ChevronDown size={14} className="text-zinc-500" />
                </button>

                {profileOpen && (
                  <div className={`absolute top-full mt-2 w-52 bg-[#111] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-sm font-medium text-white">{profile?.full_name || t('nav_account')}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {isVerified ? (
                          <><CheckCircle size={11} className="text-emerald-500" /><span className="text-xs text-emerald-500">{lang === 'ar' ? 'موثق' : 'Verified'}</span></>
                        ) : (
                          <><AlertCircle size={11} className="text-amber-400" /><span className="text-xs text-amber-400">{lang === 'ar' ? 'غير موثق' : 'Unverified'}</span></>
                        )}
                      </div>
                    </div>
                    <div className="p-1">
                      <button onClick={() => { navigate('dashboard'); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                        <LayoutDashboard size={15} /> {t('nav_my_tasks')}
                      </button>
                      {(profile?.role === 'worker' || profile?.role === 'admin') && (
                        <button onClick={() => { navigate('worker'); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                          <Briefcase size={15} /> {t('nav_worker_panel')}
                        </button>
                      )}
                      {profile?.role === 'admin' && (
                        <button onClick={() => { navigate('admin'); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                          <Shield size={15} /> {t('nav_admin_panel')}
                        </button>
                      )}
                      <button onClick={() => { signOut(); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors">
                        <LogOut size={15} /> {t('nav_sign_out')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Worker login for non-customers */}
                <Button variant="ghost" size="sm" onClick={() => openAuthModal('login')}>{t('nav_worker_login')}</Button>
                <Button size="sm" onClick={() => openAuthModal('signup')}>{t('nav_become_worker')}</Button>
              </>
            )}

            <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-zinc-800 py-4 flex flex-col gap-3">
            {isLanding && (
              <>
                <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-zinc-400 hover:text-white text-sm px-2">{t('nav_how_it_works')}</a>
                <a href="#features" onClick={() => setMenuOpen(false)} className="text-zinc-400 hover:text-white text-sm px-2">{t('nav_features')}</a>
                <a href="#trust" onClick={() => setMenuOpen(false)} className="text-zinc-400 hover:text-white text-sm px-2">{t('nav_trust')}</a>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
