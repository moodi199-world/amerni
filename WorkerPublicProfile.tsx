/**
 * WorkerPublicProfile.tsx
 * بروفايل العامل العام — التقييمات والتعليقات تظهر للكل
 */

import { useState, useEffect } from 'react';
import { Star, MapPin, Clock, CheckCircle, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAvatarUrl } from '../../lib/supabase';

interface Rating {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  rater_id: string;
  profiles?: { full_name: string };
}

interface WorkerProfile {
  id: string;
  user_id: string;
  full_name: string;
  city: string;
  rating: number;
  completed_tasks: number;
  skills: string[];
  bio: string;
  is_approved: boolean;
  verification_level: string;
  availability_status: string;
}

interface WorkerSchedule {
  work_days: number[];
  start_hour: number;
  end_hour: number;
  is_available: boolean;
}

interface WorkerPublicProfileProps {
  workerId: string;
  compact?: boolean;
}

const DAY_NAMES = ['أح', 'ثن', 'ثل', 'أر', 'خم', 'جم', 'سب'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  return `${h}${i < 12 ? 'ص' : 'م'}`;
});

function StarDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}
        />
      ))}
    </div>
  );
}

export function WorkerPublicProfile({ workerId, compact = false }: WorkerPublicProfileProps) {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [schedule, setSchedule] = useState<WorkerSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from('worker_profiles')
        .select('*')
        .eq('user_id', workerId)
        .single(),
      supabase
        .from('ratings')
        .select('*, profiles(full_name)')
        .eq('worker_id', workerId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('worker_schedule')
        .select('*')
        .eq('worker_id', workerId)
        .single(),
    ]).then(([profileRes, ratingsRes, scheduleRes]) => {
      if (profileRes.data) setProfile(profileRes.data);
      if (ratingsRes.data) setRatings(ratingsRes.data as Rating[]);
      if (scheduleRes.data) setSchedule(scheduleRes.data);
      setLoading(false);
    });
  }, [workerId]);

  if (loading) return (
    <div className="flex items-center justify-center h-24">
      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return null;

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
    : 0;

  const isOnline = profile.availability_status === 'online';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="relative flex-shrink-0">
          <img
            src={getAvatarUrl(profile.full_name)}
            alt={profile.full_name}
            className="w-10 h-10 rounded-full"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${
            isOnline ? 'bg-emerald-500' : 'bg-zinc-600'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{profile.full_name}</div>
          <div className="flex items-center gap-2">
            <StarDisplay value={avgRating} size={11} />
            <span className="text-xs text-zinc-500">({ratings.length})</span>
          </div>
        </div>
        <div className="text-xs text-zinc-500">{profile.city}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Profile header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={getAvatarUrl(profile.full_name)}
              alt={profile.full_name}
              className="w-16 h-16 rounded-2xl"
            />
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${
              isOnline ? 'bg-emerald-500' : 'bg-zinc-600'
            }`} />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-white">{profile.full_name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin size={12} className="text-zinc-500" />
                  <span className="text-xs text-zinc-500">{profile.city}</span>
                </div>
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full border ${
                isOnline
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-zinc-500 bg-zinc-800 border-zinc-700'
              }`}>
                {isOnline ? '● متاح الآن' : '○ غير متاح'}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <StarDisplay value={avgRating} />
                <span className="text-sm font-semibold text-white">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-zinc-500">({ratings.length} تقييم)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800">
          <div className="text-center">
            <div className="text-xl font-black text-amber-400">{profile.completed_tasks}</div>
            <div className="text-xs text-zinc-500 mt-0.5">طلب منجز</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-white">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">متوسط التقييم</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle size={16} />
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {profile.verification_level === 'verified' ? 'موثق' : 'مسجل'}
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      {profile.skills?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Briefcase size={14} className="text-amber-500" />
            المهارات
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map(skill => (
              <span
                key={skill}
                className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full px-3 py-1"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Schedule */}
      {schedule?.is_available && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={14} className="text-amber-500" />
            أوقات العمل
          </div>
          <div className="flex gap-1.5 mb-2">
            {DAY_NAMES.map((day, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                  schedule.work_days?.includes(i)
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-800 text-zinc-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="text-xs text-zinc-500">
            من {HOUR_LABELS[schedule.start_hour]} حتى {HOUR_LABELS[schedule.end_hour]}
          </div>
        </div>
      )}

      {/* Ratings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Star size={14} className="text-amber-500" />
          التقييمات والتعليقات ({ratings.length})
        </div>

        {ratings.length === 0 ? (
          <div className="text-sm text-zinc-600 text-center py-4">
            لا يوجد تقييمات بعد
          </div>
        ) : (
          <div className="space-y-3">
            {ratings.map(r => (
              <div key={r.id} className="flex gap-3 pb-3 border-b border-zinc-800 last:border-0 last:pb-0">
                <img
                  src={getAvatarUrl(r.profiles?.full_name || 'م')}
                  alt=""
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-300">
                      {r.profiles?.full_name || 'مجهول'}
                    </span>
                    <StarDisplay value={r.stars} size={12} />
                  </div>
                  {r.comment && (
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{r.comment}</p>
                  )}
                  <div className="text-xs text-zinc-600 mt-1">
                    {new Date(r.created_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
