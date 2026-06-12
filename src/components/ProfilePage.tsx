import React, { useState, useEffect } from 'react';
import {
  Zap, Activity, TrendingUp, LogOut, Bell, BellOff,
  Award, Flame, Target, Shield, Star, ChevronRight
} from 'lucide-react';
import { Habit } from '../types';
import { calculateMomentum, dateToday } from '../data';
import { getLevelConfig } from './OnePercentBetterPage';

const REMINDER_KEY = 'habit_mountain_reminder_settings';

interface ReminderSettings {
  enabled: boolean;
  time: string;
}

interface ProfilePageProps {
  currentUser?: { email?: string; total_points?: number; locked_in_days?: number; consecutive_locked_in_streak?: number } | null;
  userPoints: number;
  habits: Habit[];
  momentumScore: number;
  onLogout?: () => void;
  onReset?: () => void;
  setTab: (tab: string) => void;
}

function getDisplayName(email?: string): string {
  if (!email) return 'Focus User';
  const local = email.split('@')[0];
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeOnePercentGrowth(habits: Habit[]): { growth: number; streak: number; levelName: string } {
  const journeyStartDate = localStorage.getItem('habit_mountain_journey_start_date');
  if (!journeyStartDate) {
    return { growth: 0, streak: 0, levelName: 'Not Started' };
  }

  const timelineDates: string[] = [];
  const start = new Date(journeyStartDate);
  const end = new Date(dateToday);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { growth: 0, streak: 0, levelName: 'Not Started' };
  }

  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    timelineDates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }

  let runningGrowth = 0;
  let greatStreak = 0;

  timelineDates.forEach((dateStr) => {
    const completedToday = habits.filter((h) => (h.history[dateStr] || 0) >= h.target).length;
    const totalToday = habits.length;
    const pScore = totalToday > 0 ? completedToday / totalToday : 1;

    let growthEarned = 0;
    if (pScore >= 0.8) {
      greatStreak += 1;
      growthEarned = greatStreak <= 2 ? 1.0 : greatStreak <= 4 ? 1.2 : 1.5;
    } else if (pScore >= 0.4) {
      growthEarned = 0.2;
    } else {
      greatStreak = 0;
      growthEarned = -0.5;
    }

    let floor = 0;
    if (runningGrowth >= 301) floor = 301;
    else if (runningGrowth >= 201) floor = 201;
    else if (runningGrowth >= 121) floor = 121;
    else if (runningGrowth >= 51) floor = 51;

    runningGrowth = Math.max(floor, runningGrowth + growthEarned);
    runningGrowth = Math.round(runningGrowth * 100) / 100;
  });

  const levelConfig = getLevelConfig(runningGrowth);
  return { growth: runningGrowth, streak: greatStreak, levelName: levelConfig.title };
}

function getMomentumLabel(score: number): string {
  if (score >= 90) return 'Ultra Focus';
  if (score >= 75) return 'Flow State';
  if (score >= 45) return 'Ignition';
  return 'Inertia';
}

function getMomentumColor(score: number): string {
  if (score >= 75) return '#12B886';
  if (score >= 45) return '#FCC419';
  return '#FA5252';
}

export default function ProfilePage({
  currentUser,
  userPoints,
  habits,
  momentumScore,
  onLogout,
  onReset,
  setTab,
}: ProfilePageProps) {
  const email = currentUser?.email || '';
  const displayName = getDisplayName(email);
  const initials = email.substring(0, 2).toUpperCase() || 'FN';
  const level = Math.floor(userPoints / 100) + 1;

  const { stateName } = calculateMomentum(habits);
  const { growth, streak, levelName } = computeOnePercentGrowth(habits);
  const onePctConfig = getLevelConfig(growth);

  const doneToday = habits.filter((h) => (h.history[dateToday] || 0) >= h.target).length;

  const [reminder, setReminder] = useState<ReminderSettings>(() => {
    try {
      const saved = localStorage.getItem(REMINDER_KEY);
      return saved ? JSON.parse(saved) : { enabled: false, time: '09:00' };
    } catch {
      return { enabled: false, time: '09:00' };
    }
  });

  useEffect(() => {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder));
  }, [reminder]);

  const badges = [
    { id: 'level', label: `Level ${level}`, icon: Star, color: '#FCC419', earned: userPoints >= 0 },
    { id: 'momentum', label: getMomentumLabel(momentumScore), icon: Activity, color: getMomentumColor(momentumScore), earned: momentumScore >= 45 },
    { id: 'flow', label: 'Flow State', icon: Flame, color: '#12B886', earned: momentumScore >= 75 },
    { id: 'ultra', label: 'Ultra Focus', icon: Zap, color: '#12B886', earned: momentumScore >= 90 },
    { id: 'better', label: onePctConfig.title.split(' ').slice(-1)[0] || 'Builder', icon: TrendingUp, color: onePctConfig.glowColor, earned: growth > 0 },
    { id: 'streak', label: `${streak}d Streak`, icon: Target, color: '#845EF7', earned: streak >= 2 },
    { id: 'complete', label: 'Daily Finisher', icon: Award, color: '#12B886', earned: doneToday === habits.length && habits.length > 0 },
    { id: 'veteran', label: 'Veteran', icon: Shield, color: '#228BE6', earned: userPoints >= 500 },
  ];

  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Profile header card */}
      <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#12B886]/5 rounded-bl-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#12B886]/20 to-purple-500/20 border-2 border-[#12B886]/30 flex items-center justify-center text-2xl font-black font-mono text-[#12B886] shadow-[0_0_24px_rgba(18,184,134,0.15)]">
            {initials}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <span className="text-[10px] font-mono text-[#12B886] uppercase tracking-widest font-bold">Your Profile</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{displayName}</h1>
            <p className="text-sm text-gray-400 mt-1 break-all">{email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <span className="text-xs font-mono font-bold bg-[#FCC419]/10 text-[#FCC419] border border-[#FCC419]/25 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 fill-[#FCC419]" />
                {userPoints} pts
              </span>
              <span className="text-xs font-mono font-bold bg-[#12B886]/10 text-[#12B886] border border-[#12B886]/25 px-2.5 py-1 rounded-full">
                Lv. {level}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            Momentum
          </div>
          <p className="text-xl font-extrabold" style={{ color: getMomentumColor(momentumScore) }}>
            {getMomentumLabel(momentumScore)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-mono">{momentumScore}% · {stateName}</p>
          <button
            onClick={() => setTab('momentum')}
            className="mt-3 text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
          >
            View details <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            1% Better
          </div>
          <p className={`text-xl font-extrabold ${onePctConfig.textColor}`}>
            +{growth.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1 truncate">{levelName}</p>
          <button
            onClick={() => setTab('1%better')}
            className="mt-3 text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
          >
            View journey <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#FCC419]" />
            Badges
          </h2>
          <span className="text-xs font-mono text-gray-500">{earnedBadges.length}/{badges.length} earned</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition ${
                  badge.earned
                    ? 'bg-[#1A1D27] border-[#2A3040]'
                    : 'bg-[#0F1118] border-[#1A1D27] opacity-40 grayscale'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${badge.color}18`, color: badge.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-300 leading-tight">{badge.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reminder settings */}
      <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          {reminder.enabled ? <Bell className="w-4 h-4 text-[#12B886]" /> : <BellOff className="w-4 h-4 text-gray-500" />}
          Daily Reminder
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Get a nudge to complete your habits each day. Saved on this device.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reminder.enabled}
              onChange={(e) => setReminder((r) => ({ ...r, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-600 text-[#12B886] focus:ring-[#12B886]"
            />
            <span className="text-sm font-semibold text-gray-300">Enable daily reminder</span>
          </label>
          {reminder.enabled && (
            <input
              type="time"
              value={reminder.time}
              onChange={(e) => setReminder((r) => ({ ...r, time: e.target.value }))}
              className="bg-[#13151D] border border-[#252A39] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#12B886]"
            />
          )}
        </div>
        {reminder.enabled && (
          <p className="text-[10px] text-[#12B886] mt-3 font-mono">
            Reminder set for {reminder.time} daily
          </p>
        )}
      </div>

      {/* Account actions */}
      <div className="space-y-3">
        {onReset && (
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#14161F] hover:bg-[#1A1D27] border border-[#232734] text-gray-400 hover:text-white text-sm font-semibold transition cursor-pointer min-h-[48px]"
          >
            Reset All Data
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#FA5252]/10 hover:bg-[#FA5252]/15 border border-[#FA5252]/25 text-[#FA5252] text-sm font-bold transition cursor-pointer min-h-[48px] active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
