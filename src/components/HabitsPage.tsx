import React, { useState, useEffect } from 'react';
import { 
  Zap, Clock, Repeat, Flame, Plus, Check, Play, Pause, RotateCcw, 
  ChevronLeft, ChevronRight, Calendar, ArrowLeft, MoreVertical, Trash2,
  Dumbbell, BookOpen, Heart, Brain, Navigation, Sparkles, AlertCircle
} from 'lucide-react';
import { Habit, Category, Routine } from '../types';
import { dateToday } from '../data';
import CategoryDetailView from './CategoryDetailView';

const getCategoryConfigInPage = (category: Category) => {
  switch (category) {
    case 'Fitness':
      return {
        color: '#12B886',
        borderClass: 'border-l-[5px] border-l-[#12B886]',
        textColor: 'text-[#12B886]',
        bgClass: 'bg-[#12B886]/10 text-[#12B886]',
        progressBarClass: 'bg-[#12B886]',
        icon: Dumbbell
      };
    case 'Reading':
      return {
        color: '#FD7E14',
        borderClass: 'border-l-[5px] border-l-[#FD7E14]',
        textColor: 'text-[#FD7E14]',
        bgClass: 'bg-[#FD7E14]/10 text-[#FD7E14]',
        progressBarClass: 'bg-[#FD7E14]',
        icon: BookOpen
      };
    case 'Productivity':
      return {
        color: '#FCC419',
        borderClass: 'border-l-[5px] border-l-[#FCC419]',
        textColor: 'text-[#FCC419]',
        bgClass: 'bg-[#FCC419]/10 text-[#FCC419]',
        progressBarClass: 'bg-[#FCC419]',
        icon: Zap
      };
    case 'Health':
      return {
        color: '#228BE6',
        borderClass: 'border-l-[5px] border-l-[#228BE6]',
        textColor: 'text-[#339AF0]',
        bgClass: 'bg-[#228BE6]/10 text-[#228BE6]',
        progressBarClass: 'bg-[#228BE6]',
        icon: Heart
      };
    case 'Mindfulness':
      return {
        color: '#845EF7',
        borderClass: 'border-l-[5px] border-l-[#845EF7]',
        textColor: 'text-[#B197FC]',
        bgClass: 'bg-[#845EF7]/10 text-[#B197FC]',
        progressBarClass: 'bg-[#845EF7]',
        icon: Brain
      };
    case 'Study':
      return {
        color: '#20C997',
        borderClass: 'border-l-[5px] border-l-[#20C997]',
        textColor: 'text-[#20C997]',
        bgClass: 'bg-[#20C997]/10 text-[#20C997]',
        progressBarClass: 'bg-[#20C997]',
        icon: Sparkles
      };
    case 'Social':
      return {
        color: '#B54708',
        borderClass: 'border-l-[5px] border-l-[#B54708]',
        textColor: 'text-[#B54708]',
        bgClass: 'bg-[#B54708]/10 text-[#B54708]',
        progressBarClass: 'bg-[#B54708]',
        icon: Navigation
      };
    default:
      return {
        color: '#868E96',
        borderClass: 'border-l-[5px] border-l-[#868E96]',
        textColor: 'text-[#868E96]',
        bgClass: 'bg-gray-800 text-gray-400',
        progressBarClass: 'bg-[#868E96]',
        icon: Sparkles
      };
  }
};

const getHabitTimeframeLocal = (habit: Habit, routines: Routine[]): 'Morning' | 'Evening' | 'Night' | 'Anytime' => {
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

  return 'Anytime';
};

interface HabitsPageProps {
  habits: Habit[];
  routines: Routine[];
  onLogHabit: (id: string, value: number) => void;
  onDeleteHabit: (id: string) => void;
  deletingHabitId: string | null;
  openCreateHabit: () => void;
  openCreateRoutine: () => void;
  // Navigation inside routine detail
  selectedRoutineId: string | null;
  setSelectedRoutineId: (id: string | null) => void;
  // Category detail navigation
  selectedCategoryId: Category | null;
  setSelectedCategoryId: (cat: Category | null) => void;
}

export default function HabitsPage({
  habits,
  routines,
  onLogHabit,
  onDeleteHabit,
  deletingHabitId,
  openCreateHabit,
  openCreateRoutine,
  selectedRoutineId,
  setSelectedRoutineId,
  selectedCategoryId,
  setSelectedCategoryId
}: HabitsPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'routines'>('all');
  const [selectedFilter, setSelectedFilter] = useState<'active' | 'completed'>('active');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);

  // Input states for customized logs
  const [customLogs, setCustomLogs] = useState<{ [key: string]: string }>({});

  // Active Focus Timer ID
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Manage clock countdown ticker for focus timers
  useEffect(() => {
    let timerId: any = null;
    if (isTimerRunning && activeTimerId && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            // Auto log the completed timer increment
            const habitObj = habits.find(h => h.id === activeTimerId);
            if (habitObj) {
              onLogHabit(habitObj.id, habitObj.target);
            }
            alert(`Focus Session Completed for ${habitObj?.name}! Earned ⚡ ${habitObj?.points} pts!`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isTimerRunning, activeTimerId, timeLeft, habits, onLogHabit]);

  const startTimer = (habitId: string, durationMin: number) => {
    setActiveTimerId(habitId);
    setTimeLeft(durationMin * 60);
    setIsTimerRunning(true);
  };

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

  // Filter logic
  const filteredHabits = habits.filter((h) => {
    const progressVal = h.history[dateToday] || 0;
    const isCompleted = progressVal >= h.target;

    // Filter by completed state
    const matchesFilter = selectedFilter === 'active' ? !isCompleted : isCompleted;
    // Filter by category
    const matchesCategory = selectedCategory === 'All' || h.category === selectedCategory;

    return matchesFilter && matchesCategory;
  });

  const remainingCount = habits.filter((h) => (h.history[dateToday] || 0) < h.target).length;

  const handleCustomLogSubmit = (e: React.FormEvent, habitId: string) => {
    e.preventDefault();
    const val = Number(customLogs[habitId] || 0);
    if (val > 0) {
      onLogHabit(habitId, val);
      setCustomLogs((prev) => ({ ...prev, [habitId]: '' }));
    }
  };

  // Render a specific Category's Detail view (Image 13 style)
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

  // Render a specific Routine's Timeline Detail view (Image 11 style)
  if (selectedRoutineId) {
    const routineObj = routines.find(r => r.id === selectedRoutineId);
    if (!routineObj) {
      setSelectedRoutineId(null);
      return null;
    }

    const routineHabits = habits.filter(h => routineObj.habitIds.includes(h.id));
    const completedCountInRt = routineHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
    const totalCountInRt = routineHabits.length;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Navigator */}
        <button
          onClick={() => setSelectedRoutineId(null)}
          className="flex items-center text-sm font-semibold text-gray-400 hover:text-white transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span>Back to Routines</span>
        </button>

        {/* Routine Title Headers */}
        <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full blur-xl" />
          
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded uppercase">
                {routineObj.timeBlock} Block
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-2.5 font-sans leading-tight">
                {routineObj.name}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 font-mono block">ROUTINE AWARD</span>
              <span className="text-lg font-bold text-[#FCC419] font-sans">⚡ {routineObj.points} pts</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#1C1F2B] pt-5">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase block">7-Day Consistency</span>
              <span className="text-2xl font-black text-white font-mono mt-0.5">14%</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Today&apos;s Progress</span>
              <span className="text-2xl font-black text-[#12B886] font-mono mt-0.5">
                {completedCountInRt}/{totalCountInRt} Done
              </span>
            </div>
          </div>
        </div>

        {/* Steps Timeline (Image 11 style) */}
        <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider font-sans mb-6">
            Routine Steps Order
          </h3>

          <div className="space-y-6 relative pl-8 border-l-2 border-[#1E2332]">
            {routineHabits.map((item, idx) => {
              const valToday = item.history[dateToday] || 0;
              const isCompleted = valToday >= item.target;
              const remaining = Math.max(0, item.target - valToday);

              return (
                <div key={item.id} className="relative group">
                  {/* Step Ring Bullet */}
                  <div className={`absolute -left-[41px] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 border-transparent text-white'
                      : 'bg-[#12141D] border-[#2E3547] text-gray-500'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-mono font-bold">{idx + 1}</span>}
                  </div>

                  {/* Habit Row Card */}
                  <div className="bg-[#1A1C24] border border-[#272B36] hover:border-purple-500/20 rounded-xl p-4 transition duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-mono text-[#12B886] uppercase bg-[#12B886]/10 px-1.5 py-0.2 rounded font-bold border border-[#12B886]/10">
                          {item.category}
                        </span>
                        {isCompleted && (
                          <span className="text-[9px] font-sans text-emerald-400 font-semibold uppercase bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/25">
                            Completed Step
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white mt-1.5 font-sans">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {remaining} {item.unit} remaining of {item.target} {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => onDeleteHabit(item.id)}
                        disabled={deletingHabitId !== null}
                        title="Delete Habit"
                        className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingHabitId === item.id ? (
                          <RotateCcw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>

                      {!isCompleted ? (
                        <>
                          <button
                            onClick={() => onLogHabit(item.id, Math.ceil(item.target / 3))}
                            className="bg-[#21242E] hover:bg-[#2C3140] text-xs font-bold text-gray-200 px-3.5 py-2 rounded-lg cursor-pointer transition"
                          >
                            +{Math.ceil(item.target / 3)}
                          </button>
                          <button
                            onClick={() => onLogHabit(item.id, remaining)}
                            className="bg-[#12B886]/12 hover:bg-[#12B886]/25 border border-[#12B886]/25 text-xs font-bold text-[#12B886] px-4 py-2 rounded-lg cursor-pointer transition"
                          >
                            Mark Complete
                          </button>
                        </>
                      ) : (
                        <span className="text-emerald-400 text-xs font-semibold flex items-center pr-2">
                          <Check className="w-4 h-4 mr-1 stroke-[3px]" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Category filter row across the top (Image 1 and 2 style) */}
      <div className="flex flex-nowrap items-center gap-2 border-b border-[#1A1D24] pb-4 overflow-x-auto scrollbar-hide py-1">
        {(['All', 'Health', 'Fitness', 'Study', 'Reading', 'Productivity', 'Mindfulness', 'Social'] as const).map((cat) => {
          const isActive = selectedCategory === cat;
          const progress = cat !== 'All' ? getCategoryStats(cat as any) : 0;
          return (
            <button
              key={cat}
              onClick={() => {
                if (cat === 'All') {
                  setSelectedCategory('All');
                } else {
                  setSelectedCategory(cat);
                }
              }}
              className={`flex-shrink-0 flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 ${
                selectedCategory === cat
                  ? 'bg-[#181C24] border border-[#2E3547] text-white shadow-lg'
                  : 'bg-[#121419]/60 border border-transparent text-gray-400 hover:text-white hover:bg-[#1A1C24]'
              }`}
            >
              <span>{cat}</span>
              {cat !== 'All' && (
                <span className="text-[10px] font-mono text-gray-500 font-bold bg-[#1B1E29] rounded px-1.5 py-0.5">
                  {progress}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Page Actions Header */}
      <div className="flex items-center justify-between gap-4">
        {/* Toggle subtabs: All habits | Routines */}
        <div className="flex space-x-1 bg-[#12141A] border border-[#212431] p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 ${
              activeSubTab === 'all'
                ? 'bg-[#1E212E] text-white border border-[#2F3446]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All habits
          </button>
          <button
            onClick={() => setActiveSubTab('routines')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 ${
              activeSubTab === 'routines'
                ? 'bg-[#1E212E] text-white border border-[#2F3446]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Routines
          </button>
        </div>

        {/* Floating action buttons */}
        <div className="flex items-center space-x-3">
          {activeSubTab === 'routines' && (
            <button
              onClick={openCreateRoutine}
              className="flex items-center space-x-1.5 bg-transparent hover:bg-gray-800/10 border border-[#12B886]/30 text-[#12B886] font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Routine</span>
            </button>
          )}
          <button
            onClick={openCreateHabit}
            className="flex items-center space-x-1.5 bg-[#12B886] hover:bg-[#0E906B] text-[#0A0D10] font-extrabold text-xs px-4.5 py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-emerald-500/15"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>New habit</span>
          </button>
        </div>
      </div>

      {/* 3. Filter Secondary Category Row: Active vs Completed */}
      {activeSubTab === 'all' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 select-none">
          <div className="flex space-x-2.5">
            <button
              onClick={() => setSelectedFilter('active')}
              className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition duration-150 ${
                selectedFilter === 'active'
                  ? 'bg-[#181C25] border border-emerald-500/15 text-white shadow-lg'
                  : 'bg-[#12141A]/60 border border-transparent text-gray-400 hover:text-white hover:bg-[#1A1C41] hover:text-[#12B886]'
              }`}
            >
              <span>Active</span>
              <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-extrabold ${selectedFilter === 'active' ? 'bg-[#12B886]/10 text-[#12B886]' : 'bg-gray-800 text-gray-400'}`}>
                {remainingCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedFilter('completed')}
              className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition duration-150 ${
                selectedFilter === 'completed'
                  ? 'bg-[#181C25] border border-emerald-500/15 text-white shadow-lg'
                  : 'bg-[#12141A]/60 border border-transparent text-gray-400 hover:text-white hover:bg-[#1A1C41] hover:text-[#12B886]'
              }`}
            >
              <span>Completed</span>
              <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-extrabold ${selectedFilter === 'completed' ? 'bg-[#12B886]/10 text-[#12B886]' : 'bg-gray-800 text-gray-400'}`}>
                {habits.length - remainingCount}
              </span>
            </button>
          </div>

          <span className="text-xs font-mono font-medium text-gray-500 uppercase tracking-widest self-center pr-1">
            {remainingCount} remaining
          </span>
        </div>
      )}

      {/* Divide Line */}
      {activeSubTab === 'all' && <hr className="border-[#1C1F2B]" />}

      {/* 4. Main Body: Structured grid listings grouped by timeframe (Match exact image style) */}
      {activeSubTab === 'all' ? (
        <div className="space-y-8">
          {(() => {
            const timeframes: { id: 'Morning' | 'Evening' | 'Night' | 'Anytime'; label: string }[] = [
              { id: 'Anytime', label: 'ANYTIME' },
              { id: 'Morning', label: 'MORNING' },
              { id: 'Evening', label: 'EVENING' },
              { id: 'Night', label: 'NIGHT' }
            ];

            const renderedBlocks = timeframes.map((tf) => {
              const groupHabits = filteredHabits.filter(h => getHabitTimeframeLocal(h, routines) === tf.id);
              if (groupHabits.length === 0) return null;

              return (
                <div key={tf.id} className="space-y-4">
                  {/* Timeframe section heading */}
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono select-none">
                    {tf.label}
                  </h3>

                  {/* 3 Column Grid as requested & shown in image */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groupHabits.map((item) => {
                      const progressVal = item.history[dateToday] || 0;
                      const percentage = Math.min(100, Math.round((progressVal / item.target) * 100));
                      const isCompleted = progressVal >= item.target;
                      const remaining = Math.max(0, item.target - progressVal);
                      const isExpanded = expandedHabitId === item.id;

                      const config = getCategoryConfigInPage(item.category);
                      const shortcutValues = item.type === 'Timer' ? [10, 15, 30] : [1, 3, 5];

                      return (
                        <div
                          key={item.id}
                          className="bg-[#12141A] border border-[#222631] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between hover:border-gray-700/60 transition group border-l-[5px]"
                          style={{ borderLeftColor: config.color }}
                        >
                          {/* Inner container */}
                          <div className="space-y-3">
                            {/* Card Name */}
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-base font-extrabold text-white tracking-tight leading-tight">
                                {item.name}
                              </h4>

                              <div className="flex items-center space-x-1 shrink-0">
                                {/* Toggle Options dots to trigger inline timers manual custom values */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedHabitId(isExpanded ? null : item.id)}
                                  title="Adjust timers or configure"
                                  className={`text-gray-500 group-hover:text-gray-300 p-1 rounded-lg hover:bg-[#1C1F2B] transition ${isExpanded ? 'bg-gray-800 text-white' : ''}`}
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {/* Direct delete option */}
                                <button
                                  type="button"
                                  onClick={() => onDeleteHabit(item.id)}
                                  disabled={deletingHabitId !== null}
                                  title="Delete Habit"
                                  className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-red-400 px-2 py-1 rounded-lg border border-gray-800 hover:border-red-500/30 hover:bg-red-500/10 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingHabitId === item.id ? (
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>{deletingHabitId === item.id ? 'Deleting' : 'Delete'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Row of Badges (Image style badges) */}
                            <div className="flex flex-wrap items-center gap-1.5 select-none text-[9px] font-mono font-bold">
                              {/* Category Banner Badge */}
                              <span 
                                className="tracking-widest uppercase px-1.5 py-0.5 border rounded" 
                                style={{ 
                                  color: config.color, 
                                  borderColor: `${config.color}25`, 
                                  backgroundColor: `${config.color}08` 
                                }}
                              >
                                {item.category}
                              </span>

                              {/* Points Reward badge */}
                              <span className="flex items-center px-1.5 py-0.5 border border-[#FCC419]/25 bg-[#FCC419]/05 text-[#FCC419] rounded">
                                <Zap className="w-3 h-3 mr-0.5 fill-[#FCC419]" /> {item.points}
                              </span>

                              {/* Target Time/TimeOfDay */}
                              <span className="flex items-center px-1.5 py-0.5 border border-gray-800 bg-gray-900/10 text-gray-500 rounded">
                                <Clock className="w-3 h-3 mr-0.5" /> {item.timeOfDay || 'Anytime'}
                              </span>

                              {/* Repeat frequency */}
                              <span className="flex items-center px-1.5 py-0.5 border border-gray-800 bg-gray-900/10 text-gray-500 rounded">
                                <Repeat className="w-3 h-3 mr-0.5" /> {item.repeat === 'Daily' ? 'daily' : item.repeat.toLowerCase()}
                              </span>
                            </div>

                            {/* Progress percentage line */}
                            <div className="flex justify-between items-center text-xs font-bold mt-4 select-none">
                              <span style={{ color: config.color }} className="font-sans">{percentage}%</span>
                              <span className="text-gray-500 font-mono font-medium">{remaining} {item.unit} left</span>
                            </div>

                            {/* Thin elegant slider bar */}
                            <div className="w-full h-1 bg-[#171924]/90 border border-[#212431]/80 rounded-full overflow-hidden relative">
                              <div
                                className="h-full transition-all duration-300 rounded-full"
                                style={{ width: `${percentage}%`, backgroundColor: config.color }}
                              />
                            </div>

                            {/* Shortcut log action buttons (Image style +1, +3, +5 options) */}
                            <div className="flex gap-2 pt-1 select-none">
                              {shortcutValues.map((val) => (
                                <button
                                  key={val}
                                  onClick={() => onLogHabit(item.id, val)}
                                  className="border border-[#12B886]/15 bg-[#12B886]/03 text-[#12B886] hover:bg-[#12B886]/10 py-3 min-h-[44px] rounded-xl flex-1 text-xs font-extrabold cursor-pointer transition duration-150 font-mono text-center active:scale-95"
                                >
                                  +{val}{item.type === 'Timer' ? 'm' : ''}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Button: Finish/Complete Habit */}
                          <div className="mt-3 relative z-10">
                            {isCompleted ? (
                              <div className="w-full bg-[#12B886]/10 border border-[#12B886]/30 text-[#12B886] py-3 min-h-[44px] px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5 select-none hover:bg-[#12B886]/15 transition duration-150">
                                <Check className="w-4 h-4 stroke-[3px]" />
                                <span>Done for Today! 🎉</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onLogHabit(item.id, remaining)}
                                className="w-full bg-[#12b886]/10 hover:bg-[#12b886]/20 border border-[#12b886]/30 hover:border-[#12b886]/50 text-[#12b886] py-3 min-h-[44px] px-3 rounded-xl text-xs font-extrabold cursor-pointer transition duration-150 text-center flex items-center justify-center space-x-1.5 select-none active:scale-95"
                              >
                                <Check className="w-4 h-4 stroke-[3px]" />
                                <span>Complete Habit</span>
                                <span className="text-[10px] font-mono opacity-80">(+{remaining} {item.unit})</span>
                              </button>
                            )}
                          </div>

                          {/* Expanded custom tools panel for timer inline details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[#1C1F2B]/80 space-y-3 animate-in fade-in duration-100 select-none">
                              {item.enableFocusTimer && (
                                <div className="bg-[#181C26] border border-[#242A3A] rounded-xl p-2 flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-1 px-2 rounded bg-[#12B886]/10 text-[#12B886] font-mono text-xs font-bold">
                                      {activeTimerId === item.id ? (
                                        `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
                                      ) : (
                                        `${item.target}m`
                                      )}
                                    </div>
                                    <span className="text-[9px] font-mono tracking-wider text-gray-500 uppercase">Focus Timer</span>
                                  </div>

                                  <div className="flex items-center space-x-1.5">
                                    {activeTimerId === item.id && isTimerRunning ? (
                                      <button
                                        type="button"
                                        onClick={() => setIsTimerRunning(false)}
                                        className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-500 p-1 rounded"
                                      >
                                        <Pause className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => startTimer(item.id, item.target)}
                                        className="bg-[#12B886]/10 border border-[#12B886]/30 text-[#12B886] p-1 rounded"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTimerId(null);
                                        setIsTimerRunning(false);
                                        setTimeLeft(0);
                                      }}
                                      className="bg-gray-800 border border-gray-750 text-gray-400 p-1 rounded"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-[10px] text-gray-500">
                                <span>Unit: {item.unit}</span>
                                <div className="flex items-center space-x-3">
                                  <button
                                    type="button"
                                    onClick={() => onDeleteHabit(item.id)}
                                    disabled={deletingHabitId !== null}
                                    className="text-red-400 hover:underline font-bold font-sans cursor-pointer flex items-center space-x-1 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {deletingHabitId === item.id ? (
                                      <RotateCcw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                    <span>{deletingHabitId === item.id ? 'Deleting...' : 'Delete Habit'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onLogHabit(item.id, remaining)}
                                    className="text-emerald-400 hover:underline font-bold font-sans cursor-pointer bg-none border-b border-transparent"
                                  >
                                    Force Today Complete &rarr;
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });

            const hasAnyBlocks = renderedBlocks.some(b => b !== null);

            return hasAnyBlocks ? renderedBlocks : (
              <div className="col-span-full h-64 bg-[#121419]/70 border border-dashed border-[#222631] text-center p-12 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-3xl">🧘</span>
                <h3 className="text-base font-bold text-white font-sans mt-3">All habits filtered out</h3>
                <p className="text-xs text-gray-500 font-sans mt-1">
                  Adjust active filter category presets or create a new habit.
                </p>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Routines SubTab Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {routines.map((rt) => {
            const rtHabits = habits.filter(h => rt.habitIds.includes(h.id));
            const doneInRt = rtHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
            const totalInRt = rtHabits.length;
            const progress = totalInRt > 0 ? Math.round((doneInRt / totalInRt) * 100) : 0;

            return (
              <div
                key={rt.id}
                onClick={() => setSelectedRoutineId(rt.id)}
                className="bg-[#12141A] hover:bg-[#1A1D28] border border-[#222631] hover:border-purple-500/20 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest text-[#B197FC] font-semibold bg-[#B197FC]/5 border border-[#B197FC]/15 px-2.5 py-0.5 rounded uppercase">
                      {rt.timeBlock} Block
                    </span>
                    <span className="text-xs text-[#FCC419] font-mono">
                      ⚡ {rt.points} Bonus
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-sans text-white mt-4">
                    {rt.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {doneInRt} active / {totalInRt} total habits done
                  </p>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between items-baseline text-xs mb-1.5 font-semibold font-mono">
                    <span className="text-[#B197FC]">{progress}% Done</span>
                    <span className="text-gray-500">{doneInRt}/{totalInRt} done</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#171924]/80 rounded-full overflow-hidden border border-[#222631]">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
