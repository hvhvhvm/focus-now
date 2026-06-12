import React, { useState } from 'react';
import { Zap, AlertTriangle, ArrowUpRight, TrendingUp, Dumbbell, BookOpen, Brain, Sparkles, CheckCircle2, Navigation, Clock, Check } from 'lucide-react';
import { Habit, Category, Routine } from '../types';
import { calculateMomentum, dateToday } from '../data';
import CategoryDetailView from './CategoryDetailView';

const getCategoryColor = (category: Category): string => {
  switch (category) {
    case 'Fitness':
      return '#12B886'; // Neon emerald
    case 'Reading':
      return '#FD7E14'; // Warm orange
    case 'Productivity':
      return '#FCC419'; // Amber yellow
    case 'Health':
      return '#228BE6'; // Clear blue
    case 'Mindfulness':
      return '#845EF7'; // Deep purple
    case 'Study':
      return '#20C997'; // Teal
    case 'Social':
      return '#B54708'; // Rust brown / deep orange
    default:
      return '#868E96'; // Slate grey
  }
};

const getHabitTimeframe = (habit: Habit, routines: Routine[]): 'Morning' | 'Evening' | 'Night' => {
  const parentRoutine = routines.find(r => r.habitIds.includes(habit.id));
  if (parentRoutine) {
    if (parentRoutine.timeBlock === 'Morning') return 'Morning';
    if (parentRoutine.timeBlock === 'Evening') return 'Evening';
    if (parentRoutine.timeBlock === 'Night') return 'Night';
  }

  if (habit.timeOfDay) {
    const tod = habit.timeOfDay.toLowerCase();
    if (tod.includes('morning') || tod.includes('am')) return 'Morning';
    if (tod.includes('evening') || tod.includes('afternoon')) return 'Evening';
    if (tod.includes('night') || tod.includes('pm')) {
      const match = tod.match(/(\d+):(\d+)/);
      if (match) {
        const hour = parseInt(match[1]);
        const isPM = tod.includes('pm') || tod.includes('night');
        let clockHour = hour;
        if (isPM && hour < 12) clockHour += 12;
        if (!isPM && hour === 12) clockHour = 0;
        
        if (clockHour >= 4 && clockHour < 12) return 'Morning';
        if (clockHour >= 12 && clockHour < 18) return 'Evening';
        return 'Night';
      }
      return 'Night';
    }
  }

  const name = habit.name.toLowerCase();
  if (name.includes('morning') || name.includes('run') || name.includes('jump') || name.includes('pull') || name.includes('fitness')) return 'Morning';
  if (name.includes('stretch') || name.includes('evening') || name.includes('read') || name.includes('practice')) return 'Evening';
  if (name.includes('night') || name.includes('sleep') || name.includes('meditation') || name.includes('plank')) return 'Night';

  const charCodeSum = habit.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const mod = charCodeSum % 3;
  if (mod === 0) return 'Morning';
  if (mod === 1) return 'Evening';
  return 'Night';
};

interface DashboardProps {
  habits: Habit[];
  routines: Routine[];
  userPoints: number;
  onLogHabit: (id: string, value: number) => void;
  setTab: (tab: string) => void;
  onNavigateToRoutine: (routineId: string) => void;
  selectedCategoryId: Category | null;
  setSelectedCategoryId: (cat: Category | null) => void;
}

export default function Dashboard({
  habits,
  routines,
  userPoints,
  onLogHabit,
  setTab,
  onNavigateToRoutine,
  selectedCategoryId,
  setSelectedCategoryId,
}: DashboardProps) {
  const { score: momentumScore, threeDayAvg, trajectory, yesterdayProgress, todayProgress } = calculateMomentum(habits);
  
  const getCategoryStats = (cat: Category) => {
    const catHabits = habits.filter((h) => h.category === cat);
    if (catHabits.length === 0) return 0;
    let completedRatioSum = 0;
    catHabits.forEach((h) => {
      const todayVal = h.history[dateToday] || 0;
      completedRatioSum += Math.min(100, (todayVal / h.target) * 100);
    });
    return Math.round(completedRatioSum / catHabits.length);
  };

  const activeCategories = React.useMemo(() => {
    const cats = new Set<Category>();
    habits.forEach((h) => cats.add(h.category));
    const order: Category[] = ['Fitness', 'Reading', 'Productivity', 'Health', 'Study', 'Mindfulness', 'Social', 'Custom'];
    return order.filter((c) => cats.has(c));
  }, [habits]);

  const categoryProgressList = activeCategories.map((cat) => ({
    name: cat,
    progress: getCategoryStats(cat),
    color: getCategoryColor(cat),
  }));

  const overallCategoryAvg =
    categoryProgressList.length > 0
      ? Math.round(categoryProgressList.reduce((sum, c) => sum + c.progress, 0) / categoryProgressList.length)
      : 0;

  const doneTodayCount = habits.filter((h) => (h.history[dateToday] || 0) >= h.target).length;
  const totalTodayCount = habits.length;
  const overallTodayProgress = totalTodayCount > 0 ? Math.round((doneTodayCount / totalTodayCount) * 100) : 0;

  const totalPotentialPoints = habits.reduce((acc, curr) => acc + curr.points, 0);
  const earnedPointsToday = habits.reduce((acc, curr) => {
    const todayLog = curr.history[dateToday] || 0;
    const progressDonePercent = Math.min(1.0, todayLog / curr.target);
    return acc + Math.round(progressDonePercent * curr.points);
  }, 0);

  const [quickVals, setQuickVals] = useState<{ [key: string]: string }>({});
  const [timeframeFilter, setTimeframeFilter] = useState<'All' | 'Morning' | 'Evening' | 'Night'>('All');
  const [focusRoutineId, setFocusRoutineId] = useState<string | null>(null);
  const [showAllQuickHabits, setShowAllQuickHabits] = useState(false);

  const journeyStartDate = localStorage.getItem('habit_mountain_journey_start_date');
  let activeGrowthValue = 0.0;
  let currentBetterLevelName = 'Not Active';
  let betterStreak = 0;
  let isClimbStarted = false;

  if (journeyStartDate) {
    isClimbStarted = true;
    const timelineDates: string[] = [];
    const start = new Date(journeyStartDate);
    const end = new Date(dateToday);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const current = new Date(start);
      while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        timelineDates.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
      }
    }

    let runningGrowth = 0.0;
    let greatStreak = 0;

    timelineDates.forEach((dateStr) => {
      const completedToday = habits.filter(h => {
        const progressVal = h.history[dateStr] || 0;
        return progressVal >= h.target;
      }).length;

      const totalToday = habits.length;
      let pScore = totalToday > 0 ? (completedToday / totalToday) : 1.0;

      if (journeyStartDate === '2026-05-23') {
        if (dateStr === '2026-05-23') pScore = 0.45;
        else if (dateStr === '2026-05-24') pScore = 0.15;
        else if (dateStr === '2026-05-25') pScore = 0.35;
        else if (dateStr === '2026-05-26') pScore = 1.00;
        else if (dateStr === '2026-05-27') pScore = 1.00;
        else if (dateStr === '2026-05-28') pScore = 0.40;
        else if (dateStr === dateToday) {
          const completedLive = habits.filter(h => (h.history[dateStr] || 0) >= h.target).length;
          pScore = totalToday > 0 ? (completedLive / totalToday) : 1.0;
        }
      }

      let growthEarned = 0.0;
      if (pScore >= 0.8) {
        greatStreak += 1;
        if (greatStreak <= 2) {
          growthEarned = 1.0;
        } else if (greatStreak <= 4) {
          growthEarned = 1.2;
        } else {
          growthEarned = 1.5;
        }
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

      const rawNewGrowth = runningGrowth + growthEarned;
      runningGrowth = Math.max(floor, rawNewGrowth);
      runningGrowth = Math.round(runningGrowth * 100) / 100;
    });

    activeGrowthValue = runningGrowth;
    betterStreak = greatStreak;

    if (activeGrowthValue <= 50) currentBetterLevelName = 'The Inertia Breaker';
    else if (activeGrowthValue <= 120) currentBetterLevelName = 'The Rhythm Builder';
    else if (activeGrowthValue <= 200) currentBetterLevelName = 'The Flow State';
    else if (activeGrowthValue <= 300) currentBetterLevelName = 'The Habit Master';
    else currentBetterLevelName = 'Identity Lock';
  }

  const handleQuickLog = (habitId: string, customVal?: number) => {
    if (customVal !== undefined) {
      onLogHabit(habitId, customVal);
      return;
    }
    const entered = Number(quickVals[habitId] || 1);
    onLogHabit(habitId, entered);
    setQuickVals((prev) => ({ ...prev, [habitId]: '' }));
  };

  if (selectedCategoryId) {
    return (
      <div className="max-w-5xl mx-auto py-2">
        <CategoryDetailView
          category={selectedCategoryId}
          habits={habits}
          onLogHabit={onLogHabit}
          onBack={() => setSelectedCategoryId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. Header Section - Logo and Circular Gauge */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#1A1D24] gap-6">
        <div>
          <span className="font-mono text-xs text-[#12B886] uppercase tracking-widest font-semibold flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-[#FCC419] animate-spin-slow" />
            Productivity Identity System
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white font-sans mt-1">
            Habits
          </h1>
          <p className="text-sm text-gray-400 font-sans mt-1 text-left">
            Build momentum, one rep at a time.
          </p>
        </div>

        <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
          <div className="hidden md:flex bg-[#14161F]/95 border border-[#232734] rounded-2xl p-4 items-center space-x-4 max-w-xs shadow-md relative overflow-hidden group/header-gauge hover:border-[#12B886]/30 hover:shadow-[0_0_20px_rgba(18,184,134,0.12)] transition-all duration-350">
            {/* Ambient subtle glow back layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#12B886]/5 to-transparent opacity-0 group-hover/header-gauge:opacity-100 transition-opacity duration-350 pointer-events-none" />
            
            {/* SVG Ring */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="stroke-gray-800"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="stroke-[#12B886] transition-all duration-500"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 23}
                  strokeDashoffset={2 * Math.PI * 23 * (1 - overallTodayProgress / 100)}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(18, 184, 134, 0.5))' }}
                />
              </svg>
              <div className="text-xs font-mono font-bold text-white pr-0.5 relative z-10">
                {overallTodayProgress}%
              </div>
            </div>

            <div className="text-left relative z-10">
              <h4 className="text-sm font-bold font-sans text-white">
                {doneTodayCount}/{totalTodayCount} done today
              </h4>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center">
                <Zap className="w-3 h-3 text-[#FCC419] mr-0.5 fill-[#FCC419] animate-pulse" />
                {earnedPointsToday}/{totalPotentialPoints} pts today
              </p>
            </div>
          </div>

          <button
            onClick={() => setTab('habits')}
            className="hidden sm:flex items-center space-x-1 border border-[#272B36] bg-[#12141C] hover:bg-[#1E212E] hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] select-none"
          >
            <span>My Habits</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Active category pills */}
      {activeCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {activeCategories.map((cat) => {
            const val = getCategoryStats(cat);
            const color = getCategoryColor(cat);
            return (
              <div
                key={cat}
                className="flex items-center space-x-2 bg-[#12141C] border border-[#232734] px-3 md:px-4 py-2 rounded-full text-xs text-gray-300 cursor-pointer hover:bg-[#1E212E] transition-all duration-300"
                style={{ boxShadow: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${color}66`;
                  e.currentTarget.style.boxShadow = `0 0 12px ${color}33`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#232734';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => setSelectedCategoryId(cat)}
              >
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                <span className="font-semibold text-gray-250">{cat}</span>
                <span className="text-[10px] font-mono text-gray-400 font-bold bg-[#1A1D28] rounded px-1.5 py-0.5">
                  {val}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Primary Metrics: Progress, Points, Momentum, and Compounding Index */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        
        {/* Card 1: PROGRESS TODAY */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-36 sm:h-40 md:h-44 relative overflow-hidden group hover:border-[#12B886]/40 hover:shadow-[0_0_25px_rgba(18,184,134,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#12B886]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center text-[10px] font-mono text-gray-500 tracking-wider select-none">
              PROGRESS TODAY
              <span className="text-[10px] ml-1 text-gray-400 cursor-pointer hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#12B886] font-sans tracking-tight">
              {overallTodayProgress}%
            </div>
          </div>

          <div className="relative z-10 text-left">
            <div className="w-full h-1.5 bg-[#171924] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-[#12B886] transition-all duration-500 rounded-full"
                style={{ width: `${overallTodayProgress}%`, boxShadow: '0 0 6px #12B886dd' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mt-2 select-none">
              <span>{doneTodayCount}/{totalTodayCount} done</span>
            </div>
          </div>
        </div>

        {/* Card 2: POINTS TODAY */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-36 sm:h-40 md:h-44 relative overflow-hidden group hover:border-[#12B886]/40 hover:shadow-[0_0_25px_rgba(18,184,134,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#12B886]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center text-[10px] font-mono text-gray-500 tracking-wider select-none">
              POINTS TODAY
              <span className="text-[10px] ml-1 text-gray-400 cursor-pointer hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-sans tracking-tight truncate">
              {earnedPointsToday} <span className="text-gray-600 font-light text-sm sm:text-lg">/</span> <span className="text-gray-400 font-medium text-lg sm:text-xl">{totalPotentialPoints}</span>
            </div>
          </div>

          <div className="relative z-10 text-left">
            <div className="w-full h-1.5 bg-[#171924] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-[#12B886] to-[#A9E34B] transition-all duration-500 rounded-full"
                style={{ width: `${totalPotentialPoints > 0 ? (earnedPointsToday / totalPotentialPoints) * 100 : 0}%`, boxShadow: '0 0 6px #12B886dd' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mt-2 select-none">
              <span className="hidden sm:inline">{totalPotentialPoints - earnedPointsToday} left</span>
              <span className="border border-[#12B886]/40 bg-[#12B886]/10 text-[#12B886] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                Lv. {Math.floor(userPoints / 100) + 1}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: MOMENTUM */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-36 sm:h-40 md:h-44 relative overflow-hidden group hover:border-red-500/30 hover:shadow-[0_0_25px_rgba(250,82,82,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#FA5252]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 tracking-wider select-none">
              <span>MOMENTUM</span>
              <span className="text-[10px] text-gray-400 hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 sm:mt-2 text-base sm:text-lg md:text-2xl font-extrabold text-[#FA5252] font-sans tracking-tight truncate filter drop-shadow-[0_0_6px_rgba(250,82,82,0.2)]">
              {momentumScore >= 90 ? 'Ultra Focus' : momentumScore >= 75 ? 'Flow State' : momentumScore >= 45 ? 'Ignition' : 'Inertia'}
            </div>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5 font-semibold truncate hidden sm:block">
              {momentumScore >= 45 ? 'Momentum active.' : 'Decay detected.'}
            </p>
          </div>

          <div className="flex items-center justify-between select-none relative z-10 mt-2">
            <span className="text-[11px] font-mono font-bold text-gray-300">
              {momentumScore}%
            </span>
            <svg className="w-12 sm:w-20 h-6 overflow-visible shrink-0" viewBox="0 0 100 40">
              <path
                d="M 0 32 Q 25 18, 50 25 T 85 14 T 100 4"
                fill="none"
                stroke={momentumScore >= 45 ? '#12B886' : '#FCC419'}
                strokeWidth="3"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${momentumScore >= 45 ? 'rgba(18,184,134,0.5)' : 'rgba(252,196,25,0.5)'})` }}
                className="transition-all duration-300"
              />
              <circle
                cx="100"
                cy="4"
                r="4"
                fill={momentumScore >= 45 ? '#12B886' : '#FCC419'}
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: 1% BETTER COMP_INDEX */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-36 sm:h-40 md:h-44 relative overflow-hidden group hover:border-[#FCC419]/40 hover:shadow-[0_0_25px_rgba(252,196,25,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#FCC419]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 tracking-wider select-none">
              <span>COMP INDEX</span>
              <span className="text-[10px] text-gray-400 hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 sm:mt-2 text-xl sm:text-2xl md:text-3xl font-extrabold text-[#FCC419] font-sans tracking-tight filter drop-shadow-[0_0_6px_rgba(252,196,25,0.2)]">
              +{activeGrowthValue.toFixed(1)}%
            </div>
          </div>

          <div className="flex items-end justify-between select-none relative z-10 mt-2 text-left">
            <div className="flex flex-col w-full">
              <div className="w-full h-1 bg-[#171924] rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-[#FCC419] transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (activeGrowthValue / 30) * 100)}%`, boxShadow: '0 0 6px #FCC419dd' }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-400 truncate">
                Streak: <span className="text-[#FCC419] font-mono">{betterStreak}d</span>
              </span>
            </div>
            <button 
              onClick={() => setTab('1%better')}
              className="text-[9px] font-mono font-bold bg-[#12141C] border border-[#232734] text-gray-300 px-2 py-1 rounded ml-2 cursor-pointer hover:bg-gray-800 hover:text-[#FCC419] hover:border-[#FCC419]/40 transition duration-350 shadow-sm hidden xs:block"
            >
              MAP
            </button>
          </div>
        </div>

      </div>

      {/* 3. Quick Habit Logger with points rewarding system */}
      <div id="quick-habit-logger-section" className="bg-[#14161F]/90 border border-[#232734]/80 p-6 rounded-2xl shadow-lg relative overflow-hidden group/logger duration-300 transition-all hover:border-[#12B886]/20 hover:shadow-[0_0_35px_rgba(18,184,134,0.03)]">
        {/* Dynamic backdrop glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 relative z-10">
          <div className="text-left">
            <h3 className="text-lg font-bold text-white font-sans flex items-center">
              <CheckCircle2 className="w-5 h-5 text-[#12B886] mr-2 animate-pulse" />
              Quick Habit Logger
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Log progress increment values directly from this helper dashboard list.
            </p>
          </div>
          <span className="text-xs text-gray-405 font-mono tracking-widest font-semibold bg-[#1D212F] px-3 py-1 rounded-lg border border-[#2C3246]/50">
            ⚡ 1-TAP CHECKLIST
          </span>
        </div>

        {(() => {
          const allCount = habits.length;
          const morningCount = habits.filter(h => getHabitTimeframe(h, routines) === 'Morning').length;
          const eveningCount = habits.filter(h => getHabitTimeframe(h, routines) === 'Evening').length;
          const nightCount = habits.filter(h => getHabitTimeframe(h, routines) === 'Night').length;

          const displayedHabits = habits.filter(item => {
            if (focusRoutineId) {
              const activeRt = routines.find(r => r.id === focusRoutineId);
              if (activeRt && !activeRt.habitIds.includes(item.id)) return false;
            }
            if (timeframeFilter === 'All') return true;
            return getHabitTimeframe(item, routines) === timeframeFilter;
          });

          const focusActiveRoutine = focusRoutineId ? routines.find(r => r.id === focusRoutineId) : null;
          let focusRoutineProgress = 0;
          let focusRoutineDoneCount = 0;
          let focusRoutineTotalCount = 0;
          if (focusActiveRoutine) {
            const rHabits = habits.filter(h => focusActiveRoutine.habitIds.includes(h.id));
            focusRoutineTotalCount = rHabits.length;
            focusRoutineDoneCount = rHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
            focusRoutineProgress = focusRoutineTotalCount > 0 ? Math.min(100, Math.round((focusRoutineDoneCount / focusRoutineTotalCount) * 100)) : 0;
          }

          const getCategoryConfigLocal = (category: Category) => {
            switch (category) {
              case 'Fitness':
                return { color: '#12B886', icon: Dumbbell };
              case 'Reading':
                return { color: '#FD7E14', icon: BookOpen };
              case 'Productivity':
                return { color: '#FCC419', icon: Zap };
              case 'Health':
                return { color: '#228BE6', icon: Brain };
              case 'Mindfulness':
                return { color: '#845EF7', icon: Brain };
              case 'Study':
                return { color: '#20C997', icon: Sparkles };
              case 'Social':
                return { color: '#B54708', icon: Navigation };
              default:
                return { color: '#868E96', icon: Sparkles };
            }
          };

          return (
            <div className="space-y-6">
              {/* Filter Tabs Row */}
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-4">
                {[
                  { value: 'All', label: 'All habits', count: allCount, icon: '', activeColor: 'bg-[#12B886]/10 text-[#12B886] border-[#12B886]/20' },
                  { value: 'Morning', label: 'Morning', count: morningCount, icon: '☀️', activeColor: 'bg-[#FCC419]/10 text-[#FCC419] border-[#FCC419]/30' },
                  { value: 'Evening', label: 'Evening', count: eveningCount, icon: '🌆', activeColor: 'bg-[#FD7E14]/10 text-[#FD7E14] border-[#FD7E14]/30' },
                  { value: 'Night', label: 'Night', count: nightCount, icon: '🌙', activeColor: 'bg-[#845EF7]/10 text-[#845EF7] border-[#845EF7]/30' },
                ].map((tab) => {
                  const isActive = timeframeFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setTimeframeFilter(tab.value as any)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition select-none ${
                        isActive
                          ? 'border ' + tab.activeColor
                          : 'bg-[#12141C] border border-[#232734] text-gray-400 hover:text-white hover:bg-[#1E212E]'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {tab.icon && <span>{tab.icon}</span>}
                        <span>{tab.label}</span>
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold bg-[#1A1D28] text-gray-500 border border-gray-800">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Timeblock Routines Section inside the Logger Card */}
              {(() => {
                const timeframeRoutines = routines.filter(r => {
                  if (timeframeFilter === 'All') return true;
                  return r.timeBlock === timeframeFilter;
                });

                if (timeframeRoutines.length === 0) return null;

                return (
                  <div className="bg-[#12141C]/30 border border-gray-800/60 rounded-xl p-4 space-y-2.5 text-left">
                    <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-semibold flex items-center">
                      <Navigation className="w-3.5 h-3.5 mr-1" />
                      {timeframeFilter === 'All' ? 'Routine Filters' : `Active ${timeframeFilter} block routines`}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {timeframeRoutines.map(rt => {
                        const rHabits = habits.filter(h => rt.habitIds.includes(h.id));
                        const doneCount = rHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
                        const totalCount = rHabits.length;
                        const progress = totalCount > 0 ? Math.min(100, Math.round((doneCount / totalCount) * 100)) : 0;
                        const isFocused = focusRoutineId === rt.id;

                        return (
                          <div
                            key={rt.id}
                            onClick={() => setFocusRoutineId(isFocused ? null : rt.id)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition select-none ${
                              isFocused
                                ? 'bg-[#1E1B29] border-purple-500/40'
                                : 'bg-[#12141C] border-[#232734] hover:border-[#303548]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white block truncate">
                                🔄 {rt.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-purple-400">
                                {progress}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full bg-purple-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            <div className="text-[10px] text-gray-500 mt-2 flex items-center justify-between font-mono">
                              <span>{doneCount} / {totalCount} completed</span>
                              {isFocused && (
                                <span className="text-purple-400 font-semibold text-[9px] uppercase tracking-wider">Active Filter</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Routines Shortcut Pills Row */}
              <div className="flex flex-wrap items-center gap-2 text-left select-none">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold mr-2">
                  ROUTINES:
                </span>
                <button
                  onClick={() => setFocusRoutineId(null)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                    focusRoutineId === null
                      ? 'bg-[#845EF7]/10 border border-[#845EF7]/30 text-[#845EF7]'
                      : 'bg-[#12141C] border border-[#232734] text-gray-400 hover:text-white'
                  }`}
                >
                  All habits
                </button>
                {routines.map((rt) => {
                  const isActive = focusRoutineId === rt.id;
                  const rHabits = habits.filter(h => rt.habitIds.includes(h.id));
                  const doneCount = rHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
                  const totalCount = rHabits.length;
                  const p = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                  return (
                    <button
                      key={rt.id}
                      onClick={() => {
                        setFocusRoutineId(rt.id);
                        setTimeframeFilter('All');
                      }}
                      className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                        isActive
                          ? 'bg-[#845EF7]/10 border border-[#845EF7]/30 text-[#845EF7]'
                          : 'bg-[#12141C] border border-[#232734] text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>{rt.name}</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-[#845EF7]/20 text-[#845EF7]">
                        {p}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {focusActiveRoutine && (
                <div className="bg-purple-950/10 border border-purple-900/30 rounded-xl p-4 relative text-left animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 pl-1 flex-1">
                    <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10 uppercase tracking-widest font-semibold">
                      Routine Active
                    </span>
                    <h4 className="text-sm font-bold text-white font-sans mt-1">
                      {focusActiveRoutine.name}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans max-w-lg">
                      Complete all routine habits to earn <strong className="text-purple-400">+{focusActiveRoutine.points} XP</strong> completion bonus!
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 pr-1 shrink-0 justify-between sm:justify-end">
                    <div className="text-left sm:text-right font-sans">
                      <span className="text-[10px] text-gray-500 block font-semibold">Progress</span>
                      <span className="text-xs font-bold text-white font-mono">{focusRoutineDoneCount} / {focusRoutineTotalCount} done</span>
                    </div>
                    <button
                      onClick={() => setFocusRoutineId(null)}
                      className="px-2.5 py-1.5 bg-[#1C1F2E] hover:bg-[#252A40] border border-gray-800 rounded-lg text-xs font-mono font-bold text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Stacked wide strips (Habit Listing) */}
              <div className="flex flex-col space-y-3 animate-fade-in">
                {displayedHabits.length > 0 ? (
                  (() => {
                    const habitsToRender = showAllQuickHabits ? displayedHabits : displayedHabits.slice(0, 5);
                    return (
                      <>
                        {habitsToRender.map((item) => {
                          const progressVal = item.history[dateToday] || 0;
                          const percentage = Math.min(100, Math.round((progressVal / item.target) * 100));
                          const isCompleted = progressVal >= item.target;
                          const remaining = Math.max(0, item.target - progressVal);
                          const config = getCategoryConfigLocal(item.category);
                          const IconComp = config.icon;

                          return (
                            <div
                              key={item.id}
                              style={{ 
                                '--hover-glow': `${config.color}15`,
                                '--card-border': `${config.color}35`
                              } as React.CSSProperties}
                              className="relative bg-[#12141C]/90 hover:bg-[#151722] border border-[#232734]/50 hover:border-[var(--card-border)] rounded-[20px] transition-all duration-300 flex flex-col md:flex-row md:items-center p-4 pl-7 pr-5 gap-4 overflow-hidden group shadow-sm hover:shadow-[0_0_20px_var(--hover-glow)]"
                            >
                              {/* Ambient gradient left-side fade */}
                              <div 
                                className="absolute inset-0 pointer-events-none transition-all duration-300 opacity-60 group-hover:opacity-100"
                                style={{
                                  background: `radial-gradient(ellipse 240px 140px at 0% 50%, ${config.color}14, transparent)`
                                }}
                              />

                              {/* Left side accent vertical line */}
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[20px]" style={{ backgroundColor: config.color }} />

                              {/* Left part: icon, details */}
                              <div className="flex items-center space-x-4 w-full md:w-auto relative z-10 text-left">
                                <div 
                                  className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 shadow-[0_0_12px_rgba(0,0,0,0.2)]"
                                  style={{ 
                                    backgroundColor: `${config.color}15`, 
                                    borderColor: `${config.color}25`,
                                    color: config.color,
                                    boxShadow: `0 0 12px ${config.color}18`
                                  }}
                                >
                                  <IconComp className="w-5 h-5" />
                                </div>
                                <div className="space-y-1 text-left max-w-sm flex-1">
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <h4 className="text-base font-bold text-white font-sans tracking-tight">
                                      {item.name}
                                    </h4>
                                    <span className="text-[10px] font-mono font-bold tracking-wider text-gray-500 border border-gray-800/80 rounded px-1.5 py-0.5 uppercase">
                                      {item.repeat || 'DAILY'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-gray-500 text-xs flex-wrap">
                                    <span style={{ color: config.color }} className="font-semibold">
                                      {item.category}
                                    </span>
                                    <span className="text-gray-700">&bull;</span>
                                    <span>{item.timeOfDay || 'Anytime'}</span>
                                    <span className="text-gray-700">&bull;</span>
                                    <span className="flex items-center text-[#FCC419] font-semibold">
                                      <Zap className="w-3.5 h-3.5 mr-0.5 fill-[#FCC419]" />
                                      {item.points} pts
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Mid part: Progress bar */}
                              <div className="flex-1 max-w-md w-full md:mx-6 space-y-1.5 text-left relative z-10">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span style={{ color: config.color }} className="font-bold">
                                    {progressVal} / {item.target} <span className="text-[10px] text-gray-500 font-normal">{item.unit}</span>
                                  </span>
                                  <span className="text-gray-400 font-mono font-bold">{percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-[#171924] rounded-full overflow-hidden block border border-gray-800/40 shadow-inner">
                                  <div
                                    className="h-full transition-all duration-500 rounded-full"
                                    style={{ 
                                      width: `${percentage}%`, 
                                      backgroundColor: config.color,
                                      boxShadow: `0 0 12px ${config.color}, 0 0 4px ${config.color}`
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Right part: Complete status / buttons */}
                              <div className="flex items-center space-x-3 shrink-0 justify-between md:justify-end w-full md:w-auto relative z-10 border-t border-gray-800/40 pt-3 md:pt-0 md:border-0">
                                <div className="flex items-center space-x-2 w-full md:w-auto">
                                  <button
                                    onClick={() => handleQuickLog(item.id, Math.ceil(item.target / 3))}
                                    className="flex-1 md:flex-none px-4 py-3 min-h-[44px] flex items-center justify-center bg-[#12141C] hover:bg-[#1E212E] border border-[#232734] rounded-xl text-xs font-mono font-bold text-gray-400 hover:text-white transition cursor-pointer select-none active:scale-95"
                                  >
                                    +{Math.ceil(item.target / 3)}
                                  </button>
                                  <button
                                    onClick={() => handleQuickLog(item.id, 1)}
                                    className="flex-1 md:flex-none px-4 py-3 min-h-[44px] flex items-center justify-center bg-[#12141C] hover:bg-[#1E212E] border border-[#232734] rounded-xl text-xs font-mono font-bold text-gray-400 hover:text-white transition cursor-pointer select-none active:scale-95"
                                  >
                                    +1
                                  </button>
                                </div>

                                {isCompleted ? (
                                  <div className="text-black h-11 w-11 rounded-full flex items-center justify-center shadow-lg cursor-default shrink-0 bg-[#12B886] transition-all duration-300 animate-pulse" style={{ filter: 'drop-shadow(0 0 6px rgba(18, 184, 134, 0.65))' }}>
                                    <Check className="w-5 h-5 stroke-[3px]" />
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleQuickLog(item.id, remaining)}
                                    className="h-11 w-11 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0 group/circle active:scale-95"
                                    style={{
                                      borderColor: '#202434',
                                      backgroundColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = config.color;
                                      e.currentTarget.style.backgroundColor = `${config.color}15`;
                                      e.currentTarget.style.boxShadow = `0 0 10px ${config.color}35`;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = '#202434';
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    <Check className="w-5 h-5 stroke-[3px] opacity-0 group-hover/circle:opacity-100 transition-all duration-200" style={{ color: config.color }} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {displayedHabits.length > 5 && (
                          <div className="flex justify-center pt-1">
                            <button
                              onClick={() => setShowAllQuickHabits(!showAllQuickHabits)}
                              className="px-4 py-2 bg-[#12141C] hover:bg-[#1E212E] text-xs font-semibold text-gray-400 hover:text-white rounded-lg border border-gray-800 hover:border-gray-700 transition cursor-pointer"
                            >
                              {showAllQuickHabits ? 'Show less' : `Show all active habits (${displayedHabits.length})`}
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div className="bg-[#12141C]/50 border border-dashed border-gray-800 rounded-xl py-12 text-center">
                    <CheckCircle2 className="w-8 h-8 text-[#12B886] mx-auto mb-2 animate-pulse" />
                    <h4 className="text-sm font-bold text-gray-300">All habits cleared!</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      No active items remaining for {timeframeFilter === 'All' ? 'today' : `${timeframeFilter.toLowerCase()} block`}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4. Secondary Features: Category Progress and Active Routines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Progress Widget */}
        <div className="bg-[#14161F]/90 border border-[#232734]/80 rounded-2xl p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider text-gray-500">CATEGORIES BREAKDOWN</span>
              <span className="text-lg font-bold text-white font-mono">
                {overallCategoryAvg}%
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 text-left">Category Progress</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {activeCategories.length} active {activeCategories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>

          <div className="my-6">
            {categoryProgressList.length > 0 ? (
              <div className={`grid gap-3 md:gap-4 ${
                categoryProgressList.length <= 3
                  ? 'grid-cols-3'
                  : categoryProgressList.length <= 4
                    ? 'grid-cols-2 sm:grid-cols-4'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}>
                {categoryProgressList.map((item) => (
                  <div key={item.name} className="flex flex-col items-center">
                    <div
                      onClick={() => setSelectedCategoryId(item.name)}
                      className="w-full h-20 md:h-24 bg-gray-900 rounded-lg relative overflow-hidden flex items-end cursor-pointer hover:bg-[#1A1C27] border border-gray-800 transition"
                    >
                      <div
                        className="w-full rounded-t transition-all duration-500"
                        style={{ height: `${item.progress}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-300 mt-2 text-center">{item.name}</span>
                    <span className="text-[10px] font-mono text-gray-500 mt-0.5">{item.progress}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">
                No habits yet. Create habits to see category progress.
              </div>
            )}
          </div>

          <div className="flex items-start space-x-2 bg-gray-950/20 border border-gray-800/40 rounded-xl p-3 text-left">
            <AlertTriangle className="w-4 h-4 text-[#FCC419] shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
              Unlock maximum focus points by balancing your daily category habits equitably.
            </p>
          </div>
        </div>

        {/* Routines Card List Widget */}
        <div className="bg-[#14161F]/90 border border-[#232734]/80 rounded-2xl p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Navigation className="w-4.5 h-4.5 text-purple-400 mr-1.5" />
                Active Routines
              </h3>
              <span className="text-xs text-[#12B886] font-semibold hover:underline cursor-pointer" onClick={() => setTab('habits')}>
                Manage &rarr;
              </span>
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {routines.map((rt) => {
                const routineHabits = habits.filter(h => rt.habitIds.includes(h.id));
                const completedInRt = routineHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
                const totalInRt = routineHabits.length;
                const progress = totalInRt > 0 ? Math.round((completedInRt / totalInRt) * 100) : 0;

                return (
                  <div
                    key={rt.id}
                    onClick={() => {
                      setFocusRoutineId(rt.id);
                      setTimeframeFilter('All');
                      const loggerSec = document.getElementById('quick-habit-logger-section');
                      if (loggerSec) {
                        loggerSec.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="bg-[#10121A] hover:bg-[#1E212E] border border-gray-800 p-3.5 rounded-xl cursor-pointer transition flex items-center justify-between group shadow"
                  >
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#12B886] transition">
                        🔄 {rt.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                        {completedInRt}/{totalInRt} habits done &bull; {rt.timeBlock}
                      </p>
                    </div>
                    <div className="text-right font-sans">
                      <span className="text-xs font-bold text-purple-400 font-mono">{progress}%</span>
                      <p className="text-[9px] font-mono text-gray-500 mt-0.5">+{rt.points} pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-gray-550 text-left font-semibold">
            Complete daily bundles together to earn bonus XP on whole routines.
          </div>
        </div>

      </div>

    </div>
  );
}
