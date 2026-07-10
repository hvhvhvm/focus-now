import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Zap, Award, Shield, Flame, Sparkles } from 'lucide-react';
import { Habit, Routine, Category } from '../types';
import { 
  getDailyTaskCounts, 
  getStandaloneHabits, 
  getScheduledHabits, 
  isRoutineScheduledForDate, 
  getRoutineHabits,
  calculateHabitLogPoints,
  formatDateString,
  dateToday
} from '../data';
import { getLevelFloor } from './OnePercentBetterPage';

interface CalendarPageProps {
  habits: Habit[];
  routines: Routine[];
  onLogHabitForDate: (id: string, date: string, value: number) => Promise<void>;
}

export default function CalendarPage({ habits, routines, onLogHabitForDate }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatDateString(new Date()));
  const [loggingProgressId, setLoggingProgressId] = useState<string | null>(null);

  // Local state for start date onboarding
  const [journeyStartDate, setJourneyStartDateState] = useState<string>(() => {
    return localStorage.getItem('habit_mountain_journey_start_date') || '';
  });

  // Onboarding presets state
  const [selectedStartPreset, setSelectedStartPreset] = useState<'classic' | 'today' | 'custom'>('classic');
  const [customStartStr, setCustomStartStr] = useState<string>('2026-05-25');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
  };

  const handleOnboardJourney = () => {
    let dateStr = dateToday;
    if (selectedStartPreset === 'classic') {
      // Create classic date: 6 days ago
      const d = new Date();
      d.setDate(d.getDate() - 6);
      dateStr = formatDateString(d);
    } else if (selectedStartPreset === 'custom') {
      dateStr = customStartStr;
    }
    localStorage.setItem('habit_mountain_journey_start_date', dateStr);
    setJourneyStartDateState(dateStr);
  };

  // Calendar math helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getCategoryEmoji = (category: Category): string => {
    switch (category) {
      case 'Fitness': return '🏃';
      case 'Reading': return '📚';
      case 'Diet': return '🥗';
      case 'Skill': return '🎯';
      case 'Mindset': return '🧘';
      case 'Rest': return '😴';
      default: return '⭐';
    }
  };

  // Generate range of dates YYYY-MM-DD
  const getDatesInRangeList = (startStr: string, endStr: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [endStr];
    }
    const current = new Date(start);
    while (current <= end) {
      dates.push(formatDateString(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Solve 1% Better Chronological solver to get score map for all days
  const getRollingGrowthMap = () => {
    const growthMap: { [dateStr: string]: number } = {};
    if (!journeyStartDate) return growthMap;

    const timelineDates = getDatesInRangeList(journeyStartDate, dateToday);
    let runningGrowth = 0.0;
    let greatStreak = 0;

    timelineDates.forEach((dateStr) => {
      const completedToday = habits.filter(h => {
        const val = h.history[dateStr] || 0;
        return val >= h.target;
      }).length;
      const totalToday = habits.length;
      let pScore = totalToday > 0 ? (completedToday / totalToday) : 1.0;

      // Duplicate mock baseline parameters from Option A to keep values synced
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
        if (greatStreak <= 2) growthEarned = 1.0;
        else if (greatStreak <= 4) growthEarned = 1.2;
        else growthEarned = 1.5;
      } else if (pScore >= 0.4) {
        growthEarned = 0.2;
      } else {
        greatStreak = 0;
        growthEarned = -0.5;
      }

      const prevGrowth = runningGrowth;
      const currentFloor = getLevelFloor(prevGrowth);
      const rawNewGrowth = prevGrowth + growthEarned;
      const finalGrowth = Math.max(currentFloor, rawNewGrowth);
      runningGrowth = Math.round(finalGrowth * 100) / 100;

      growthMap[dateStr] = runningGrowth;
    });

    return growthMap;
  };

  const rollingGrowthMap = getRollingGrowthMap();

  // Compute daily completion rates, day types, and points for a given date
  const getDayMetrics = (dateStr: string) => {
    const counts = getDailyTaskCounts(habits, routines, dateStr);
    const progress = counts.progressPercent;

    // Calculate points
    const hPts = habits.reduce((sum, h) => sum + calculateHabitLogPoints(h, h.history[dateStr] || 0), 0);
    const rPts = routines.reduce((sum, r) => sum + (r.completedHistory?.[dateStr] ? r.points : 0), 0);
    const points = hPts + rPts;

    // Determine Day Type based on 1% Better logic
    let type: 'Great' | 'Neutral' | 'Off' | 'Future' | 'Inactive' = 'Neutral';
    
    const isFuture = dateStr > dateToday;
    const isPreJourney = journeyStartDate && dateStr < journeyStartDate;

    if (isFuture) {
      type = 'Future';
    } else if (isPreJourney) {
      type = 'Inactive';
    } else {
      if (progress >= 80) {
        type = 'Great';
      } else if (progress >= 40) {
        type = 'Neutral';
      } else {
        type = 'Off';
      }
    }

    return {
      progress,
      done: counts.done,
      total: counts.total,
      points,
      type,
      cumulativeGrowth: rollingGrowthMap[dateStr] || 0
    };
  };

  // Generate monthly metrics summary
  const getMonthlySummary = () => {
    let greatCount = 0;
    let neutralCount = 0;
    let offCount = 0;
    let totalPoints = 0;
    let totalProgressSum = 0;
    let trackedDaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = formatDateString(d);
      const metrics = getDayMetrics(dateStr);

      if (metrics.type !== 'Future' && metrics.type !== 'Inactive') {
        trackedDaysCount++;
        totalProgressSum += metrics.progress;
        totalPoints += metrics.points;

        if (metrics.type === 'Great') greatCount++;
        else if (metrics.type === 'Neutral') neutralCount++;
        else if (metrics.type === 'Off') offCount++;
      }
    }

    const averageProgress = trackedDaysCount > 0 ? Math.round(totalProgressSum / trackedDaysCount) : 0;

    return {
      greatCount,
      neutralCount,
      offCount,
      totalPoints,
      averageProgress,
      trackedDaysCount
    };
  };

  const monthlySummary = getMonthlySummary();

  // Grid items construction
  const gridCells = [];

  // 1. Previous month blank fillers
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    gridCells.push({
      dayNum,
      isCurrentMonth: false,
      dateStr: formatDateString(new Date(year, month - 1, dayNum))
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    gridCells.push({
      dayNum: day,
      isCurrentMonth: true,
      dateStr: formatDateString(new Date(year, month, day))
    });
  }

  // 3. Next month fillers to reach a multiple of 7
  const totalCells = Math.ceil(gridCells.length / 7) * 7;
  const nextMonthFillers = totalCells - gridCells.length;
  for (let day = 1; day <= nextMonthFillers; day++) {
    gridCells.push({
      dayNum: day,
      isCurrentMonth: false,
      dateStr: formatDateString(new Date(year, month + 1, day))
    });
  }

  // Parse details for selected date
  const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
  const selectedDayMetrics = getDayMetrics(selectedDateStr);
  const selectedDayLabels = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Scheduled stand-alone habits for selected day
  const standalone = getStandaloneHabits(habits, routines);
  const scheduledStandalone = getScheduledHabits(standalone, selectedDateStr);

  // Scheduled routines for selected day
  const scheduledRoutines = routines.filter(r => isRoutineScheduledForDate(r, selectedDateStr));

  // Retroactive check/uncheck logging handler
  const handleToggleHabit = async (habitId: string, targetVal: number, currentVal: number) => {
    setLoggingProgressId(habitId);
    try {
      if (currentVal >= targetVal) {
        // Uncheck: log negative value to reduce to 0
        await onLogHabitForDate(habitId, selectedDateStr, -currentVal);
      } else {
        // Check: log difference to complete
        await onLogHabitForDate(habitId, selectedDateStr, targetVal - currentVal);
      }
    } finally {
      setLoggingProgressId(null);
    }
  };

  const handleAdjustValue = async (habitId: string, change: number, currentVal: number) => {
    if (currentVal + change < 0) return;
    setLoggingProgressId(habitId);
    try {
      await onLogHabitForDate(habitId, selectedDateStr, change);
    } finally {
      setLoggingProgressId(null);
    }
  };

  // Determine state badge of selected day
  const getSelectedDayTypeBadge = (type: string, growthVal: number) => {
    switch (type) {
      case 'Great':
        return (
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">Great Day</span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">+{growthVal.toFixed(2)}% Growth</span>
          </div>
        );
      case 'Neutral':
        return (
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">Neutral Day</span>
            <span className="bg-amber-500/10 text-amber-550 border border-amber-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">+{growthVal.toFixed(2)}% Growth</span>
          </div>
        );
      case 'Off':
        return (
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-rose-500/10 text-rose-455 border border-rose-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">Off Day</span>
            <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">+{growthVal.toFixed(2)}% Growth</span>
          </div>
        );
      case 'Future':
        return <span className="bg-gray-800 text-gray-400 border border-gray-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">Future Date</span>;
      case 'Inactive':
      default:
        return <span className="bg-[#1C1F2B] text-gray-500 border border-gray-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">Pre-Journey</span>;
    }
  };

  // 4. ONBOARDING SCREEN (If start date is missing)
  if (!journeyStartDate) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left py-4">
        <div className="p-8 bg-gradient-to-br from-teal-950/40 via-[#101917]/25 to-transparent border border-teal-900/30 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 opacity-15 bg-radial from-teal-400 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <span className="text-xs font-mono font-black text-teal-400 uppercase tracking-widest bg-teal-950/60 px-3 py-1 rounded border border-teal-900/40">
              🏔️ MOUNTAIN JOURNAL CALENDAR
            </span>
            <h1 className="text-3xl sm:text-4xl font-black font-sans uppercase tracking-tight text-white mb-2 leading-tight">
              Interactive History Log <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                Unlock Calendar Console
              </span>
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              Your chronological calendar audits daily habit metrics, calculates compound multipliers, and allows retroactively editing logging states. Initialize your start date below to sync your climb.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => setSelectedStartPreset('classic')}
            className={`p-5 rounded-2xl border transition duration-300 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden h-full ${
              selectedStartPreset === 'classic' 
                ? 'bg-teal-950/20 border-teal-450 shadow-[0_0_15px_rgba(20,184,166,0.15)] text-white' 
                : 'bg-[#12141A] border-[#222631] hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-black bg-teal-950/75 text-teal-405 px-2 py-0.5 rounded border border-teal-800/40 uppercase">Option A</span>
                {selectedStartPreset === 'classic' && <span className="text-teal-400 text-xs font-black">✓ SELECT</span>}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight pt-1">Classic Backdate</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Starts 6 days ago. Instantly syncs and analyzes your pre-existing logs over the past week starting from 0%.
              </p>
            </div>
            <span className="text-[10px] font-mono font-black text-teal-400 block pt-4">✨ recommended for test data</span>
          </div>

          <div 
            onClick={() => setSelectedStartPreset('today')}
            className={`p-5 rounded-2xl border transition duration-300 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden h-full ${
              selectedStartPreset === 'today' 
                ? 'bg-teal-950/20 border-teal-450 shadow-[0_0_15px_rgba(20,184,166,0.15)] text-white' 
                : 'bg-[#12141A] border-[#222631] hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-black bg-purple-950/75 text-purple-400 px-2 py-0.5 rounded border border-purple-800/40 uppercase">Option B</span>
                {selectedStartPreset === 'today' && <span className="text-teal-400 text-xs font-black">✓ SELECT</span>}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight pt-1">Start Clean Today</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Initializes on today's date ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}). All compound logs trigger fresh starting today.
              </p>
            </div>
            <span className="text-[10px] font-mono font-black text-purple-450 block pt-4">🟢 fresh start</span>
          </div>

          <div 
            onClick={() => setSelectedStartPreset('custom')}
            className={`p-5 rounded-2xl border transition duration-300 cursor-pointer space-y-3 text-left relative overflow-hidden h-full ${
              selectedStartPreset === 'custom' 
                ? 'bg-teal-950/20 border-teal-450 shadow-[0_0_15px_rgba(20,184,166,0.15)] text-white' 
                : 'bg-[#12141A] border-[#222631] hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-black bg-amber-950/75 text-amber-500 px-2 py-0.5 rounded border border-amber-800/40 uppercase">Option C</span>
                {selectedStartPreset === 'custom' && <span className="text-teal-400 text-xs font-black">✓ SELECT</span>}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight pt-1">Custom Backdate</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Specify a customized starting date to compile logs offline.
              </p>
            </div>
            <div className="pt-1">
              <input 
                type="date"
                max={dateToday}
                value={customStartStr}
                onChange={(e) => {
                  setCustomStartStr(e.target.value);
                  setSelectedStartPreset('custom');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[#1A1D26] text-xs text-white p-2 border border-gray-800 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleOnboardJourney}
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#090D11] hover:text-black font-black uppercase tracking-wider text-sm py-4 rounded-2xl cursor-pointer hover:shadow-[0_0_25px_rgba(20,184,166,0.25)] transition duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
        >
          <span>🚀 UNLOCK MY CHRONOLOGICAL CALENDAR NOW</span>
          <ChevronRight className="w-4 h-4 text-[#090D11]" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto md:text-left text-center">
      {/* 1. Header cockpit */}
      <header className="space-y-1">
        <span className="text-[10px] uppercase font-mono font-bold text-[#12B886] tracking-wider block">
          CHRONOLOGICAL AUDIT
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold font-sans text-white tracking-tight">
          Productivity History Calendar
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm text-left">
          Navigate past logs to audit completed habits, earned points, and consistency levels.
        </p>
      </header>

      {/* 2. Monthly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'GREAT DAYS', value: `${monthlySummary.greatCount} Days`, badge: '🔥 CONSISTENT', color: 'text-emerald-400' },
          { label: 'NEUTRAL GRACE', value: `${monthlySummary.neutralCount} Days`, badge: '🟡 IN CYCLE', color: 'text-amber-500' },
          { label: 'MONTHLY AVG', value: `${monthlySummary.averageProgress}%`, badge: '🎯 COMPLETION', color: 'text-cyan-400' },
          { label: 'POINTS EARNED', value: `${monthlySummary.totalPoints} PTS`, badge: '💎 ACCUMULATED', color: 'text-purple-405' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-[#12141A] border border-[#222631] rounded-2xl p-4 text-center shadow-lg relative flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase block tracking-widest">{stat.label}</span>
              <span className={`text-xl sm:text-2xl font-black font-mono block mt-2 tracking-tighter ${stat.color}`}>{stat.value}</span>
            </div>
            <span className="text-[9px] font-mono uppercase text-gray-500 tracking-wider block mt-3 select-none bg-[#1C1F2B] py-0.5 rounded-md">
              {stat.badge}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Core calendar layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Card (2/3 cols) */}
        <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-5 shadow-xl col-span-1 lg:col-span-2 space-y-4 flex flex-col justify-between text-left">
          
          {/* Calendar Header with navigation buttons */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-800/40">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#12B886]" />
              {monthNames[month]} {year}
            </h3>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-[#181A22] hover:bg-[#202431] border border-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-[#181A22] hover:bg-[#202431] border border-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekdays header */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono text-gray-500 font-extrabold uppercase select-none">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Calendar days grid */}
          <div className="grid grid-cols-7 gap-2">
            {gridCells.map((cell, idx) => {
              const metrics = getDayMetrics(cell.dateStr);
              const isSelected = selectedDateStr === cell.dateStr;
              const isToday = cell.dateStr === dateToday;

              // Styles based on status
              let cellClass = '';
              let barColor = '';
              
              if (!cell.isCurrentMonth) {
                cellClass = 'text-gray-700 bg-transparent border border-transparent opacity-30 cursor-not-allowed';
              } else {
                cellClass = 'cursor-pointer ';
                if (metrics.type === 'Great') {
                  cellClass += 'bg-emerald-500/5 text-emerald-450 border border-emerald-500/15 hover:bg-emerald-500/10';
                  barColor = 'bg-emerald-500';
                } else if (metrics.type === 'Neutral') {
                  cellClass += 'bg-amber-500/5 text-amber-500 border border-amber-500/15 hover:bg-amber-500/10';
                  barColor = 'bg-amber-500';
                } else if (metrics.type === 'Off') {
                  cellClass += 'bg-rose-500/5 text-rose-400 border border-rose-500/15 hover:bg-rose-500/10';
                  barColor = 'bg-rose-500';
                } else if (metrics.type === 'Future') {
                  cellClass += 'bg-transparent text-gray-400 border border-gray-800/80 hover:bg-[#1A1D26]';
                } else {
                  // Pre-journey
                  cellClass += 'bg-transparent text-gray-500 border border-dashed border-gray-800/60 hover:bg-[#151720]/40';
                }
              }

              return (
                <div
                  key={idx}
                  onClick={() => cell.isCurrentMonth && handleSelectDay(cell.dateStr)}
                  className={`relative p-2 rounded-xl h-16 flex flex-col justify-between transition duration-200 select-none ${cellClass} ${
                    isSelected ? 'ring-2 ring-[#12B886] ring-offset-2 ring-offset-[#0A0B0E] border-transparent scale-[1.02] shadow-[0_0_15px_rgba(18,184,134,0.25)]' : ''
                  }`}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between font-mono">
                    <span className={`text-xs font-black ${isToday ? 'bg-[#12B886] text-black w-4.5 h-4.5 rounded-full flex items-center justify-center font-extrabold' : ''}`}>
                      {cell.dayNum}
                    </span>
                    {cell.isCurrentMonth && metrics.type !== 'Future' && metrics.type !== 'Inactive' && (
                      <span className="text-[9px] font-bold text-gray-400">
                        {metrics.cumulativeGrowth > 0 ? `+${metrics.cumulativeGrowth.toFixed(1)}%` : '0%'}
                      </span>
                    )}
                  </div>

                  {/* Visual bottom completion bar */}
                  {cell.isCurrentMonth && metrics.type !== 'Future' && metrics.type !== 'Inactive' && (
                    <div className="h-1 w-full bg-[#181B26] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${barColor}`} 
                        style={{ width: `${metrics.progress}%` }} 
                      />
                    </div>
                  )}

                  {/* Future/Inactive decoration dots */}
                  {cell.isCurrentMonth && metrics.type === 'Future' && (
                    <span className="text-[8px] font-mono text-gray-500 tracking-tight italic text-right block self-end">Future</span>
                  )}
                  {cell.isCurrentMonth && metrics.type === 'Inactive' && (
                    <span className="text-[8px] font-mono text-gray-600 tracking-tight block self-end font-semibold">Pre-climb</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Legend indicators */}
          <div className="flex flex-wrap items-center justify-start gap-4 pt-3 border-t border-gray-800/40 text-[10px] font-mono text-gray-400 select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30" />
              <span>Great Day (&ge; 80%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/20" />
              <span>Neutral Grace (40% - 79%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/10 border border-rose-500/20" />
              <span>Off Day (&lt; 40%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-gray-800" />
              <span>Future/Inactive</span>
            </span>
          </div>

        </div>

        {/* Daily Audit drawer console (1/3 col) */}
        <div className="bg-[#12141D] border border-[#232734] rounded-2xl p-5 shadow-2xl flex flex-col justify-between text-left relative overflow-hidden h-full">
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-mono font-black text-[#12B886] tracking-widest block">
              CHRONOLOGY CONSOLE
            </span>

            {/* Selected day header */}
            <div className="bg-[#090B10] border border-gray-800 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] text-gray-500 font-mono uppercase block">SIGNAL STAGE DETAILS</span>
              <h3 className="text-sm font-black text-white uppercase tracking-tight leading-tight">
                {selectedDayLabels}
              </h3>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {getSelectedDayTypeBadge(selectedDayMetrics.type, selectedDayMetrics.cumulativeGrowth)}
                {selectedDayMetrics.type !== 'Future' && selectedDayMetrics.type !== 'Inactive' && (
                  <span className="bg-purple-950/20 text-purple-400 border border-purple-950/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
                    <Zap className="w-3 h-3 fill-purple-400 text-purple-400" />
                    +{selectedDayMetrics.points} PTS
                  </span>
                )}
              </div>
            </div>

            {/* Completion metrics section */}
            {selectedDayMetrics.type !== 'Future' && selectedDayMetrics.type !== 'Inactive' ? (
              <div className="space-y-4">
                {/* Visual completion metrics */}
                <div className="bg-[#090B10]/60 border border-gray-800/80 rounded-xl p-3.5 space-y-3.5 text-xs select-none">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <span className="text-gray-400 font-sans">Total Completion:</span>
                    <span className="text-white font-black font-mono">{selectedDayMetrics.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <span className="text-gray-400 font-sans">Tasks Completed:</span>
                    <span className="text-white font-extrabold font-mono">
                      {selectedDayMetrics.done} / {selectedDayMetrics.total} Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-sans">Points Claimed:</span>
                    <span className="text-emerald-400 font-black font-mono">+{selectedDayMetrics.points} Points</span>
                  </div>
                </div>

                {/* Checklist Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block font-bold">Retroactive Log Editor</span>
                    <span className="text-[8px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono font-black px-1.5 py-0.2 rounded select-none">EDIT ACTIVE</span>
                  </div>

                  {/* Empty state if nothing scheduled */}
                  {scheduledStandalone.length === 0 && scheduledRoutines.length === 0 && (
                    <p className="text-xs text-gray-500 italic p-3 text-center bg-[#090B10] border border-gray-800 rounded-xl">
                      No standalone tasks or routines scheduled on this day.
                    </p>
                  )}

                  {/* 1. Standalone habits logs */}
                  {scheduledStandalone.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-[#12B886] font-bold tracking-widest block uppercase">Standalone Habits</span>
                      {scheduledStandalone.map(habit => {
                        const loggedVal = habit.history[selectedDateStr] || 0;
                        const isComplete = loggedVal >= habit.target;
                        const pts = calculateHabitLogPoints(habit, loggedVal);
                        const isTimer = habit.type === 'Timer';
                        const changeInc = isTimer ? 5 : 1;
                        const isLoggingThis = loggingProgressId === habit.id;

                        return (
                          <div key={habit.id} className="bg-[#090B10]/45 border border-gray-805/60 p-3 rounded-xl flex items-start justify-between gap-3 text-xs relative overflow-hidden">
                            {isLoggingThis && (
                              <div className="absolute inset-0 bg-[#0A0B0E]/60 flex items-center justify-center z-15 backdrop-blur-[1px]">
                                <span className="text-[9px] font-mono text-teal-400 animate-pulse font-black uppercase">SYNCING LOGS...</span>
                              </div>
                            )}

                            <div className="flex items-start gap-2.5">
                              {/* Standard toggle checkbox */}
                              <button
                                onClick={() => handleToggleHabit(habit.id, habit.target, loggedVal)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all select-none cursor-pointer ${
                                  isComplete 
                                    ? 'bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-950/20' 
                                    : 'border-gray-700 hover:border-gray-500 bg-transparent text-transparent'
                                }`}
                              >
                                <span className="text-xs font-black leading-none select-none">✓</span>
                              </button>

                              <div>
                                <h4 className="font-extrabold text-white font-sans flex items-center gap-1.5">
                                  {habit.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    {loggedVal} / {habit.target} {habit.unit}
                                  </span>

                                  {/* Fine tuning controls */}
                                  <div className="flex items-center border border-gray-800 rounded bg-[#090B10] overflow-hidden select-none">
                                    <button
                                      onClick={() => handleAdjustValue(habit.id, -changeInc, loggedVal)}
                                      disabled={loggedVal <= 0}
                                      className="px-1.5 py-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 text-[10px] font-black cursor-pointer bg-gray-900 border-r border-gray-800"
                                    >
                                      -
                                    </button>
                                    <button
                                      onClick={() => handleAdjustValue(habit.id, changeInc, loggedVal)}
                                      disabled={isComplete}
                                      className="px-1.5 py-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 text-[10px] font-black cursor-pointer bg-gray-900"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`text-[10px] font-mono font-bold ${pts > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                                {pts > 0 ? `+${pts} PTS` : '0 PTS'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Routines logs */}
                  {scheduledRoutines.length > 0 && (
                    <div className="space-y-2 pt-1.5">
                      <span className="text-[9px] font-mono text-purple-400 font-bold tracking-widest block uppercase">Routines</span>
                      {scheduledRoutines.map(routine => {
                        const isComplete = routine.completedHistory?.[selectedDateStr] || false;
                        const routineHabits = getRoutineHabits(routine, habits, selectedDateStr);
                        const doneCount = routineHabits.filter(h => (h.history[selectedDateStr] || 0) >= h.target).length;
                        const pct = routineHabits.length > 0 ? Math.round((doneCount / routineHabits.length) * 100) : 0;

                        return (
                          <div key={routine.id} className={`p-3 rounded-xl border flex flex-col gap-2.5 text-xs ${
                            isComplete 
                              ? 'bg-purple-950/5 border-purple-500/20 shadow-inner' 
                              : 'bg-[#090B10]/40 border-gray-800/60'
                          }`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-extrabold text-white font-sans flex items-center gap-1.5">
                                  {routine.name}
                                  {isComplete && <span className="text-purple-450 font-bold shrink-0">✓</span>}
                                </h4>
                                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">
                                  {routine.timeBlock} Block &bull; {doneCount}/{routineHabits.length} Habits ({pct}%)
                                </span>
                              </div>
                              <span className={`text-[10px] font-mono font-bold shrink-0 ${
                                isComplete ? 'text-purple-400' : 'text-gray-500'
                              }`}>
                                {isComplete ? `+${routine.points} PTS` : '0 PTS'}
                              </span>
                            </div>

                            {/* Inner mini list of sub-habits with retroactive check checkboxes */}
                            <div className="space-y-2 pl-3 border-l border-gray-800 pt-1">
                              {routineHabits.map(habit => {
                                const loggedVal = habit.history[selectedDateStr] || 0;
                                const habitComplete = loggedVal >= habit.target;
                                const isTimer = habit.type === 'Timer';
                                const changeInc = isTimer ? 5 : 1;
                                const isLoggingThis = loggingProgressId === habit.id;

                                return (
                                  <div key={habit.id} className="flex flex-col gap-1 relative overflow-hidden">
                                    {isLoggingThis && (
                                      <div className="absolute inset-0 bg-[#0A0B0E]/60 flex items-center justify-center z-15 backdrop-blur-[0.5px]">
                                        <span className="text-[8px] font-mono text-teal-400 animate-pulse font-black uppercase">SYNCING...</span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-[10px]">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleToggleHabit(habit.id, habit.target, loggedVal)}
                                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all select-none cursor-pointer ${
                                            habitComplete 
                                              ? 'bg-emerald-500 border-emerald-450 text-black shadow shadow-emerald-950/20' 
                                              : 'border-gray-800 hover:border-gray-650 text-transparent'
                                          }`}
                                        >
                                          <span className="text-[9px] font-black leading-none select-none">✓</span>
                                        </button>
                                        <span className={habitComplete ? 'text-gray-300 font-semibold font-sans' : 'text-gray-400 font-sans'}>{habit.name}</span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-gray-500 text-[9px] select-none">
                                          {loggedVal}/{habit.target} {habit.unit}
                                        </span>

                                        <div className="flex items-center border border-gray-800/80 rounded bg-black/40 overflow-hidden select-none scale-[0.9]">
                                          <button
                                            onClick={() => handleAdjustValue(habit.id, -changeInc, loggedVal)}
                                            disabled={loggedVal <= 0}
                                            className="px-1 py-0.2 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 text-[8px] font-black cursor-pointer bg-gray-900 border-r border-gray-800"
                                          >
                                            -
                                          </button>
                                          <button
                                            onClick={() => handleAdjustValue(habit.id, changeInc, loggedVal)}
                                            disabled={habitComplete}
                                            className="px-1 py-0.2 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 text-[8px] font-black cursor-pointer bg-gray-900"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            ) : (
              // Empty/Warning details state for Future/Inactive dates
              <div className="bg-[#090B10]/35 border border-dashed border-gray-800 rounded-xl p-5 text-center text-xs text-gray-500 space-y-2 select-none">
                <span className="text-2xl block">🗓️</span>
                <p className="font-sans leading-relaxed text-left">
                  {selectedDayMetrics.type === 'Future' 
                    ? 'This calendar day is in the future. Execute your dashboard habits on that day to start compounding!' 
                    : 'This date is prior to your journey initialization start date.'
                  }
                </p>
                {selectedDayMetrics.type === 'Inactive' && journeyStartDate && (
                  <p className="text-[10px] font-mono text-gray-600 block mt-3 text-left font-bold uppercase">
                    Start date set to: {journeyStartDate}
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-550 leading-relaxed font-sans mt-4 italic">
            *Calendar completion values sync in real time with checked-off Dashboard items.
          </p>
        </div>

      </div>
    </div>
  );
}
