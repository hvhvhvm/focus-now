import React, { useState } from 'react';
import { Zap, AlertTriangle, ArrowUpRight, TrendingUp, Dumbbell, BookOpen, Brain, Sparkles, CheckCircle2, Navigation, Clock, Check, ChevronRight, X } from 'lucide-react';
import { Habit, Category, Routine } from '../types';
import { calculateMomentum, dateToday } from '../data';
import CategoryDetailView from './CategoryDetailView';

type LogHabitHandler = (id: string, value: number) => void | Promise<void>;

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

const getQuickHabitConfig = (category: Category) => {
  switch (category) {
    case 'Fitness': return { color: '#12B886', icon: Dumbbell };
    case 'Reading': return { color: '#FD7E14', icon: BookOpen };
    case 'Productivity': return { color: '#FCC419', icon: Zap };
    case 'Health': return { color: '#228BE6', icon: Brain };
    case 'Mindfulness': return { color: '#845EF7', icon: Brain };
    case 'Study': return { color: '#20C997', icon: Sparkles };
    case 'Social': return { color: '#B54708', icon: Navigation };
    default: return { color: '#868E96', icon: Sparkles };
  }
};

interface QuickRoutineSheetProps {
  routine: Routine | null;
  habits: Habit[];
  onClose: () => void;
  onLogHabit: LogHabitHandler;
}

function QuickRoutineSheet({ routine, habits, onClose, onLogHabit }: QuickRoutineSheetProps) {
  const [isCompletingAll, setIsCompletingAll] = useState(false);

  React.useEffect(() => {
    if (!routine) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [routine, onClose]);

  if (!routine) return null;

  const completedCount = habits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleCompleteHabit = (habit: Habit) => {
    const current = habit.history[dateToday] || 0;
    const remaining = Math.max(0, habit.target - current);
    if (remaining <= 0) return;

    onLogHabit(habit.id, remaining);
  };

  const handleCompleteAll = async () => {
    if (isCompletingAll || allDone) return;

    setIsCompletingAll(true);
    try {
      for (const habit of habits) {
        const current = habit.history[dateToday] || 0;
        const remaining = Math.max(0, habit.target - current);
        if (remaining > 0) {
          await Promise.resolve(onLogHabit(habit.id, remaining));
        }
      }
    } finally {
      setIsCompletingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="quick-routine-sheet-title">
      <button
        type="button"
        aria-label="Close routine"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm cursor-default routine-sheet-backdrop"
      />

      <section className="routine-sheet-panel relative z-10 w-full max-w-[560px] max-h-[86vh] overflow-y-auto bg-[#10121A] border border-[#2B3040] border-b-0 rounded-t-[24px] shadow-[0_-22px_70px_rgba(0,0,0,0.55)] pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
        <div className="sticky top-0 z-20 bg-[#10121A]/95 backdrop-blur-xl border-b border-[#202434] rounded-t-[24px]">
          <div className="flex justify-center py-3">
            <div className="h-1 w-11 rounded-full bg-[#343B50]" />
          </div>

          <div className="px-4 md:px-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                    <Navigation className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 id="quick-routine-sheet-title" className="text-lg font-extrabold text-white truncate">
                      {routine.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest">
                      <span className="text-purple-300">{routine.timeBlock}</span>
                      <span className="text-gray-700">/</span>
                      <span className="inline-flex items-center gap-1 text-[#FCC419]">
                        <Zap className="h-3 w-3 fill-[#FCC419]" />
                        {routine.points} XP
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 shrink-0 rounded-full border border-[#2B3040] bg-[#181B25] text-gray-400 hover:text-white hover:bg-[#202434] transition flex items-center justify-center"
                aria-label="Close routine sheet"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-[#252B3A] bg-[#151822] p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-gray-400">Overall Progress</span>
                <span className={allDone ? 'text-[#12B886]' : 'text-purple-300'}>
                  {completedCount}/{totalCount} done
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#0D0F17] border border-[#242938] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1.5 text-right text-[10px] font-mono text-gray-500">{progress}%</div>
            </div>

            <button
              type="button"
              onClick={handleCompleteAll}
              disabled={allDone || isCompletingAll || totalCount === 0}
              className="mt-3 w-full min-h-[46px] rounded-xl border border-[#12B886]/25 bg-[#12B886]/12 text-[#12B886] hover:bg-[#12B886]/20 disabled:bg-[#151822] disabled:text-gray-600 disabled:border-[#252B3A] font-extrabold text-sm transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>{allDone ? 'Routine Complete' : isCompletingAll ? 'Completing...' : '1-TAP Complete All'}</span>
            </button>
          </div>
        </div>

        <div className="px-4 md:px-5 pt-3 space-y-2.5">
          {habits.map((habit) => {
            const current = habit.history[dateToday] || 0;
            const percentage = Math.min(100, Math.round((current / habit.target) * 100));
            const isCompleted = current >= habit.target;
            const config = getQuickHabitConfig(habit.category);
            const Icon = config.icon;

            return (
              <div
                key={habit.id}
                className={`relative overflow-hidden rounded-2xl border bg-[#141720] p-3.5 transition ${
                  isCompleted ? 'border-[#12B886]/20 opacity-75' : 'border-[#252B3A]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 shrink-0 rounded-full border flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}14`, borderColor: `${config.color}28`, color: config.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate text-[15px] font-bold text-white">{habit.name}</h4>
                      {isCompleted && (
                        <span className="shrink-0 rounded border border-[#12B886]/20 bg-[#12B886]/10 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-[#12B886]">
                          Done
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold">
                      <span style={{ color: config.color }}>{habit.category}</span>
                      <span className="text-gray-700">/</span>
                      <span className="text-[#FCC419]">{habit.routineId ? 0 : habit.points} pts</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteHabit(habit)}
                    disabled={isCompleted}
                    aria-label={isCompleted ? `${habit.name} complete` : `Complete ${habit.name}`}
                    className={`h-10 w-10 shrink-0 rounded-full border-2 transition flex items-center justify-center active:scale-95 ${
                      isCompleted
                        ? 'border-[#12B886] bg-[#12B886] text-black'
                        : 'border-[#30364A] bg-transparent hover:border-[#12B886] hover:bg-[#12B886]/10'
                    }`}
                  >
                    {isCompleted && <Check className="h-4.5 w-4.5 stroke-[3px]" />}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-[#242938] bg-[#0D0F17]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[10px] font-mono text-gray-500">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

interface DashboardProps {
  habits: Habit[];
  routines: Routine[];
  userPoints: number;
  onLogHabit: LogHabitHandler;
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

  const totalPotentialPoints =
    habits.reduce((acc, curr) => acc + (curr.routineId ? 0 : curr.points), 0) +
    routines.reduce((acc, curr) => acc + curr.points, 0);

  const earnedPointsToday =
    habits.reduce((acc, curr) => {
      if (curr.routineId) return acc;
      const todayLog = curr.history[dateToday] || 0;
      const progressDonePercent = Math.min(1.0, todayLog / curr.target);
      return acc + Math.round(progressDonePercent * curr.points);
    }, 0) +
    routines.reduce((acc, curr) => {
      const completed = curr.completedHistory?.[dateToday] || false;
      return acc + (completed ? curr.points : 0);
    }, 0);

  const [quickVals, setQuickVals] = useState<{ [key: string]: string }>({});
  const [timeframeFilter, setTimeframeFilter] = useState<'All' | 'Morning' | 'Evening' | 'Night'>('All');
  const [selectedRoutineSheetId, setSelectedRoutineSheetId] = useState<string | null>(null);

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
    <div className="space-y-5 md:space-y-8 max-w-5xl mx-auto">
      {/* 1a. Mobile-only compact header */}
      <header className="md:hidden flex items-center justify-between py-2 border-b border-[#1A1D24]">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4.5 h-4.5 text-[#FCC419] animate-spin-slow shrink-0" />
          <h1 className="text-lg font-extrabold tracking-tight text-white font-sans">
            Habits
          </h1>
          <span className="text-xs font-mono text-gray-500">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#12B886]/10 border border-[#12B886]/25 rounded-full px-3 py-1.5">
            <div className="relative w-5 h-5 shrink-0">
              <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" className="stroke-gray-800" strokeWidth="2.5" fill="transparent" />
                <circle
                  cx="10" cy="10" r="8"
                  stroke="#12B886" strokeWidth="2.5" fill="transparent"
                  strokeDasharray={2 * Math.PI * 8}
                  strokeDashoffset={2 * Math.PI * 8 * (1 - overallTodayProgress / 100)}
                  style={{ filter: 'drop-shadow(0 0 3px rgba(18,184,134,0.6))' }}
                />
              </svg>
            </div>
            <span className="text-sm font-mono font-bold text-[#12B886]">{overallTodayProgress}%</span>
            <span className="text-xs text-gray-400 font-semibold">{doneTodayCount}/{totalTodayCount}</span>
          </div>
          <button
            onClick={() => setTab('habits')}
            className="flex items-center gap-1.5 bg-[#12141C] border border-[#272B36] rounded-lg px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer"
          >
            <span>Habits</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 1b. Desktop-only full header */}
      <header className="hidden md:flex flex-row items-center justify-between pb-6 border-b border-[#1A1D24] gap-6">
        <div>
          <span className="font-mono text-xs text-[#12B886] uppercase tracking-widest font-semibold flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-[#FCC419] animate-spin-slow" />
            Productivity Identity System
          </span>
          <h1 className="text-5xl font-extrabold tracking-tighter text-white font-sans mt-1">
            Habits
          </h1>
          <p className="text-sm text-gray-400 font-sans mt-1 text-left">
            Build momentum, one rep at a time.
          </p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex bg-[#14161F]/95 border border-[#232734] rounded-2xl p-4 items-center space-x-4 max-w-xs shadow-md relative overflow-hidden group/header-gauge hover:border-[#12B886]/30 hover:shadow-[0_0_20px_rgba(18,184,134,0.12)] transition-all duration-350">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#12B886]/5 to-transparent opacity-0 group-hover/header-gauge:opacity-100 transition-opacity duration-350 pointer-events-none" />
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="23" className="stroke-gray-800" strokeWidth="3.5" fill="transparent" />
                <circle
                  cx="28" cy="28" r="23"
                  className="stroke-[#12B886] transition-all duration-500"
                  strokeWidth="3.5" fill="transparent"
                  strokeDasharray={2 * Math.PI * 23}
                  strokeDashoffset={2 * Math.PI * 23 * (1 - overallTodayProgress / 100)}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(18, 184, 134, 0.5))' }}
                />
              </svg>
              <div className="text-xs font-mono font-bold text-white pr-0.5 relative z-10">{overallTodayProgress}%</div>
            </div>
            <div className="text-left relative z-10">
              <h4 className="text-sm font-bold font-sans text-white">{doneTodayCount}/{totalTodayCount} done today</h4>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center">
                <Zap className="w-3 h-3 text-[#FCC419] mr-0.5 fill-[#FCC419] animate-pulse" />
                {earnedPointsToday}/{totalPotentialPoints} pts today
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab('habits')}
            className="flex items-center space-x-1 border border-[#272B36] bg-[#12141C] hover:bg-[#1E212E] hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] select-none"
          >
            <span>My Habits</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Active category pills — hidden on mobile to save vertical space */}
      {activeCategories.length > 0 && (
        <div className="hidden md:flex flex-wrap items-center gap-2 md:gap-3">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-6">
        
        {/* Card 1: PROGRESS TODAY */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-3.5 md:p-2.5 flex flex-col justify-between h-28 sm:h-22 relative overflow-hidden group hover:border-[#12B886]/40 hover:shadow-[0_0_25px_rgba(18,184,134,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#12B886]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center text-[11px] md:text-[9px] font-mono text-gray-500 tracking-wider select-none">
              PROGRESS TODAY
              <span className="text-[9px] ml-1 text-gray-400 cursor-pointer hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 text-2xl sm:text-xl font-extrabold text-[#12B886] font-sans tracking-tight">
              {overallTodayProgress}%
            </div>
          </div>

          <div className="relative z-10 text-left">
            <div className="w-full h-1.5 md:h-1 bg-[#171924] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-[#12B886] transition-all duration-500 rounded-full"
                style={{ width: `${overallTodayProgress}%`, boxShadow: '0 0 6px #12B886dd' }}
              />
            </div>
            <div className="flex items-center justify-between text-xs md:text-[10px] font-semibold text-gray-400 mt-1.5 select-none">
              <span>{doneTodayCount}/{totalTodayCount} done</span>
            </div>
          </div>
        </div>

        {/* Card 2: POINTS TODAY */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-3.5 md:p-2.5 flex flex-col justify-between h-28 sm:h-22 relative overflow-hidden group hover:border-[#12B886]/40 hover:shadow-[0_0_25px_rgba(18,184,134,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#12B886]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center text-[11px] md:text-[9px] font-mono text-gray-500 tracking-wider select-none">
              POINTS TODAY
              <span className="text-[9px] ml-1 text-gray-400 cursor-pointer hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 text-xl sm:text-lg font-extrabold text-white font-sans tracking-tight truncate">
              {earnedPointsToday} <span className="text-gray-650 font-light text-sm">/</span> <span className="text-gray-400 font-medium text-sm sm:text-sm">{totalPotentialPoints}</span>
            </div>
          </div>

          <div className="relative z-10 text-left">
            <div className="w-full h-1.5 md:h-1 bg-[#171924] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-[#12B886] to-[#A9E34B] transition-all duration-500 rounded-full"
                style={{ width: `${totalPotentialPoints > 0 ? (earnedPointsToday / totalPotentialPoints) * 100 : 0}%`, boxShadow: '0 0 6px #12B886dd' }}
              />
            </div>
            <div className="flex items-center justify-between text-xs md:text-[10px] font-semibold text-gray-400 mt-1.5 select-none">
              <span>{totalPotentialPoints - earnedPointsToday} left</span>
              <span className="border border-[#12B886]/40 bg-[#12B886]/10 text-[#12B886] px-1.5 py-0.5 rounded text-[10px] md:text-[8px] font-mono font-bold">
                Lv. {Math.floor(userPoints / 100) + 1}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: MOMENTUM */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-3.5 md:p-2.5 flex flex-col justify-between h-28 sm:h-22 relative overflow-hidden group hover:border-red-500/30 hover:shadow-[0_0_25px_rgba(250,82,82,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#FA5252]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center justify-between text-[11px] md:text-[9px] font-mono text-gray-500 tracking-wider select-none">
              <span>MOMENTUM</span>
              <span className="text-[9px] text-gray-400 hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 text-sm sm:text-sm font-extrabold text-[#FA5252] font-sans tracking-tight truncate filter drop-shadow-[0_0_6px_rgba(250,82,82,0.2)]">
              {momentumScore >= 90 ? 'Ultra Focus' : momentumScore >= 75 ? 'Flow State' : momentumScore >= 45 ? 'Ignition' : 'Inertia'}
            </div>
          </div>

          <div className="flex items-center justify-between select-none relative z-10 mt-2">
            <span className="text-sm md:text-[10px] font-mono font-bold text-gray-300">
              {momentumScore}%
            </span>
            <svg className="w-16 sm:w-16 h-5 overflow-visible shrink-0" viewBox="0 0 100 40">
              <path
                d="M 0 32 Q 25 18, 50 25 T 85 14 T 100 4"
                fill="none"
                stroke={momentumScore >= 45 ? '#12B886' : '#FCC419'}
                strokeWidth="4"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${momentumScore >= 45 ? 'rgba(18,184,134,0.5)' : 'rgba(252,196,25,0.5)'})` }}
                className="transition-all duration-300"
              />
              <circle
                cx="100"
                cy="4"
                r="5"
                fill={momentumScore >= 45 ? '#12B886' : '#FCC419'}
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: 1% BETTER COMP_INDEX */}
        <div className="bg-[#14161F] border border-[#232734] rounded-2xl p-3.5 md:p-2.5 flex flex-col justify-between h-28 sm:h-22 relative overflow-hidden group hover:border-[#FCC419]/40 hover:shadow-[0_0_25px_rgba(252,196,25,0.12)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#FCC419]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 text-left">
            <div className="flex items-center justify-between text-[11px] md:text-[9px] font-mono text-gray-500 tracking-wider select-none">
              <span>COMP INDEX</span>
              <span className="text-[9px] text-gray-400 hidden sm:inline">ⓘ</span>
            </div>
            <div className="mt-1 text-xl sm:text-lg font-extrabold text-[#FCC419] font-sans tracking-tight filter drop-shadow-[0_0_6px_rgba(252,196,25,0.2)]">
              +{activeGrowthValue.toFixed(1)}%
            </div>
          </div>

          <div className="flex items-end justify-between select-none relative z-10 mt-2 text-left">
            <div className="flex flex-col w-full">
              <div className="w-full h-1.5 md:h-1 bg-[#171924] rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-[#FCC419] transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (activeGrowthValue / 30) * 100)}%`, boxShadow: '0 0 6px #FCC419dd' }}
                />
              </div>
              <span className="text-[11px] md:text-[9px] font-bold text-gray-400 truncate">
                Streak: <span className="text-[#FCC419] font-mono">{betterStreak}d</span>
              </span>
            </div>
            <button 
              onClick={() => setTab('1%better')}
              className="text-[10px] md:text-[8px] font-mono font-bold bg-[#12141C] border border-[#232734] text-gray-300 px-2 py-1 md:px-1.5 md:py-0.5 rounded ml-1.5 cursor-pointer hover:bg-gray-800 hover:text-[#FCC419] hover:border-[#FCC419]/40 transition duration-350 shadow-sm"
            >
              MAP
            </button>
          </div>
        </div>

      </div>

      {/* 3. Quick Habit Logger with points rewarding system */}
      <div id="quick-habit-logger-section" className="bg-[#14161F]/90 border border-[#232734]/80 p-4 md:p-6 rounded-2xl shadow-lg relative overflow-hidden group/logger duration-300 transition-all hover:border-[#12B886]/20 hover:shadow-[0_0_35px_rgba(18,184,134,0.03)]">
        {/* Dynamic backdrop glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        {/* Header: single compact row */}
        <div className="flex items-center justify-between mb-4 md:mb-3 relative z-10">
          <h3 className="text-base md:text-sm font-bold text-white font-sans flex items-center">
            <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4 text-[#12B886] mr-2 md:mr-1.5 animate-pulse" />
            Quick Habit Logger
          </h3>
          <span className="text-xs md:text-[10px] text-gray-400 font-mono tracking-widest font-semibold bg-[#1D212F] px-2.5 py-1 md:px-2 md:py-0.5 rounded border border-[#2C3246]/50">
            ⚡ 1-TAP
          </span>
        </div>

        {(() => {
          // All habits filtered by timeframe
          const allHabits = habits;
          const habitMatchesTimeframe = (h: Habit) =>
            timeframeFilter === 'All' || getHabitTimeframe(h, routines) === timeframeFilter;

          // Counts for filter tabs (across all habits)
          const allCount = allHabits.length;
          const morningCount = allHabits.filter(h => getHabitTimeframe(h, routines) === 'Morning').length;
          const eveningCount = allHabits.filter(h => getHabitTimeframe(h, routines) === 'Evening').length;
          const nightCount = allHabits.filter(h => getHabitTimeframe(h, routines) === 'Night').length;

          // Standalone habits (not in any routine), filtered by timeframe
          const routineHabitIds = new Set(routines.flatMap(rt => rt.habitIds));
          const standaloneHabits = allHabits.filter(h => !routineHabitIds.has(h.id) && !h.routineId && habitMatchesTimeframe(h));
          const selectedRoutine = routines.find(rt => rt.id === selectedRoutineSheetId) || null;
          const selectedRoutineHabits = selectedRoutine
            ? habits.filter(h => selectedRoutine.habitIds.includes(h.id) && habitMatchesTimeframe(h))
            : [];

          const HabitCard = ({ item }: { item: Habit }) => {
            const progressVal = item.history[dateToday] || 0;
            const percentage = Math.min(100, Math.round((progressVal / item.target) * 100));
            const isCompleted = progressVal >= item.target;
            const remaining = Math.max(0, item.target - progressVal);
            const config = getQuickHabitConfig(item.category);
            const IconComp = config.icon;
            return (
              <div
                style={{ '--hover-glow': `${config.color}15`, '--card-border': `${config.color}35` } as React.CSSProperties}
                className="relative bg-[#12141C]/90 hover:bg-[#151722] border border-[#232734]/50 hover:border-[var(--card-border)] rounded-[16px] transition-all duration-300 flex items-center pl-6 pr-3.5 py-3.5 md:py-2.5 gap-3 md:gap-2.5 overflow-hidden group shadow-sm hover:shadow-[0_0_20px_var(--hover-glow)]"
              >
                <div className="absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(ellipse 180px 80px at 0% 50%, ${config.color}12, transparent)` }} />
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[16px]" style={{ backgroundColor: config.color }} />
                {/* Icon */}
                <div className="h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center shrink-0 border relative z-10 group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundColor: `${config.color}15`, borderColor: `${config.color}25`, color: config.color }}>
                  <IconComp className="w-4.5 h-4.5 md:w-3.5 md:h-3.5" />
                </div>
                {/* Name + meta */}
                <div className="flex flex-col min-w-0 shrink-0 w-[95px] xs:w-[115px] md:w-[105px] relative z-10 text-left">
                  <h4 className="text-[15px] md:text-[13px] font-bold text-white font-sans tracking-tight truncate">{item.name}</h4>
                  <div className="flex items-center gap-1.5 md:gap-1 text-[11px] md:text-[9px] text-gray-500 mt-0.5">
                    <span className="font-semibold truncate" style={{ color: config.color }}>{item.category}</span>
                    <span className="text-gray-700">·</span>
                    <span className="flex items-center text-[#FCC419] font-semibold shrink-0">
                      <Zap className="w-2.5 h-2.5 md:w-2 md:h-2 mr-0.5 fill-[#FCC419]" />{item.routineId ? 0 : item.points}pts
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex justify-between items-center text-[11px] md:text-[9px] font-bold mb-1">
                    <span style={{ color: config.color }}>{progressVal}/{item.target} <span className="text-gray-600 font-normal">{item.unit}</span></span>
                    <span className="text-gray-500 font-mono">{percentage}%</span>
                  </div>
                  <div className="w-full h-2 md:h-1.5 bg-[#171924] rounded-full overflow-hidden border border-gray-800/40">
                    <div className="h-full transition-all duration-500 rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}` }} />
                  </div>
                </div>
                {/* Circle complete */}
                <div className="shrink-0 relative z-10">
                  {isCompleted ? (
                    <div className="h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center bg-[#12B886] animate-pulse text-black"
                      style={{ filter: 'drop-shadow(0 0 5px rgba(18,184,134,0.6))' }}>
                      <Check className="w-4.5 h-4.5 md:w-3.5 md:h-3.5 stroke-[3px]" />
                    </div>
                  ) : (
                    <button onClick={() => handleQuickLog(item.id, remaining)}
                      className="h-10 w-10 md:h-8 md:w-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer group/circle active:scale-90"
                      style={{ borderColor: '#202434', backgroundColor: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = config.color; e.currentTarget.style.backgroundColor = `${config.color}15`; e.currentTarget.style.boxShadow = `0 0 8px ${config.color}35`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#202434'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <Check className="w-4.5 h-4.5 md:w-3.5 md:h-3.5 stroke-[3px] opacity-0 group-hover/circle:opacity-100 transition-opacity duration-200" style={{ color: config.color }} />
                    </button>
                  )}
                </div>
              </div>
            );
          };

          const totalVisible =
            routines.reduce((acc, rt) => {
              const filtered = habits.filter(h => rt.habitIds.includes(h.id) && habitMatchesTimeframe(h));
              return acc + filtered.length;
            }, 0) + standaloneHabits.length;

          return (
            <div className="space-y-3">
              {/* ── Filter Tabs ── */}
              <div className="flex items-center gap-2 md:gap-1.5 border-b border-gray-800/60 pb-3.5 md:pb-3 overflow-x-auto scrollbar-none">
                {[
                  { value: 'All', label: 'All', count: allCount, icon: '', activeColor: 'bg-[#12B886]/10 text-[#12B886] border-[#12B886]/20' },
                  { value: 'Morning', label: 'Morning', count: morningCount, icon: '☀️', activeColor: 'bg-[#FCC419]/10 text-[#FCC419] border-[#FCC419]/30' },
                  { value: 'Evening', label: 'Evening', count: eveningCount, icon: '🌆', activeColor: 'bg-[#FD7E14]/10 text-[#FD7E14] border-[#FD7E14]/30' },
                  { value: 'Night', label: 'Night', count: nightCount, icon: '🌙', activeColor: 'bg-[#845EF7]/10 text-[#845EF7] border-[#845EF7]/30' },
                ].map(tab => {
                  const isActive = timeframeFilter === tab.value;
                  return (
                    <button key={tab.value} onClick={() => setTimeframeFilter(tab.value as any)}
                      className={`flex items-center gap-1.5 md:gap-1 px-3.5 py-2 md:px-2.5 md:py-1 rounded-full text-[13px] md:text-[11px] font-semibold cursor-pointer transition select-none shrink-0 ${
                        isActive ? 'border ' + tab.activeColor : 'bg-[#12141C] border border-[#232734] text-gray-400 hover:text-white hover:bg-[#1E212E]'
                      }`}>
                      {tab.icon && <span className="text-[13px] md:text-[11px]">{tab.icon}</span>}
                      <span>{tab.label}</span>
                      <span className="text-[11px] md:text-[9px] font-mono font-extrabold bg-[#1A1D28] text-gray-500 border border-gray-800 px-1.5 md:px-1 rounded">{tab.count}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── Grouped Habit List ── */}
              {totalVisible === 0 ? (
                <div className="bg-[#12141C]/50 border border-dashed border-gray-800 rounded-xl py-10 text-center">
                  <CheckCircle2 className="w-7 h-7 text-[#12B886] mx-auto mb-2 animate-pulse" />
                  <h4 className="text-sm font-bold text-gray-300">All clear!</h4>
                  <p className="text-xs text-gray-500 mt-1">No habits for the {timeframeFilter === 'All' ? 'day' : `${timeframeFilter.toLowerCase()} block`}.</p>
                </div>
              ) : (
                <div className="space-y-3.5 md:space-y-3">
                  {/* Routine sections */}
                  {routines.map(rt => {
                    const rtHabits = habits.filter(h => rt.habitIds.includes(h.id) && habitMatchesTimeframe(h));
                    if (rtHabits.length === 0) return null;

                    const doneCount = rtHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
                    const totalCount = rtHabits.length;
                    const rtProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                    const allDone = totalCount > 0 && doneCount === totalCount;

                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setSelectedRoutineSheetId(rt.id)}
                        aria-label={`Open ${rt.name} routine`}
                        className={`w-full rounded-xl border text-left overflow-hidden bg-[#0F1018] hover:bg-[#151826] transition-all duration-200 cursor-pointer select-none shadow-sm active:scale-[0.99] ${
                          allDone ? 'border-[#12B886]/25' : 'border-[#845EF7]/20 hover:border-[#845EF7]/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 md:gap-2.5 px-3.5 md:px-3 py-3 md:py-2.5">
                          <div className="w-1 h-8 md:h-7 rounded-full bg-[#845EF7] shrink-0" />
                          <div className="h-10 w-10 md:h-8 md:w-8 rounded-full border border-[#845EF7]/20 bg-[#845EF7]/10 text-[#B197FC] flex items-center justify-center shrink-0">
                            <Navigation className="w-4.5 h-4.5 md:w-3.5 md:h-3.5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 md:gap-1.5">
                              <span className="text-[14px] md:text-[12px] font-bold text-white truncate">{rt.name}</span>
                              {rt.timeBlock && (
                                <span className="text-[10px] md:text-[8px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 md:px-1.5 rounded uppercase tracking-wider shrink-0">
                                  {rt.timeBlock}
                                </span>
                              )}
                              {allDone && (
                                <span className="text-[10px] md:text-[8px] font-mono text-[#12B886] bg-[#12B886]/10 border border-[#12B886]/20 px-2 py-0.5 md:px-1.5 rounded uppercase tracking-wider shrink-0">
                                  Done
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 md:gap-1.5 mt-1.5 md:mt-1">
                              <div className="flex-1 h-1.5 md:h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500"
                                  style={{ width: `${rtProgress}%`, boxShadow: '0 0 4px #845EF7' }}
                                />
                              </div>
                              <span className="text-[11px] md:text-[9px] font-mono text-purple-400 shrink-0">{doneCount}/{totalCount}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 md:gap-1.5 shrink-0">
                            <span className="text-[11px] md:text-[9px] font-mono font-bold text-[#FCC419] bg-[#FCC419]/10 border border-[#FCC419]/20 px-2 py-1 md:px-1.5 md:py-0.5 rounded">
                              +{rt.points}XP
                            </span>
                            <ChevronRight className="w-4.5 h-4.5 md:w-3.5 md:h-3.5 text-gray-500" />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Standalone habits (no routine) */}
                  {standaloneHabits.length > 0 && (
                    <div className="space-y-2 md:space-y-1.5">
                      {routines.length > 0 && (
                        <div className="text-[11px] md:text-[9px] font-mono text-gray-600 uppercase tracking-widest font-bold px-1 pt-1.5 md:pt-1">
                          Individual Habits
                        </div>
                      )}
                      {standaloneHabits.map(item => (
                        <React.Fragment key={item.id}>
                          <HabitCard item={item} />
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <QuickRoutineSheet
                routine={selectedRoutine}
                habits={selectedRoutineHabits}
                onClose={() => setSelectedRoutineSheetId(null)}
                onLogHabit={onLogHabit}
              />
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
                      setTimeframeFilter('All');
                      setSelectedRoutineSheetId(rt.id);
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
