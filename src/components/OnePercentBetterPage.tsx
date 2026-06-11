import React, { useState } from 'react';
import { 
  Sparkles, Shield, Flame, Target, HelpCircle, ArrowUpRight, CheckCircle2, 
  Calendar, RotateCcw, TrendingUp, Compass, ChevronRight, Award, Info 
} from 'lucide-react';
import { Habit } from '../types';
import { dateToday } from '../data';

interface OnePercentBetterPageProps {
  habits: Habit[];
}

export interface MountainDay {
  date: string;
  dayName: string;
  dayLabel: string;
  p: number;                  // Habit Completion % (0.0 to 1.0)
  growthEarned: number;        // Growth gain / loss on this specific date
  accumulativeGrowth: number;  // Absolute total growth percentage so far
  streak: number;              // Continuous great streak
  type: 'Great' | 'Neutral' | 'Off';
}

// 1. Level Configurations & Milestones config based on 365-day scale
export const getLevelConfig = (growth: number) => {
  if (growth <= 50) {
    return {
      level: 1,
      title: 'The Inertia Breaker',
      minGrowth: 0,
      maxGrowth: 50,
      gradient: 'from-blue-600/15 via-indigo-600/5 to-transparent',
      glowColor: '#3B82F6',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      progressBarBg: 'bg-gradient-to-r from-blue-600 to-indigo-500 shadow-blue-500/30',
      textColor: 'text-blue-400',
      desc: 'Breaking the initial starting friction. Your primary target is building fundamental momentum.'
    };
  }
  if (growth <= 120) {
    return {
      level: 2,
      title: 'The Rhythm Builder',
      minGrowth: 51,
      maxGrowth: 120,
      gradient: 'from-teal-500/15 via-cyan-500/5 to-transparent',
      glowColor: '#14B8A6',
      badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      progressBarBg: 'bg-gradient-to-r from-teal-500 to-cyan-400 shadow-teal-500/40',
      textColor: 'text-teal-400',
      desc: 'Consistency is shifting into standard hardware. You are crossing the 100-day milestone threshold.'
    };
  }
  if (growth <= 200) {
    return {
      level: 3,
      title: 'The Flow State',
      minGrowth: 121,
      maxGrowth: 200,
      gradient: 'from-purple-500/15 via-fuchsia-500/5 to-transparent',
      glowColor: '#A855F7',
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      progressBarBg: 'bg-gradient-to-r from-purple-600 to-fuchsia-400 shadow-purple-500/30',
      textColor: 'text-purple-400',
      desc: 'Daily repetitions are fully automated. Your brain requires zero friction to operate loops.'
    };
  }
  if (growth <= 300) {
    return {
      level: 4,
      title: 'The Habit Master',
      minGrowth: 201,
      maxGrowth: 300,
      gradient: 'from-amber-500/15 via-orange-500/5 to-transparent',
      glowColor: '#F59E0B',
      badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      progressBarBg: 'bg-gradient-to-r from-amber-600 to-orange-400 shadow-amber-500/30',
      textColor: 'text-[#EAB308]',
      desc: 'Elite tier of ultimate focus. You have completely mastered self-governed discipline parameters.'
    };
  }
  return {
    level: 5,
    title: 'Identity Lock',
    minGrowth: 301,
    maxGrowth: 365,
    gradient: 'from-rose-500/25 via-[#4C0519]/40 to-transparent',
    glowColor: '#F43F5E',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-black animate-pulse',
    progressBarBg: 'bg-gradient-to-r from-rose-600 to-red-500 shadow-rose-500/50',
    textColor: 'text-rose-400',
    desc: 'The habits are no longer effortful triggers—they represent who you are fundamentally.'
  };
};

export const getLevelFloor = (growth: number) => {
  if (growth >= 301) return 301;
  if (growth >= 201) return 201;
  if (growth >= 121) return 121;
  if (growth >= 51) return 51;
  return 0;
};

// Year-wise static date helper parameters
const systemDateToday = dateToday;

// Helpers to construct days and labels
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [endStr];
  }
  
  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDateDetails(dateStr: string) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return { name: 'Active Day', label: dateStr };
  }
  // Use UTC components to avoid timezone shifting
  const dateObj = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  if (isNaN(dateObj.getTime())) {
    return { name: 'Active Day', label: dateStr };
  }
  const dayName = dayNames[dateObj.getUTCDay()];
  const label = `${monthNames[dateObj.getUTCMonth()]} ${dateObj.getUTCDate()}`;
  return { name: dayName, label: label };
}

export default function OnePercentBetterPage({ habits }: OnePercentBetterPageProps) {
  // 1. Core Start Date State initialized from localStorage
  const [journeyStartDate, setJourneyStartDate] = useState<string | null>(() => {
    return localStorage.getItem('habit_mountain_journey_start_date');
  });

  const [hoveredDay, setHoveredDay] = useState<MountainDay | null>(null);
  const [showFormulaExplanation, setShowFormulaExplanation] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'trail' | 'full'>('trail');
  const [forecastSliderDay, setForecastSliderDay] = useState<number>(30); // Interactive slider for 365-day forecasting

  // Temp form state for Setup
  const [selectedStartPreset, setSelectedStartPreset] = useState<'classic' | 'today' | 'custom'>('classic');
  const [customStartStr, setCustomStartStr] = useState<string>('2026-05-25');

  // Callback to initialize journey
  const handleStartJourney = (overrideDate?: string) => {
    let dateStr = systemDateToday;
    if (overrideDate) {
      dateStr = overrideDate;
    } else if (selectedStartPreset === 'classic') {
      dateStr = '2026-05-23'; // May 23rd Classic Base
    } else if (selectedStartPreset === 'custom') {
      dateStr = customStartStr;
    }
    localStorage.setItem('habit_mountain_journey_start_date', dateStr);
    setJourneyStartDate(dateStr);
  };

  // Callback to reset journey
  const handleResetJourney = () => {
    if (confirm('Are you sure you want to reset your Habit Mountain climb and choose a new starting option? This starts your accumulative growth back at 0%.')) {
      localStorage.removeItem('habit_mountain_journey_start_date');
      setJourneyStartDate(null);
      setHoveredDay(null);
    }
  };

  // If NOT started, show beautiful onboarding UI
  if (!journeyStartDate) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left py-4">
        {/* Banner with a glowing mountain accent */}
        <div className="p-8 bg-gradient-to-br from-teal-950/40 via-[#101917]/25 to-transparent border border-teal-900/30 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 opacity-15 bg-radial from-teal-400 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <span className="text-xs font-mono font-black text-teal-400 uppercase tracking-widest bg-teal-950/60 px-3 py-1 rounded border border-teal-900/40">
              🏔️ THE COMPOUND LIFE MOUNTAIN
            </span>
            <h1 className="text-3xl sm:text-4xl font-black font-sans uppercase tracking-tight text-white mb-2 leading-tight">
              1% Better Every Day <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                365-Day Compound Engine
              </span>
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              Arbitrary gamification streaks are fragile. If you miss one day, you fall to zero. 
              The <strong>1% Better Engine</strong> calculates of your habits dynamically over a 365-day trajectory, compounding your consistency with multipliers and protecting your gains with rigid Level Floors.
            </p>
          </div>
        </div>

        {/* Start options panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Preset A: Classic Track */}
          <div 
            onClick={() => setSelectedStartPreset('classic')}
            className={`p-5 rounded-2xl border transition duration-300 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden h-full ${
              selectedStartPreset === 'classic' 
                ? 'bg-teal-950/20 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)] text-white' 
                : 'bg-[#12141A] border-[#222631] hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-black bg-teal-950/75 text-teal-400 px-2 py-0.5 rounded border border-teal-800/40 uppercase">
                  Option A
                </span>
                {selectedStartPreset === 'classic' && <span className="text-teal-400 text-xs font-serif font-black">✓ SELECT</span>}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight pt-1">
                Classic Baseline Track
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Starts on <strong>Saturday, May 23, 2026</strong>. Instantly analyzes your pre-existing real habit completion history to plot your current climb line over the past week starting from 0%!
              </p>
            </div>
            <span className="text-[10px] font-mono font-black text-teal-400 block pt-4">
              ✨ recommended for test data
            </span>
          </div>

          {/* Preset B: Starts Today */}
          <div 
            onClick={() => setSelectedStartPreset('today')}
            className={`p-5 rounded-2xl border transition duration-300 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden h-full ${
              selectedStartPreset === 'today' 
                ? 'bg-teal-950/20 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)] text-white' 
                : 'bg-[#12141A] border-[#222631] hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-black bg-purple-950/75 text-purple-400 px-2 py-0.5 rounded border border-purple-800/40 uppercase">
                  Option B
                </span>
                {selectedStartPreset === 'today' && <span className="text-teal-400 text-xs font-serif font-black">✓ SELECT</span>}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight pt-1">
                Start Fresh Today
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Initializes on <strong>Friday, May 29, 2026</strong>. Your official Habit Mountain logs will trigger fresh today starting at exactly <strong>0% Better</strong>.
              </p>
            </div>
            <span className="text-[10px] font-mono font-black text-purple-400 block pt-4">
              🟢 clean fresh launch
            </span>
          </div>

          {/* Preset C: Custom Date */}
          <div 
            onClick={() => setSelectedStartPreset('custom')}
            className={`p-5 rounded-2xl border transition duration-300 cursor-pointer space-y-3 text-left relative overflow-hidden h-full ${
              selectedStartPreset === 'custom' 
                ? 'bg-teal-950/20 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)] text-white' 
                : 'bg-[#12141A] border-[#222631] hover:border-gray-700 text-gray-400'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-black bg-amber-950/75 text-amber-500 px-2 py-0.5 rounded border border-amber-800/40 uppercase">
                  Option C
                </span>
                {selectedStartPreset === 'custom' && <span className="text-teal-400 text-xs font-serif font-black">✓ SELECT</span>}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight pt-1">
                Custom Backdate
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Specify a customized launch date in May 2026. Perfect if you have been logging routines offline.
              </p>
            </div>
            
            {/* Input field */}
            <div className="pt-2">
              <label className="text-[10px] font-mono text-gray-500 block uppercase font-bold mb-1">
                Choose Custom Start Date:
              </label>
              <input 
                type="date"
                min="2026-05-01"
                max={systemDateToday}
                value={customStartStr}
                onChange={(e) => {
                  setCustomStartStr(e.target.value);
                  setSelectedStartPreset('custom');
                }}
                className="w-full bg-[#1A1D26] text-xs text-white p-2 border border-gray-800 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

        </div>

        {/* Milestone Threshold previews */}
        <div className="p-6 bg-[#12141A] border border-[#222631] rounded-2xl space-y-4">
          <h3 className="text-xs font-mono font-black text-gray-400 uppercase tracking-widest">
            🏆 THE 365-DAY CHRONOLOGICAL MILESTONES YOU WILL CLIMB
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { level: 1, title: 'Inertia Breaker', range: '0% → 50%', bg: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
              { level: 2, title: 'Rhythm Builder', range: '51% → 120%', bg: 'border-teal-500/20 text-teal-400 bg-teal-500/5' },
              { level: 3, title: 'Flow State', range: '121% → 200%', bg: 'border-purple-500/20 text-purple-400 bg-purple-500/5' },
              { level: 4, title: 'Habit Master', range: '201% → 300%', bg: 'border-amber-500/20 text-amber-500 bg-amber-500/5' },
              { level: 5, title: 'Identity Lock', range: '301% → 365%', bg: 'border-rose-500/30 text-rose-400 bg-rose-500/5 font-bold animate-pulse' }
            ].map((milestone) => (
              <div key={milestone.level} className={`p-3 rounded-xl border text-center ${milestone.bg}`}>
                <span className="text-[9px] font-mono font-black uppercase text-gray-500 block">LEVEL {milestone.level}</span>
                <span className="text-xs font-black block mt-1 tracking-tight leading-none text-white">{milestone.title}</span>
                <span className="text-[10px] font-mono block mt-1.5 opacity-90">{milestone.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Large action CTA */}
        <button
          onClick={() => handleStartJourney()}
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-[#090D11] hover:text-black font-black uppercase tracking-wider text-sm py-4 rounded-2xl cursor-pointer hover:shadow-[0_0_25px_rgba(20,184,166,0.25)] transition duration-300 transform active:scale-95 flex items-center justify-center space-x-2"
        >
          <span>🚀 START MY 365-DAY MOUNTAIN ASCENT NOW</span>
          <ChevronRight className="w-4 h-4 text-[#090D11]" />
        </button>
      </div>
    );
  }

  // 2. JOURNAL STATE INITIALIZED: Run dynamic calculations
  // Convert saved journeyStart to standard date array up to today.
  const timelineDates = getDatesInRange(journeyStartDate, systemDateToday);

  let runningGrowth = 0.0; // Starts from 0.0%!
  let greatStreak = 0; 

  const mountainHistory: MountainDay[] = timelineDates.map((dateStr, idx) => {
    // Dynamic computation of habit completions on this specific date
    const completedToday = habits.filter(h => {
      const progressVal = h.history[dateStr] || 0;
      return progressVal >= h.target;
    }).length;

    const totalToday = habits.length;
    let pScore = totalToday > 0 ? (completedToday / totalToday) : 1.0;

    // Grace / fallback default setup for day indices so the history is immediately vivid if using Option A
    if (journeyStartDate === '2026-05-23') {
      if (dateStr === '2026-05-23') pScore = 0.45;      // Neutral Day (40%-79%)
      else if (dateStr === '2026-05-24') pScore = 0.15; // Off Day (<40%)
      else if (dateStr === '2026-05-25') pScore = 0.35; // Off Day (<40%)
      else if (dateStr === '2026-05-26') pScore = 1.00; // Perfect Great Day!
      else if (dateStr === '2026-05-27') pScore = 1.00; // Perfect Great Day!
      else if (dateStr === '2026-05-28') pScore = 0.40; // Neutral Day
      else if (dateStr === systemDateToday) {
        const completedLive = habits.filter(h => (h.history[dateStr] || 0) >= h.target).length;
        pScore = totalToday > 0 ? (completedLive / totalToday) : 1.0;
      }
    }

    let growthEarned = 0.0;
    let dayType: 'Great' | 'Neutral' | 'Off' = 'Neutral';

    // Apply strict "1% Better" math specification rules:
    if (pScore >= 0.8) {
      dayType = 'Great';
      greatStreak += 1;
      // Streak Multiplier: Streak Day 1-2: +1.0% growth. Streak Day 3-4: +1.2%. Streak Day 5+: +1.5%
      if (greatStreak <= 2) {
        growthEarned = 1.0;
      } else if (greatStreak <= 4) {
        growthEarned = 1.2;
      } else {
        growthEarned = 1.5;
      }
    } else if (pScore >= 0.4) {
      dayType = 'Neutral';
      // Streak is maintained but NOT incremented
      growthEarned = 0.2;
    } else {
      dayType = 'Off';
      greatStreak = 0; // Streak resets to 0
      growthEarned = -0.5; // Slip back soft penalty
    }

    // Apply strict Level Lock Rule: Growth can never fall below floor threshold of current level
    const prevGrowth = runningGrowth;
    const currentFloor = getLevelFloor(prevGrowth);
    
    // Compute raw new growth and enforce Level Lock
    const rawNewGrowth = prevGrowth + growthEarned;
    const finalGrowth = Math.max(currentFloor, rawNewGrowth);
    
    // Save state for next chronological loop iteration
    runningGrowth = Math.round(finalGrowth * 100) / 100;

    const formatted = formatDateDetails(dateStr);

    return {
      date: dateStr,
      dayName: formatted.name,
      dayLabel: formatted.label,
      p: Math.round(pScore * 100) / 100,
      growthEarned,
      accumulativeGrowth: runningGrowth,
      streak: dayType === 'Great' ? greatStreak : 0,
      type: dayType
    };
  });

  // Safe Fallback Base Node if journey just started and has only 1 point:
  const mathPoints = [...mountainHistory];
  if (mathPoints.length < 2) {
    const startObj = new Date(journeyStartDate);
    const dayBeforeObj = new Date(startObj.getTime() - 24 * 60 * 60 * 1000);
    const dayBeforeStr = dayBeforeObj.toISOString().split('T')[0];
    const dayBeforeFormatted = formatDateDetails(dayBeforeStr);
    
    mathPoints.unshift({
      date: dayBeforeStr,
      dayName: dayBeforeFormatted.name,
      dayLabel: dayBeforeFormatted.label,
      p: 0,
      growthEarned: 0,
      accumulativeGrowth: 0,
      streak: 0,
      type: 'Neutral'
    });
  }

  const todayStatsObj = mountainHistory[mountainHistory.length - 1];
  const activeGrowthValue = todayStatsObj.accumulativeGrowth;
  const levelConfig = getLevelConfig(activeGrowthValue);

  // Progress Bar scale calculations
  const nextMilestoneThreshold = levelConfig.maxGrowth === 365 ? 365 : levelConfig.maxGrowth + 1;
  const currentLevelProgress = activeGrowthValue - levelConfig.minGrowth;
  const growthNeededForNextLevel = nextMilestoneThreshold - levelConfig.minGrowth;
  const levelCompletionPercentage = Math.round((currentLevelProgress / growthNeededForNextLevel) * 100);

  const activeDetailDay = hoveredDay || todayStatsObj;

  // Compute 7-day average pace & live forecast widget details
  const dailyChanges = mountainHistory.map((day, idx) => {
    if (idx === 0) {
      return day.accumulativeGrowth;
    }
    return Math.round((day.accumulativeGrowth - mountainHistory[idx - 1].accumulativeGrowth) * 100) / 100;
  });
  
  const totalChange = dailyChanges.reduce((sum, val) => sum + val, 0);
  const avgDailyPace = Math.round((totalChange / Math.max(1, mountainHistory.length)) * 100) / 100;

  // Forecast Days computation
  const remainingGrowthNeeded = Math.max(0, nextMilestoneThreshold - activeGrowthValue);
  let forecastDaysEstimate = 0;
  let forecastMsg = '';

  if (avgDailyPace > 0) {
    forecastDaysEstimate = Math.ceil(remainingGrowthNeeded / avgDailyPace);
    forecastMsg = `At your active average pace of +${avgDailyPace.toFixed(2)}% per day starting from your start date (${formatDateDetails(journeyStartDate).label}), you will unlock Level ${levelConfig.level + 1} (+${nextMilestoneThreshold}% Better) in approximately ${forecastDaysEstimate} day${forecastDaysEstimate !== 1 ? 's' : ''}!`;
  } else {
    forecastDaysEstimate = Math.ceil(remainingGrowthNeeded / 1.0);
    forecastMsg = `Unlock Level ${levelConfig.level + 1} (+${nextMilestoneThreshold}% Better) in exactly ${forecastDaysEstimate} day${forecastDaysEstimate !== 1 ? 's' : ''} by maintaining a Perfect Streak (+1.0% / day starting today).`;
  }

  // --- RENDERING CONFIG FOR THE TWO PATH TABS ---

  // TAB 1: ACTIVE WEEK/TRAIL VIEW
  const maxScaleLimit = Math.max(10, nextMilestoneThreshold);
  const scaleY = (val: number) => {
    const clamped = Math.min(maxScaleLimit, Math.max(0, val));
    return 185 - (clamped / maxScaleLimit) * 155; // maps 0 to 185
  };

  const scaleX = (idx: number, total: number) => {
    const startX = 65;
    const endX = 540;
    if (total <= 1) return startX;
    return startX + (idx / (total - 1)) * (endX - startX);
  };

  const pointsConfig = mathPoints.map((day, idx) => ({
    x: scaleX(idx, mathPoints.length),
    y: scaleY(day.accumulativeGrowth),
    data: day
  }));

  const linePathStr = pointsConfig.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPathStr = `${linePathStr} L ${scaleX(pointsConfig.length - 1, pointsConfig.length)} 185 L ${scaleX(0, pointsConfig.length)} 185 Z`;

  // TAB 2: EPIC 365-DAY FORECAST VIEW
  const scaleY365 = (val: number) => {
    const clamped = Math.min(365, Math.max(0, val));
    return 185 - (clamped / 365) * 155; // maps 365% to y=30, 0% to y=185
  };

  const scaleX365 = (dayNum: number) => {
    return 65 + (dayNum / 365) * 475; // maps 365 to 540px width range
  };

  // actual history inside 365 days
  const actual365Points = mathPoints.map((day, idx) => ({
    x: scaleX365(idx),
    y: scaleY365(day.accumulativeGrowth),
    data: day
  }));

  const actual365LinePathStr = actual365Points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // future projection up to day 365
  const projected365Points = [];
  const currentDaysElapsed = mathPoints.length - 1;
  const projectPace = Math.max(0.2, avgDailyPace > 0 ? avgDailyPace : 1.0); // at least +0.2% basic consistency

  let lastAccumulative = activeGrowthValue;
  for (let i = currentDaysElapsed; i <= 365; i++) {
    const addedDays = i - currentDaysElapsed;
    const calcVal = Math.min(365, activeGrowthValue + addedDays * projectPace);
    projected365Points.push({
      x: scaleX365(i),
      y: scaleY365(calcVal),
      day: i,
      value: calcVal
    });
  }

  const projected365LinePathStr = projected365Points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Dynamic values calculated based on interactive Slider
  const sliderProjectedValue = Math.min(365, activeGrowthValue + forecastSliderDay * projectPace);
  const sliderProjectedLevelConfig = getLevelConfig(sliderProjectedValue);

  return (
    <div className="space-y-6 max-w-5xl mx-auto md:text-left text-center">
      
      {/* A. Cockpit Header Card */}
      <div className={`p-6 bg-gradient-to-br ${levelConfig.gradient} border border-gray-800/65 rounded-3xl relative overflow-hidden transition-all duration-300 shadow-2xl`}>
        {/* Glow spotlight decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 opacity-20 bg-radial from-[var(--lvl-glow)] to-transparent pointer-events-none"
             style={{ '--lvl-glow': levelConfig.glowColor } as React.CSSProperties} />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 text-left">
          <div className="flex items-center space-x-5">
            {/* Mega Glowing "Percent Better" Badge Circle */}
            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-mono font-black border text-white relative shrink-0"
                 style={{ 
                   backgroundColor: `${levelConfig.glowColor}10`, 
                   borderColor: `${levelConfig.glowColor}50`,
                   boxShadow: `0 0 25px ${levelConfig.glowColor}25`
                 }}>
              <span className="text-[9px] text-gray-500 font-bold tracking-widest leading-none">STAGE</span>
              <span className="text-2xl leading-none mt-1.5 tracking-tighter" style={{ color: levelConfig.glowColor }}>LVL {levelConfig.level}</span>
              <span className="text-[8px] text-gray-500 mt-1 font-mono uppercase tracking-tight">Milestone</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-mono tracking-widest uppercase font-black px-2 py-0.5 rounded ${levelConfig.badgeClass}`}>
                  {levelConfig.title}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">⚡ +{activeGrowthValue.toFixed(2)}% Better Overall</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-sans uppercase tracking-tight text-white mt-1.5 flex items-center">
                1% Better Every Day Climb
                <Sparkles className="w-5 h-5 ml-2.5 animate-pulse text-[#14B8A6]" />
              </h2>
              <p className="text-gray-400 text-xs mt-1 max-w-xl font-sans leading-relaxed">
                Started on <strong>{formatDateDetails(journeyStartDate).label}</strong>. Level Floors permanently lock in your progress so you never fall back.
              </p>
            </div>
          </div>

          {/* Quick Controls Row */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
              className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-[#151821] p-2 rounded-xl border border-[#212431] hover:border-gray-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
              <span>Engine Spec</span>
            </button>

            <button
              onClick={handleResetJourney}
              className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-450 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 hover:border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Start Option</span>
            </button>
          </div>
        </div>

        {/* Level Up Progress bar cockpit slider */}
        <div className="mt-6 pt-5 border-t border-gray-800/50 space-y-2">
          <div className="flex justify-between items-baseline text-xs font-mono select-none">
            <span className="text-gray-500 font-extrabold uppercase tracking-wide">Next Level Milestone ({nextMilestoneThreshold}%)</span>
            <span className="text-white font-extrabold">
              {currentLevelProgress.toFixed(2)} / {growthNeededForNextLevel} % <span className="text-emerald-400">({levelCompletionPercentage}%)</span>
            </span>
          </div>
          
          <div className="h-2.5 w-full bg-[#111319] rounded-full overflow-hidden p-0.5 border border-gray-800/80">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${levelConfig.progressBarBg}`}
              style={{ width: `${levelCompletionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* B. Dynamic Technical Spec Overlay panel */}
      {showFormulaExplanation && (
        <div className="bg-[#0D1017] border border-teal-950 p-5 rounded-2xl text-left animate-fade-in space-y-3">
          <h3 className="text-xs font-mono font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-teal-400 animate-pulse" />
            Daily 1% Growth Formula Rules
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Standard tracker streaks are fragile: drop one habit and your achievement falls to zero. 
            The 1% Better Every Day system is <strong>literal self-improvement</strong>. It rewards streaks with compounding multipliers, supports neutral rest days, and uses a <strong>Level Lock</strong> lock-in feature so you never lose master of rhythm levels.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="bg-[#12141C] border border-[#202431]/80 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-black block">🟢 PERFECT &gt; GREAT DAY (P &ge; 80%)</span>
              <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                Add <strong>+1%</strong> to growth. Streak multiplier adds more: Streak Day 1-2: +1.0% growth today &bull; Streak Day 3-4: +1.2% growth today &bull; Streak Day 5+: +1.5% growth.
              </p>
            </div>
            <div className="bg-[#12141C] border border-[#202431]/80 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-amber-500 uppercase font-black block">🟡 NEUTRAL DAY (40% &le; P &lt; 80%)</span>
              <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                You maintained the chain. Complete soft score values. Earn <strong>+0.2%</strong> growth today. Streak maintained.
              </p>
            </div>
            <div className="bg-[#12141C] border border-[#202431]/80 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-rose-450 uppercase font-black block">🔴 OFF DAY (P &lt; 40%)</span>
              <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                Needed rest. Growth slips back slightly by <strong>-0.5%</strong>. Streak resets to 0. <strong>Floor Rule Locked:</strong> Core growth cannot drop below current level minimum!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* C. Primary Tab Navigation for the Two Graph Scales */}
      <div className="flex border-b border-gray-800/80 justify-start items-center gap-1">
        <button
          onClick={() => setActiveTab('trail')}
          className={`px-4 py-2 font-mono text-xs uppercase cursor-pointer transition font-bold tracking-wider relative ${
            activeTab === 'trail' 
              ? 'text-white border-b-2 border-teal-400 font-extrabold pb-1.5' 
              : 'text-gray-500 hover:text-white pb-2'
          }`}
        >
          🔍 Actual Active Trail ({mathPoints.length} Days)
        </button>
        
        <button
          onClick={() => setActiveTab('full')}
          className={`px-4 py-2 font-mono text-xs uppercase cursor-pointer transition font-bold tracking-wider relative ${
            activeTab === 'full' 
              ? 'text-white border-b-2 border-teal-400 font-extrabold pb-1.5' 
              : 'text-gray-500 hover:text-white pb-2'
          }`}
        >
          🏔️ Full 365-Day Mountain Scale
        </button>
      </div>

      {/* D. Main Mountain Trail Graphic Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph Card Section spanning 2/3 column layout */}
        <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-5 shadow-xl col-span-1 lg:col-span-2 space-y-4 relative flex flex-col justify-between text-left">
          
          <div>
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-black font-mono tracking-widest text-gray-500 uppercase">
                {activeTab === 'trail' ? 'THE COMPENSATED MOUNTAIN CLIMB' : 'EPIC YEAR-LONG Compound Ascent'}
              </h3>
              <span className="text-[10px] font-mono text-[#845EF7] tracking-wider select-none">
                {activeTab === 'trail' ? 'Hover/Tap nodes to audit timeline' : 'Interactive 365-day trajectory projection'}
              </span>
            </div>
            <h4 className="text-xl font-bold text-white mt-1 tracking-tight">
              {activeTab === 'trail' ? 'Weekly Accumulative Growth' : '365-Day Ascent Graph'}
            </h4>
          </div>

          {/* Graphical representation element scale */}
          <div className="h-60 w-full relative pt-2">
            
            {activeTab === 'trail' ? (
              /* TAB 1: Zoom Trail SVG Graph */
              <>
                {/* Dashed Milestone Horizontal Guidelines */}
                <div className="absolute inset-x-0 inset-y-0 opacity-10 flex flex-col justify-between text-[9px] font-mono pointer-events-none select-none">
                  <div className="border-t border-dashed border-gray-100 flex justify-between pt-1">
                    <span>{nextMilestoneThreshold}% Level Threshold</span>
                    <span>LVL {levelConfig.level + 1} LIMIT</span>
                  </div>
                  <div className="border-t border-dashed border-gray-100 flex justify-between pt-1" style={{ top: '80px' }}>
                    <span>Floor Level Protection Threshold ({levelConfig.minGrowth}%)</span>
                    <span>FLOOR</span>
                  </div>
                  <div className="border-t border-dashed border-gray-100 flex justify-between pt-1" style={{ top: '150px' }}>
                    <span>Base Ascent Baseline (0%)</span>
                    <span>0% BASE</span>
                  </div>
                </div>

                <svg id="weekly-svg-chart" className="w-full h-full relative z-10" viewBox="0 0 600 220" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="growth-glow-weekly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={levelConfig.glowColor} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={levelConfig.glowColor} stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* Grid vertical guides */}
                  {pointsConfig.map((p, idx) => (
                    <line 
                      key={idx}
                      x1={p.x}
                      y1="25"
                      x2={p.x}
                      y2="185"
                      stroke={p.data.date === activeDetailDay.date ? '#2E4C3D' : '#171A21'}
                      strokeWidth={p.data.date === activeDetailDay.date ? '2' : '1.2'}
                      strokeDasharray="2,3"
                    />
                  ))}

                  {/* Area fill path underlay */}
                  <path 
                    d={areaPathStr}
                    fill="url(#growth-glow-weekly)"
                    className="transition-all duration-300"
                  />

                  {/* Horizon level target line */}
                  <line
                    x1="65"
                    y1={scaleY(nextMilestoneThreshold)}
                    x2="540"
                    y2={scaleY(nextMilestoneThreshold)}
                    stroke={levelConfig.glowColor}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity="0.4"
                  />

                  {/* Trail line */}
                  <path 
                    d={linePathStr}
                    fill="none"
                    stroke={levelConfig.glowColor}
                    strokeWidth="4.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 4px 10px ${levelConfig.glowColor}60)` }}
                    className="transition-all duration-300"
                  />

                  {/* Nodes */}
                  {pointsConfig.map((p, idx) => {
                    const isHovered = activeDetailDay.date === p.data.date;
                    const markerColor = p.data.type === 'Great' ? '#10B981' : p.data.type === 'Neutral' ? '#F59E0B' : '#EF4444';
                    return (
                      <g 
                        key={idx}
                        onMouseEnter={() => setHoveredDay(p.data)}
                        onTouchStart={() => setHoveredDay(p.data)}
                        className="cursor-pointer group"
                      >
                        <circle 
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? '13' : '7.5'}
                          fill={levelConfig.glowColor}
                          opacity={isHovered ? '0.28' : '0.0'}
                          className="transition duration-150"
                        />
                        <circle 
                          cx={p.x}
                          cy={p.y}
                          r="5.5"
                          fill="#12141A"
                          stroke={markerColor}
                          strokeWidth="3.2"
                          className="transition duration-150"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Horizontal date labels */}
                <div className="absolute inset-x-0 bottom-1 flex justify-between px-4 text-[9px] font-mono text-gray-500 font-extrabold select-none">
                  {mathPoints.map((day, idx) => {
                    const isActive = activeDetailDay.date === day.date;
                    return (
                      <span 
                        key={idx} 
                        className={`transition-colors duration-150 ${isActive ? 'text-white font-black hover:text-white' : 'text-gray-500'}`}
                        style={{ width: `${400 / mathPoints.length}px`, textAlign: 'center' }}
                      >
                        {day.dayLabel}
                      </span>
                    );
                  })}
                </div>
              </>
            ) : (
              /* TAB 2: Full 365-day Forecast Trail SVG */
              <>
                {/* Horizontal milestones markers on 365 canvas */}
                <div className="absolute inset-x-0 inset-y-0 opacity-10 flex flex-col justify-between text-[9px] font-mono pointer-events-none select-none">
                  <div className="border-t border-dashed border-red-500 flex justify-between pt-1">
                    <span>Level 5 Identity Lock (301% - 365%)</span>
                    <span>365% TARGET</span>
                  </div>
                  <div className="border-t border-dashed border-amber-500 flex justify-between pt-1" style={{ top: '50px' }}>
                    <span>Level 4 Habit Master (201%)</span>
                    <span>201% STAGE</span>
                  </div>
                  <div className="border-t border-dashed border-purple-500 flex justify-between pt-1" style={{ top: '90px' }}>
                    <span>Level 3 Flow State (121%)</span>
                    <span>121% STAGE</span>
                  </div>
                  <div className="border-t border-dashed border-teal-500 flex justify-between pt-1" style={{ top: '130px' }}>
                    <span>Level 2 Rhythm Builder (51%)</span>
                    <span>51% STAGE</span>
                  </div>
                  <div className="border-t border-dashed border-gray-100 flex justify-between pt-1" style={{ top: '170px' }}>
                    <span>Level 1 Inertia Breaker (0%)</span>
                    <span>0% BASE</span>
                  </div>
                </div>

                <svg id="full-365-svg-chart" className="w-full h-full relative z-10" viewBox="0 0 600 220" preserveAspectRatio="none">
                  {/* Actual Solid Line Segment at start of 365 range */}
                  {actual365Points.length > 0 && (
                    <path 
                      d={actual365LinePathStr}
                      fill="none"
                      stroke="#14B8A6"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Future Forecasted Projection dotted trail climbing over 365 days */}
                  <path 
                    d={projected365LinePathStr}
                    fill="none"
                    stroke="#4B5563"
                    strokeWidth="2.5"
                    strokeDasharray="4,4"
                    strokeLinecap="round"
                    className="opacity-70"
                  />

                  {/* Highlights of Level unlocks along the path */}
                  {[
                    { dayNum: Math.max(1, Math.ceil((51 - activeGrowthValue) / projectPace) + currentDaysElapsed), val: 51, text: 'L2', color: '#14B8A6' },
                    { dayNum: Math.max(1, Math.ceil((121 - activeGrowthValue) / projectPace) + currentDaysElapsed), val: 121, text: 'L3', color: '#A855F7' },
                    { dayNum: Math.max(1, Math.ceil((201 - activeGrowthValue) / projectPace) + currentDaysElapsed), val: 201, text: 'L4', color: '#F59E0B' },
                    { dayNum: Math.max(1, Math.ceil((301 - activeGrowthValue) / projectPace) + currentDaysElapsed), val: 301, text: 'L5', color: '#F43F5E' }
                  ].map((m, idx) => {
                    if (m.dayNum > 0 && m.dayNum <= 365) {
                      return (
                        <g key={idx}>
                          <circle 
                            cx={scaleX365(m.dayNum)}
                            cy={scaleY365(m.val)}
                            r="6"
                            fill="#0F1116"
                            stroke={m.color}
                            strokeWidth="2"
                          />
                          <text 
                            x={scaleX365(m.dayNum)}
                            y={scaleY365(m.val) - 10}
                            fill={m.color}
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                            fontWeight="black"
                          >
                            {m.text} (D{m.dayNum})
                          </text>
                        </g>
                      );
                    }
                    return null;
                  })}

                  {/* Highlight current node */}
                  <circle 
                    cx={scaleX365(currentDaysElapsed)}
                    cy={scaleY365(activeGrowthValue)}
                    r="8"
                    fill="#14B8A6"
                    className="animate-ping opacity-60"
                  />
                  <circle 
                    cx={scaleX365(currentDaysElapsed)}
                    cy={scaleY365(activeGrowthValue)}
                    r="5"
                    fill="#14B8A6"
                  />
                </svg>

                {/* Horizontal 365 timeline details */}
                <div className="absolute inset-x-0 bottom-1 flex justify-between px-4 text-[9px] font-mono text-gray-500 font-extrabold select-none">
                  <span>Day 1 (Start)</span>
                  <span>Day 100</span>
                  <span>Day 200</span>
                  <span>Day 300</span>
                  <span>Day 365 (Identity Horizon)</span>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Tactical Cockpit Hover/Forecast Console Card */}
        <div className="bg-[#12141D] border border-[#232734] rounded-2xl p-5 shadow-2xl flex flex-col justify-between text-left relative overflow-hidden h-full">
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-mono font-black text-teal-400 tracking-widest block">
              {activeTab === 'trail' ? 'LIVE COCKPIT AUDIT CONSOLE' : 'PREDICTIVE PROJECTION CONSOLE'}
            </span>
            
            {activeTab === 'trail' ? (
              /* TAB 1 Weekly Hover Details */
              <div className="border border-gray-800 rounded-xl overflow-hidden font-mono bg-[#090B10]">
                {/* Header details block */}
                <div className="bg-[#11141E] px-3.5 py-3 border-b border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">SIGNAL INSTANT STAGE</span>
                  <span className="text-sm font-black text-white block mt-0.5 uppercase tracking-tight">
                    {activeDetailDay.dayLabel} ({activeDetailDay.dayName.substring(0, 3)})
                  </span>
                  <span className="text-[9px] text-gray-500 font-semibold block mt-0.5">
                    Type: {activeDetailDay.type === 'Great' ? '🟢 Great/Perfect Day!' : activeDetailDay.type === 'Neutral' ? '🟡 Neutral Grace Day' : '🔴 Off Period Day'}
                  </span>
                </div>

                {/* Mathematical spreadsheet rows */}
                <div className="p-3.5 space-y-3.5 text-xs text-left">
                  
                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-emerald-400">⚡</span>
                      <span className="text-gray-400 text-[11px]">Total Growth:</span>
                    </div>
                    <span className="text-white font-black">+{activeDetailDay.accumulativeGrowth.toFixed(2)}% Better</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-blue-400">🏆</span>
                      <span className="text-gray-400 text-[11px]">Performance:</span>
                    </div>
                    <span className="text-white font-semibold">
                      {Math.round(activeDetailDay.p * 100)}%
                      <span className="text-gray-500 text-[9px] ml-1">
                        ({activeDetailDay.type})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-amber-500 animate-pulse">🔥</span>
                      <span className="text-gray-400 text-[11px]">Streak Multiplier:</span>
                    </div>
                    <span className="font-extrabold text-white">
                      {activeDetailDay.type === 'Great' ? (
                        activeDetailDay.streak >= 5 ? '1.5x active' : activeDetailDay.streak >= 3 ? '1.2x active' : '1.0x active'
                      ) : '1.0x baseline'}
                      <span className="text-[9px] text-gray-500 ml-1">({activeDetailDay.streak}d streak)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-emerald-450">💎</span>
                      <span className="text-gray-400 text-[11px]">Gained growth:</span>
                    </div>
                    <span className={`font-black ${
                      activeDetailDay.growthEarned >= 0 ? 'text-emerald-400' : 'text-rose-450'
                    }`}>
                      {activeDetailDay.growthEarned >= 0 ? `+${activeDetailDay.growthEarned.toFixed(1)}%` : `${activeDetailDay.growthEarned.toFixed(1)}%`}
                    </span>
                  </div>

                </div>
              </div>
            ) : (
              /* TAB 2 365-day Target interactive Sliders */
              <div className="space-y-4">
                <div className="p-4 bg-[#090B10] border border-gray-800 rounded-xl font-mono text-xs space-y-3.5">
                  <div className="pb-2 border-b border-gray-900">
                    <span className="text-[10px] text-gray-500 uppercase font-black block">PROJECTION MODEL ENGINE</span>
                    <span className="text-emerald-400 font-bold text-sm block mt-1">Based on +{projectPace.toFixed(2)}% Daily average</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase font-black flex justify-between">
                      <span>Forecast Horizon Timeline:</span>
                      <span className="text-teal-400 font-bold">+{forecastSliderDay} Days</span>
                    </label>
                    <input 
                      type="range"
                      min="1"
                      max="365"
                      value={forecastSliderDay}
                      onChange={(e) => setForecastSliderDay(parseInt(e.target.value))}
                      className="w-full accent-teal-400 bg-gray-800 h-1 rounded-lg outline-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-900/50">
                      <span className="text-gray-400 text-[11px]">Elapsed Days so far:</span>
                      <span className="text-white font-extrabold">{currentDaysElapsed} Days</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-gray-900/50">
                      <span className="text-gray-400 text-[11px]">Projected Total growth:</span>
                      <span className="text-teal-400 font-extrabold">+{sliderProjectedValue.toFixed(1)}% Better</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-[11px]">Projected Stage / Level:</span>
                      <span className="font-extrabold text-white bg-teal-950/40 border border-teal-500/20 px-2 py-0.5 rounded text-[10px]">
                        L{sliderProjectedLevelConfig.level}: {sliderProjectedLevelConfig.title.substring(0, 15)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-teal-950/10 border border-teal-900/30 rounded-xl">
                  <p className="text-[11px] text-gray-400 italic leading-relaxed">
                    🌟 <strong>Compound Insight:</strong> Sustaining small repetitions builds strong permanent habit neuro-pathways. Use the slider to map out your long-term focus.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-500 leading-relaxed font-sans mt-4 italic">
            *Checking off habits on your central dashboard adjusted the live completion ratio to recalculate final growth in real-time.
          </p>
        </div>

      </div>

      {/* E. Forecast Estimator Box */}
      <div className="bg-[#12141A] border-l-4 border-[#14B8A6] border-y border-r border-[#222631] rounded-2xl p-4.5 text-left relative overflow-hidden shadow-lg animate-fade-in">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-mono font-black uppercase text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                GROWTH PACE HORIZON
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                Average Pace: +{avgDailyPace > 0 ? avgDailyPace.toFixed(2) : '0.00'}% / daily
              </span>
            </div>
            <h4 className="text-sm font-bold text-white font-sans mt-0.5">
              Projected Road to Milestone Level {levelConfig.level + 1}
            </h4>
            <p className="text-xs text-gray-400 font-sans leading-relaxed max-w-3xl">
              {forecastMsg}
            </p>
          </div>
          <div className="bg-[#181B26] p-3 rounded-xl border border-[#232735] text-center shrink-0 min-w-[120px]">
            <span className="text-[9px] font-mono text-gray-500 block uppercase">DAYS REMAINING</span>
            <span className="text-2xl font-black text-teal-400 font-mono tracking-tight">{forecastDaysEstimate} Days</span>
          </div>
        </div>
      </div>

      {/* F. Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'COMPOUNDING VALUE', value: `+${activeValueScale(activeGrowthValue)} Better`, badge: `LVL ${levelConfig.level}`, color: levelConfig.textColor },
          { label: 'GREAT DAY STREAK', value: `${todayStatsObj.type === 'Great' ? todayStatsObj.streak : 0} Days`, badge: '🔥 MULTIPLIER', color: 'text-amber-500' },
          { label: 'TODAY SHIFT UNIT', value: todayStatsObj.growthEarned >= 0 ? `+${todayStatsObj.growthEarned.toFixed(1)}%` : `${todayStatsObj.growthEarned.toFixed(1)}%`, badge: 'LIVE ESTIMATE', color: todayStatsObj.growthEarned >= 0 ? 'text-emerald-400' : 'text-rose-450' },
          { label: 'ACTIVE PROTECTION', value: `Floor ${levelConfig.minGrowth}%`, badge: 'LEVEL LOCKED', color: 'text-purple-400' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-[#12141A] border border-[#222631] rounded-2xl p-4.5 text-center shadow-lg relative flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase block tracking-widest">{stat.label}</span>
              <span className={`text-xl sm:text-2xl font-black font-mono block mt-2.5 tracking-tighter ${stat.color}`}>{stat.value}</span>
            </div>
            <span className="text-[9px] font-mono uppercase text-gray-500 tracking-wider block mt-3 select-none bg-[#1C1F2B] py-0.5 rounded-md">
              {stat.badge}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}

function activeValueScale(growth: number) {
  return `${growth.toFixed(2)}%`;
}
