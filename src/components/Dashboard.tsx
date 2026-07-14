import React, { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Zap, AlertTriangle, ArrowUpRight, TrendingUp, Dumbbell, BookOpen, Brain, Sparkles, CheckCircle2, Navigation, Clock, Check, ChevronRight, X, Target, Heart, Moon, GripVertical, Flame, Sun, Pencil, Plus, Trash2, ListTodo } from 'lucide-react';
import { Habit, Category, Routine } from '../types';
import { calculateMomentum, dateToday, getDailyTaskCounts, getStandaloneHabits, getRoutineHabits, formatDateString } from '../data';
import CategoryDetailView from './CategoryDetailView';

type LogHabitHandler = (id: string, value: number) => void | Promise<void>;

// ─── DAILY TODO TYPES ─────────────────────────────────────────────────────────

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────

const getCategoryColor = (category: Category): string => {
  switch (category) {
    case 'Fitness':     return '#12B886'; // Emerald
    case 'Reading':     return '#339AF0'; // Blue
    case 'Diet':        return '#FD7E14'; // Orange
    case 'Skill':       return '#FCC419'; // Amber
    case 'Mindset':     return '#845EF7'; // Purple
    case 'Rest':        return '#06B6D4'; // Cyan
    default:            return '#868E96';
  }
};

const getCategoryEmoji = (category: Category): string => {
  switch (category) {
    case 'Fitness':     return '🏃';
    case 'Reading':     return '📚';
    case 'Diet':        return '🥗';
    case 'Skill':       return '🎯';
    case 'Mindset':     return '🧘';
    case 'Rest':        return '😴';
    default:            return '⭐';
  }
};

const getHabitTimeframe = (habit: Habit, routines: Routine[]): 'Morning' | 'Evening' | 'Night' | 'Anytime' => {
  const parentRoutine = routines.find(r => r.habitIds.includes(habit.id) || habit.routineId === r.id);
  if (parentRoutine) {
    if (parentRoutine.timeBlock === 'Morning') return 'Morning';
    if (parentRoutine.timeBlock === 'Evening') return 'Evening';
    if (parentRoutine.timeBlock === 'Night') return 'Night';
    return 'Anytime';
  }
  if (habit.timeOfDay) {
    const tod = habit.timeOfDay.toLowerCase().trim();
    if (tod === 'anytime' || tod === 'constant' || tod === 'none') return 'Anytime';
    const match = tod.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (match) {
      let clockHour = parseInt(match[1], 10);
      const meridiem = match[3];
      if (meridiem === 'pm' && clockHour < 12) clockHour += 12;
      if (meridiem === 'am' && clockHour === 12) clockHour = 0;
      if (clockHour >= 4 && clockHour < 12) return 'Morning';
      if (clockHour >= 12 && clockHour < 18) return 'Evening';
      return 'Night';
    }
    if (tod.includes('morning')) return 'Morning';
    if (tod.includes('evening') || tod.includes('afternoon')) return 'Evening';
    if (tod.includes('night')) return 'Night';
  }
  return 'Anytime';
};

const getQuickHabitConfig = (category: Category) => {
  switch (category) {
    case 'Fitness':     return { color: '#12B886', icon: Dumbbell };
    case 'Reading':     return { color: '#339AF0', icon: BookOpen };
    case 'Diet':        return { color: '#FD7E14', icon: Heart };
    case 'Skill':       return { color: '#FCC419', icon: Target };
    case 'Mindset':     return { color: '#845EF7', icon: Brain };
    case 'Rest':        return { color: '#06B6D4', icon: Moon };
    default:            return { color: '#868E96', icon: Sparkles };
  }
};

const getCategoryLabel = (category: Category): string => {
  switch (category) {
    case 'Fitness': return 'Fit';
    case 'Reading': return 'Read';
    case 'Diet':    return 'Diet';
    case 'Skill':   return 'Skil';
    case 'Mindset': return 'Mind';
    case 'Rest':    return 'Rest';
    default:        return (category as string).slice(0, 4);
  }
};

const isHabitCompleteToday = (habit: Habit): boolean =>
  (habit.history[dateToday] || 0) >= habit.target;

const getRoutineProgressToday = (routine: Routine, habits: Habit[]) => {
  const routineHabits = getRoutineHabits(routine, habits);
  const totalCount = routineHabits.length;
  const doneCount = routineHabits.filter(isHabitCompleteToday).length;
  return {
    doneCount,
    totalCount,
    progress: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
    allDone: totalCount > 0 && doneCount === totalCount,
  };
};

const getRoutineCategory = (routine: Routine, habits: Habit[]): Category => {
  const routineHabits = getRoutineHabits(routine, habits);
  if (routineHabits.length === 0) return 'Mindset';
  
  const counts = {} as Record<Category, number>;
  routineHabits.forEach(h => {
    counts[h.category] = (counts[h.category] || 0) + 1;
  });
  
  let maxCat: Category = routineHabits[0].category;
  let maxCount = 0;
  
  (Object.keys(counts) as Category[]).forEach(cat => {
    if (counts[cat]! > maxCount) {
      maxCount = counts[cat]!;
      maxCat = cat;
    }
  });
  
  return maxCat;
};


const sortCompletedLast = <T,>(items: T[], isComplete: (item: T) => boolean): T[] =>
  items
    .map((item, index) => ({ item, index, isComplete: isComplete(item) }))
    .sort((a, b) => Number(a.isComplete) - Number(b.isComplete) || a.index - b.index)
    .map(({ item }) => item);

// Returns the right timeframe tab based on the current hour
const getTimeframeFromHour = (): 'Morning' | 'Evening' | 'Night' => {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return 'Morning';
  if (h >= 12 && h < 18) return 'Evening';
  return 'Night';
};

// Time-aware greeting
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return '☀️ Good Morning';
  if (h >= 12 && h < 17) return '🌆 Good Afternoon';
  if (h >= 17 && h < 21) return '🌆 Good Evening';
  return '🌙 Good Night';
};

// Format today's date as "Saturday, 5 Jul"
const getTodayLabel = (): string => {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
};

// Format live clock HH:MM AM/PM
const formatClock = (date: Date): string => {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

// Compute per-habit daily streak (consecutive days completed)
const getHabitStreak = (habit: Habit): number => {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateString(d);
    const val = habit.history[dateStr] || 0;
    if (val >= habit.target) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

// Compute overall daily streak: days where ≥ 80% tasks were completed
const getDailyStreak = (habits: Habit[], routines: Routine[]): number => {
  let streak = 0;
  const today = new Date();
  // Skip today in streak count (only count completed past days + today if done)
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateString(d);
    const counts = getDailyTaskCounts(habits, routines, dateStr);
    const pct = counts.total > 0 ? counts.done / counts.total : 0;
    if (pct >= 0.8) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

// Get time pill label for a habit
const getTimePill = (timeframe: string): { emoji: string; label: string; color: string } | null => {
  if (timeframe === 'Morning') return { emoji: '☀️', label: 'Morning', color: '#FCC419' };
  if (timeframe === 'Evening') return { emoji: '🌆', label: 'Evening', color: '#FD7E14' };
  if (timeframe === 'Night') return { emoji: '🌙', label: 'Night', color: '#845EF7' };
  return null;
};

// Fire confetti celebration
const fireConfetti = () => {
  const count = 180;
  const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
  const fire = (particleRatio: number, opts: confetti.Options) => {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  };
  fire(0.25, { spread: 26, startVelocity: 55, colors: ['#12B886', '#06B6D4'] });
  fire(0.2, { spread: 60, colors: ['#FCC419', '#FD7E14'] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#845EF7', '#339AF0'] });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#12B886'] });
  fire(0.1, { spread: 120, startVelocity: 45, colors: ['#FCC419'] });
};

// ─── DAILY TODO MODAL ────────────────────────────────────────────────────────

interface DailyTodoModalProps {
  todos: TodoItem[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  completedCount: number;
  totalCount: number;
  progressPct: number;
}

function DailyTodoModal({ todos, onAdd, onToggle, onDelete, onClose, completedCount, totalCount, progressPct }: DailyTodoModalProps) {
  const [inputVal, setInputVal] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInputVal('');
    inputRef.current?.focus();
  };

  const allDone = totalCount > 0 && completedCount >= totalCount;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="daily-todo-modal-title">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close daily focus"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-default"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[#0F1118] border border-[#252B3A] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Glow accents */}
        <div className="absolute top-0 left-0 w-64 h-32 bg-gradient-to-br from-[#845EF7]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-[#12B886]/8 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#1E2232]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#845EF7]/15 border border-[#845EF7]/30 text-[#845EF7]">
                <ListTodo className="h-4 w-4" />
              </span>
              <h2 id="daily-todo-modal-title" className="text-base font-extrabold text-white tracking-tight">Daily Focus</h2>
              {totalCount > 0 && (
                <span className={`ml-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  allDone
                    ? 'bg-[#12B886]/15 border-[#12B886]/35 text-[#12B886]'
                    : 'bg-[#845EF7]/12 border-[#845EF7]/30 text-[#845EF7]'
                }`}>
                  {allDone ? '✓ All done' : `${completedCount}/${totalCount}`}
                </span>
              )}
            </div>
            {totalCount > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-1">
                  <span>Progress</span>
                  <span className={allDone ? 'text-[#12B886]' : 'text-[#845EF7]'}>{progressPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#181B25] rounded-full overflow-hidden border border-[#252B3A]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: allDone
                        ? 'linear-gradient(90deg, #12B886, #06B6D4)'
                        : 'linear-gradient(90deg, #845EF7, #5C7CFA)',
                      boxShadow: allDone ? '0 0 8px rgba(18,184,134,0.5)' : '0 0 8px rgba(132,94,247,0.5)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily focus modal"
            className="h-8 w-8 shrink-0 rounded-full border border-[#2B3040] bg-[#181B25] text-gray-400 hover:text-white hover:bg-[#202434] transition flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Todo List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2" style={{ minHeight: 0 }}>
          {todos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center select-none">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-sm font-semibold text-gray-400">Your day is a blank canvas.</p>
              <p className="text-xs text-gray-600 mt-1">Add your first focus task below.</p>
            </div>
          )}
          {allDone && todos.length > 0 && (
            <div className="rounded-xl bg-[#12B886]/8 border border-[#12B886]/25 px-4 py-3 flex items-center gap-3 mb-2">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-bold text-[#12B886]">All focus tasks completed!</p>
                <p className="text-[11px] text-[#12B886]/70">Awesome job today!</p>
              </div>
            </div>
          )}
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-3 rounded-xl border border-[#1E2232] bg-[#13161F] px-4 py-3 transition hover:border-[#2B3240] hover:bg-[#181B28]"
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => onToggle(todo.id)}
                aria-label={todo.completed ? `Uncheck ${todo.text}` : `Check ${todo.text}`}
                className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  todo.completed
                    ? 'bg-[#12B886] border-[#12B886] text-black'
                    : 'border-[#3A4055] hover:border-[#845EF7] hover:bg-[#845EF7]/10'
                }`}
              >
                {todo.completed && <Check className="h-2.5 w-2.5 stroke-[3px]" />}
              </button>

              {/* Text */}
              <span className={`flex-1 min-w-0 text-sm font-medium leading-snug transition-all duration-200 ${
                todo.completed ? 'line-through text-gray-600' : 'text-gray-100'
              }`}>
                {todo.text}
              </span>

              {/* Delete — hover visible */}
              <button
                type="button"
                onClick={() => onDelete(todo.id)}
                aria-label={`Delete ${todo.text}`}
                className="h-6 w-6 shrink-0 rounded-lg text-gray-700 hover:text-[#FF4757] hover:bg-[#FF4757]/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Input */}
        <div className="relative border-t border-[#1E2232] px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Add a focus task and press Enter…"
              maxLength={120}
              className="flex-1 bg-[#181B25] border border-[#252B3A] rounded-xl text-sm text-white placeholder-gray-600 px-4 py-2.5 outline-none focus:border-[#845EF7]/60 focus:ring-1 focus:ring-[#845EF7]/30 transition"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              aria-label="Add focus task"
              className="h-9 w-9 shrink-0 rounded-xl bg-[#845EF7] text-white flex items-center justify-center hover:bg-[#9775FA] transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── CATEGORY RING COMPONENT ──────────────────────────────────────────────────

interface CategoryRingProps {
  key?: any;
  category: Category;
  pct: number;
  isSelected: boolean;
  onClick: () => void;
}

function CategoryRing({ category, pct, isSelected, onClick }: CategoryRingProps): React.ReactElement {
  const color = getCategoryColor(category);
  const emoji = getCategoryEmoji(category);
  const size = 56;
  const stroke = 4;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-1 md:gap-1.5 cursor-pointer group flex-shrink-0 flex-1 md:flex-initial min-w-[50px] md:min-w-[64px] select-none"
    >
      <div 
        className={`relative flex items-center justify-center transition-all duration-300 rounded-full ${
          isSelected 
            ? 'border-2 border-[var(--color)] shadow-[0_0_10px_var(--color-glow)] scale-105' 
            : 'border-2 border-transparent'
        } p-0.5 md:p-1 w-[46px] h-[46px] md:w-[64px] md:h-[64px]`}
        style={{
          '--color': color,
          '--color-glow': `${color}cc`,
        } as React.CSSProperties}
      >
        <div className="relative animate-fade-in w-9 h-9 md:w-14 md:h-14">
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
            />
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.6s ease',
                filter: pct > 0 ? `drop-shadow(0 0 5px ${color}99)` : 'none',
              }}
            />
          </svg>
          {/* Emoji center */}
          <div
            className="absolute inset-0 flex items-center justify-center text-[14px] md:text-[18px] group-hover:scale-110 transition-transform duration-200"
          >
            {emoji}
          </div>
          {/* Active glow border */}
          {pct === 100 && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: `0 0 12px ${color}66`,
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>
      <div
        className="text-[8px] md:text-[9px] font-mono font-bold text-center leading-tight truncate max-w-[44px] md:max-w-[60px] mt-0.5"
        style={{ color: isSelected || pct > 0 ? color : 'rgba(255,255,255,0.25)' }}
      >
        {pct > 0 ? `${pct}%` : getCategoryLabel(category)}
      </div>
      <div className="text-[7px] md:text-[8px] text-center text-gray-600 truncate max-w-[44px] md:max-w-[60px]">
        {category}
      </div>
    </div>
  );
}

// ─── CATEGORY RINGS CARD ──────────────────────────────────────────────────────

interface CategoryRingsCardProps {
  categories: Category[];
  getCategoryStats: (cat: Category) => number;
  overallAvg: number;
  selectedPillar: Category | null;
  onSelectCategory: (cat: Category | null) => void;
}

function CategoryRingsCard({ categories, getCategoryStats, overallAvg, selectedPillar, onSelectCategory }: CategoryRingsCardProps) {
  if (categories.length === 0) return null;

  return (
    <div className="bg-[#14161F]/90 border border-[#232734]/80 rounded-2xl p-5 relative overflow-hidden group/pillars transition-all duration-350 hover:border-gray-800">
      {/* Title block */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-gray-400 font-sans tracking-wide">
          6 Pillars
        </h3>
        {selectedPillar && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs font-bold text-[#339AF0] hover:text-[#4dabf7] flex items-center gap-1 transition cursor-pointer select-none"
          >
            Show all <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Rings Row */}
      <div className="flex justify-between items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {categories.map(cat => (
          <CategoryRing
            key={cat}
            category={cat}
            pct={getCategoryStats(cat)}
            isSelected={selectedPillar === cat}
            onClick={() => onSelectCategory(selectedPillar === cat ? null : cat)}
          />
        ))}
      </div>

      {/* Multi-segment progress bar */}
      <div className="flex gap-1.5 mt-5">
        {categories.map(cat => {
          const pct = getCategoryStats(cat);
          const color = getCategoryColor(cat);
          return (
            <div
              key={cat}
              className="flex-1 h-1 bg-[#1A1C29] rounded-full overflow-hidden"
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: color,
                  boxShadow: pct > 0 ? `0 0 5px ${color}88` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DRAGGABLE HABIT LIST ────────────────────────────────────────────────────

interface DraggableHabitListProps {
  habits: Habit[];
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  hasRoutines: boolean;
  onReorder: (ids: string[]) => void;
  onLogHabit: (id: string, remaining: number) => void;
  routines: Routine[];
}

function DraggableHabitList({ habits, showAll, setShowAll, hasRoutines, onReorder, onLogHabit, routines }: DraggableHabitListProps) {
  const HABIT_LIMIT = 5;
  const visibleHabits = showAll ? habits : habits.slice(0, HABIT_LIMIT);
  const habitHasMore = habits.length > HABIT_LIMIT;

  const [dragState, setDragState] = useState<{ dragId: string | null; overId: string | null }>(
    { dragId: null, overId: null }
  );

  // Swipe state: { [habitId]: swipeX }
  const [swipeOffsets, setSwipeOffsets] = useState<{ [id: string]: number }>({});

  const dragIdRef = React.useRef<string | null>(null);
  const overIdRef = React.useRef<string | null>(null);
  const isDraggingRef = React.useRef(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // Swipe refs per habit
  const swipeStartX = React.useRef<{ [id: string]: number }>({});
  const swipeStartY = React.useRef<{ [id: string]: number }>({});
  const swipeActive = React.useRef<{ [id: string]: boolean }>({});
  const isSwipingRef = React.useRef<{ [id: string]: boolean }>({});

  const getHabitIdFromPoint = (y: number): string | null => {
    if (!listRef.current) return null;
    const children = Array.from(listRef.current.querySelectorAll('[data-habit-id]'));
    for (const el of children) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        return (el as HTMLElement).dataset.habitId || null;
      }
    }
    return null;
  };

  const handlePointerDown = (habitId: string) => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIdRef.current = habitId;
    overIdRef.current = habitId;
    isDraggingRef.current = true;
    setDragState({ dragId: habitId, overId: habitId });
    document.body.style.userSelect = 'none';
    document.body.style.overflow = 'hidden';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragIdRef.current) return;
    e.preventDefault();
    const hoveredId = getHabitIdFromPoint(e.clientY);
    if (hoveredId && hoveredId !== overIdRef.current) {
      overIdRef.current = hoveredId;
      setDragState(prev => ({ ...prev, overId: hoveredId }));
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    document.body.style.userSelect = '';
    document.body.style.overflow = '';
    const fromId = dragIdRef.current;
    const toId = overIdRef.current;
    dragIdRef.current = null;
    overIdRef.current = null;
    setDragState({ dragId: null, overId: null });

    if (fromId && toId && fromId !== toId) {
      const currentIds = habits.map(h => h.id);
      const fromIdx = currentIds.indexOf(fromId);
      const toIdx = currentIds.indexOf(toId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const reordered = [...currentIds];
        reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, fromId);
        onReorder(reordered);
      }
    }
  };

  // ── Swipe handlers for each card ──
  const handleCardPointerDown = (habitId: string, isCompleted: boolean) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCompleted) return;
    swipeStartX.current[habitId] = e.clientX;
    swipeStartY.current[habitId] = e.clientY;
    swipeActive.current[habitId] = true;
    isSwipingRef.current[habitId] = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCardPointerMove = (habitId: string, isCompleted: boolean) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeActive.current[habitId] || isCompleted) return;
    const dx = e.clientX - (swipeStartX.current[habitId] || 0);
    const dy = e.clientY - (swipeStartY.current[habitId] || 0);
    if (!isSwipingRef.current[habitId] && Math.abs(dy) > Math.abs(dx)) {
      swipeActive.current[habitId] = false;
      return;
    }
    if (dx > 5) isSwipingRef.current[habitId] = true;
    if (isSwipingRef.current[habitId] && dx > 0) {
      const clamped = Math.min(dx, 90);
      setSwipeOffsets(prev => ({ ...prev, [habitId]: clamped }));
    }
  };

  const handleCardPointerUp = (habitId: string, remaining: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeActive.current[habitId]) return;
    const dx = e.clientX - (swipeStartX.current[habitId] || 0);
    swipeActive.current[habitId] = false;
    isSwipingRef.current[habitId] = false;

    if (dx > 55) {
      setSwipeOffsets(prev => ({ ...prev, [habitId]: 90 }));
      setTimeout(() => {
        onLogHabit(habitId, remaining);
        setSwipeOffsets(prev => { const n = { ...prev }; delete n[habitId]; return n; });
      }, 250);
    } else {
      setSwipeOffsets(prev => { const n = { ...prev }; delete n[habitId]; return n; });
    }
  };

  return (
    <div
      className="space-y-2 md:space-y-1.5"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      ref={listRef}
    >
      {hasRoutines ? (
        <div className="flex items-center justify-between text-[11px] md:text-[9px] font-mono text-gray-600 uppercase tracking-widest font-bold px-1 pt-1.5 md:pt-1">
          <span>Individual Habits</span>
          {habits.length > 1 && <span className="text-[10px] font-normal text-gray-700 normal-case tracking-normal">Hold ⠿ to reorder · swipe → to complete</span>}
        </div>
      ) : (
        habits.length > 1 && (
          <div className="flex justify-end px-1 pt-0.5">
            <span className="text-[10px] font-mono text-gray-700">Hold ⠿ to reorder · swipe → to complete</span>
          </div>
        )
      )}
      {visibleHabits.map(item => {
        const isDragging = dragState.dragId === item.id;
        const isOver = dragState.overId === item.id && dragState.dragId !== item.id;
        const progressVal = item.history[dateToday] || 0;
        const percentage = Math.min(100, Math.round((progressVal / item.target) * 100));
        const isCompleted = progressVal >= item.target;
        const remaining = Math.max(0, item.target - progressVal);
        const config = getQuickHabitConfig(item.category);
        const IconComp = config.icon;
        const habitStreak = getHabitStreak(item);
        const swipeX = swipeOffsets[item.id] || 0;
        const timeframe = getHabitTimeframe(item, routines);
        const timePill = getTimePill(timeframe);

        return (
          <div
            key={item.id}
            data-habit-id={item.id}
            style={{
              opacity: isDragging ? 0.35 : 1,
              transform: isOver ? 'scale(1.018)' : 'scale(1)',
              boxShadow: isOver ? `0 0 0 2px ${config.color}55, 0 10px 28px rgba(0,0,0,0.5)` : undefined,
              transition: 'opacity 0.15s, transform 0.12s, box-shadow 0.12s',
              zIndex: isOver ? 2 : 'auto',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '16px',
            }}
          >
            {/* Swipe background — green check reveal */}
            {!isCompleted && (
              <div
                className="absolute inset-0 flex items-center pl-5 pointer-events-none rounded-[16px]"
                style={{
                  backgroundColor: '#12B886',
                  opacity: Math.min(swipeX / 80, 1),
                  transition: swipeX === 0 ? 'opacity 0.25s' : 'none',
                }}
              >
                <Check className="w-6 h-6 text-black stroke-[3px]" />
                <span className="ml-2 text-black font-extrabold text-sm">Done!</span>
              </div>
            )}

            <div
              style={{
                '--hover-glow': `${config.color}15`,
                '--card-border': isCompleted ? '#12B88635' : `${config.color}35`,
                transform: `translateX(${swipeX}px)`,
                transition: swipeX === 0 ? 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                borderRadius: '16px',
              } as React.CSSProperties}
              className={`relative hover:bg-[#151722] rounded-[16px] transition-all duration-300 flex items-center pr-3.5 py-3.5 md:py-2.5 gap-3 md:gap-2.5 overflow-hidden group shadow-sm hover:shadow-[0_0_20px_var(--hover-glow)] border ${isCompleted ? 'bg-[#0D1C15]/80 border-[#12B886]/20' : 'bg-[#12141C]/90 border-[#232734]/50 hover:border-[var(--card-border)]'}`}
              onPointerDown={handleCardPointerDown(item.id, isCompleted)}
              onPointerMove={handleCardPointerMove(item.id, isCompleted)}
              onPointerUp={handleCardPointerUp(item.id, remaining)}
              onPointerCancel={handleCardPointerUp(item.id, remaining)}
            >
              <div className="absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(ellipse 180px 80px at 0% 50%, ${isCompleted ? '#12B886' : config.color}12, transparent)` }} />
              {/* Left color bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[16px]"
                style={{ backgroundColor: isCompleted ? '#12B886' : config.color }} />
              {/* Drag Handle */}
              <div
                onPointerDown={handlePointerDown(item.id)}
                className="drag-handle pl-5 pr-1 self-stretch flex items-center cursor-grab active:cursor-grabbing z-20 touch-none select-none shrink-0"
                aria-label="Drag to reorder habit"
              >
                <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors duration-200" />
              </div>
              <div className="h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center shrink-0 border relative z-10 group-hover:scale-105 transition-transform duration-300"
                style={{
                  backgroundColor: isCompleted ? `#12B88618` : `${config.color}15`,
                  borderColor: isCompleted ? `#12B88630` : `${config.color}25`,
                  color: isCompleted ? '#12B886' : config.color,
                }}>
                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5px]" /> : <IconComp className="w-4.5 h-4.5 md:w-3.5 md:h-3.5" />}
              </div>
              <div className="flex flex-col min-w-0 shrink-0 w-[95px] xs:w-[115px] md:w-[110px] relative z-10 text-left">
                <h4 className="text-[15px] md:text-[13px] font-bold font-sans tracking-tight truncate"
                  style={{ color: isCompleted ? '#12B886' : 'white' }}>
                  {item.name}
                </h4>
                <div className="flex items-center gap-1 md:gap-0.5 text-[10px] md:text-[9px] text-gray-500 mt-0.5 flex-wrap">
                  <span className="font-semibold truncate" style={{ color: isCompleted ? '#12B886aa' : config.color }}>{item.category}</span>
                  {/* Time pill */}
                  {timePill && (
                    <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold px-1 py-0.5 rounded ml-0.5"
                      style={{ color: timePill.color, backgroundColor: `${timePill.color}18`, border: `1px solid ${timePill.color}30` }}>
                      {timePill.emoji}
                    </span>
                  )}
                  {/* Per-habit streak badge */}
                  {habitStreak >= 2 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.5 rounded ml-0.5">
                      🔥{habitStreak}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex justify-between items-center text-[11px] md:text-[9px] font-bold mb-1">
                  <span style={{ color: isCompleted ? '#12B886' : config.color }}>{progressVal}/{item.target} <span className="text-gray-600 font-normal">{item.unit}</span></span>
                  <span className="text-gray-500 font-mono">{percentage}%</span>
                </div>
                <div className="w-full h-2 md:h-1.5 bg-[#171924] rounded-full overflow-hidden border border-gray-800/40">
                  <div className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isCompleted ? '#12B886' : config.color,
                      boxShadow: isCompleted ? '0 0 6px #12B88688' : `0 0 6px ${config.color}`,
                    }} />
                </div>
              </div>
              <div className="shrink-0 relative z-10">
                {isCompleted ? (
                  <div className="h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center bg-[#12B886] text-black"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(18,184,134,0.8))' }}>
                    <Check className="w-4.5 h-4.5 md:w-3.5 md:h-3.5 stroke-[3px]" />
                  </div>
                ) : (
                  <button onClick={() => onLogHabit(item.id, remaining)}
                    className="h-10 w-10 md:h-8 md:w-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer group/circle active:scale-90"
                    style={{ borderColor: '#202434', backgroundColor: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = config.color; e.currentTarget.style.backgroundColor = `${config.color}15`; e.currentTarget.style.boxShadow = `0 0 8px ${config.color}35`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#202434'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <Check className="w-4.5 h-4.5 md:w-3.5 md:h-3.5 stroke-[3px] opacity-0 group-hover/circle:opacity-100 transition-opacity duration-200" style={{ color: config.color }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {habitHasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-[#12B886]/20 text-[12px] md:text-[11px] font-semibold text-[#12B886] hover:bg-[#12B886]/5 hover:border-[#12B886]/40 transition cursor-pointer select-none flex items-center justify-center gap-1.5"
        >
          <span>View all {habits.length} habits</span>
          <span className="font-mono">→</span>
        </button>
      )}
      {showAll && habitHasMore && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full py-2.5 rounded-xl border border-dashed border-gray-800 text-[12px] md:text-[11px] font-semibold text-gray-500 hover:text-gray-300 hover:bg-gray-800/20 transition cursor-pointer select-none"
        >
          Show less
        </button>
      )}
    </div>
  );
}

// ─── QUICK ROUTINE SHEET ──────────────────────────────────────────────────────

interface QuickRoutineSheetProps {
  routine: Routine | null;
  habits: Habit[];
  onClose: () => void;
  onLogHabit: LogHabitHandler;
  onDeleteHabit?: (id: string) => void;
  onCreateHabitInRoutine?: (routineId: string, name: string, category: Category) => Promise<void>;
}


function QuickRoutineSheet({ routine, habits, onClose, onLogHabit, onDeleteHabit, onCreateHabitInRoutine }: QuickRoutineSheetProps) {
  const [isCompletingAll, setIsCompletingAll] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const addInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!routine) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [routine, onClose]);

  if (!routine) return null;

  const completedCount = habits.filter(isHabitCompleteToday).length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const sortedHabits = habits; // Preserve sequential routine order

  const rtCategory = getRoutineCategory(routine, habits);
  const config = getQuickHabitConfig(rtCategory);
  const IconComp = config.icon;
  const pillarColor = config.color;

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
      for (const habit of sortedHabits) {
        const current = habit.history[dateToday] || 0;
        const remaining = Math.max(0, habit.target - current);
        if (remaining > 0) await Promise.resolve(onLogHabit(habit.id, remaining));
      }
    } finally {
      setIsCompletingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="quick-routine-sheet-title">
      <button type="button" aria-label="Close routine" onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm cursor-default routine-sheet-backdrop" />

      <section className="routine-sheet-panel relative z-10 w-full max-w-[560px] max-h-[86vh] overflow-y-auto bg-[#10121A] border border-[#2B3040] border-b-0 rounded-t-[24px] shadow-[0_-22px_70px_rgba(0,0,0,0.55)] pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
        <div className="sticky top-0 z-20 bg-[#10121A]/95 backdrop-blur-xl border-b border-[#202434] rounded-t-[24px]">
          <div className="flex justify-center py-3">
            <div className="h-1 w-11 rounded-full bg-[#343B50]" />
          </div>
          <div className="px-4 md:px-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border"
                    style={{ borderColor: `${pillarColor}25`, backgroundColor: `${pillarColor}10`, color: pillarColor }}>
                    <IconComp className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 id="quick-routine-sheet-title" className="text-lg font-extrabold text-white truncate">
                      {routine.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest">
                      <span style={{ color: pillarColor }}>{routine.timeBlock}</span>
                      <span className="text-gray-700">/</span>
                      <span className="inline-flex items-center gap-1 text-[#FCC419]">
                        <Zap className="h-3 w-3 fill-[#FCC419]" />{routine.points} XP
                      </span>
                      <span className="text-gray-600 font-normal">&bull;</span>
                      <span style={{ color: pillarColor }} className="opacity-80">{rtCategory}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Edit toggle */}
                <button
                  type="button"
                  onClick={() => setIsEditMode(prev => !prev)}
                  aria-label={isEditMode ? 'Done editing' : 'Edit routine'}
                  className={`h-9 px-3 rounded-full border text-xs font-bold transition flex items-center gap-1.5 ${
                    isEditMode
                      ? 'border-[#FCC419]/50 bg-[#FCC419]/15 text-[#FCC419] hover:bg-[#FCC419]/25'
                      : 'border-[#2B3040] bg-[#181B25] text-gray-400 hover:text-white hover:bg-[#202434]'
                  }`}
                >
                  {isEditMode ? (
                    <><Check className="h-3.5 w-3.5" /><span>Done</span></>
                  ) : (
                    <><Pencil className="h-3.5 w-3.5" /><span>Edit</span></>
                  )}
                </button>
                {/* Close */}
                <button type="button" onClick={onClose}
                  className="h-9 w-9 shrink-0 rounded-full border border-[#2B3040] bg-[#181B25] text-gray-400 hover:text-white hover:bg-[#202434] transition flex items-center justify-center"
                  aria-label="Close routine sheet">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[#252B3A] bg-[#151822] p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-gray-400">Overall Progress</span>
                <span className={allDone ? 'text-[#12B886]' : ''} style={allDone ? {} : { color: pillarColor }}>{completedCount}/{totalCount} done</span>
              </div>
              <div className="h-2 rounded-full bg-[#0D0F17] border border-[#242938] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: pillarColor, boxShadow: `0 0 6px ${pillarColor}` }} />
              </div>
              <div className="mt-1.5 text-right text-[10px] font-mono text-gray-500">{progress}%</div>
            </div>

            {!isEditMode && (
              <button type="button" onClick={handleCompleteAll}
                disabled={allDone || isCompletingAll || totalCount === 0}
                className="mt-3 w-full min-h-[46px] rounded-xl border border-[#12B886]/25 bg-[#12B886]/12 text-[#12B886] hover:bg-[#12B886]/20 disabled:bg-[#151822] disabled:text-gray-600 disabled:border-[#252B3A] font-extrabold text-sm transition flex items-center justify-center gap-2 active:scale-[0.99]">
                <Zap className="h-4 w-4 fill-current" />
                <span>{allDone ? 'Routine Complete' : isCompletingAll ? 'Completing...' : '1-TAP Complete All'}</span>
              </button>
            )}
            {isEditMode && (
              <div className="mt-3 rounded-xl border border-[#FCC419]/20 bg-[#FCC419]/8 px-3.5 py-2.5 flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-[#FCC419] shrink-0" />
                <span className="text-[11px] text-[#FCC419]/80 font-semibold">Edit mode — remove habits or add new ones below</span>
              </div>
            )}
          </div>
        </div>


        <div className="px-4 md:px-5 pt-3 space-y-2.5">
          {sortedHabits.map((habit) => {
            const current = habit.history[dateToday] || 0;
            const percentage = Math.min(100, Math.round((current / habit.target) * 100));
            const isCompleted = current >= habit.target;
            const config = getQuickHabitConfig(habit.category);
            const Icon = config.icon;
            const isDeleting = deletingId === habit.id;
            return (
              <div key={habit.id}
                className={`relative overflow-hidden rounded-2xl border bg-[#141720] p-3.5 transition ${
                  isEditMode
                    ? 'border-[#FCC419]/20'
                    : isCompleted
                    ? 'border-[#12B886]/20 opacity-75'
                    : 'border-[#252B3A]'
                }`}>
                <div className="flex items-center gap-3">
                  {/* Delete button — only visible in edit mode */}
                  {isEditMode && onDeleteHabit && (
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        setDeletingId(habit.id);
                        try {
                          await Promise.resolve(onDeleteHabit(habit.id));
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      aria-label={`Delete ${habit.name}`}
                      className="h-8 w-8 shrink-0 rounded-full border border-[#FF4757]/40 bg-[#FF4757]/10 text-[#FF4757] hover:bg-[#FF4757]/25 hover:border-[#FF4757]/70 transition flex items-center justify-center active:scale-95 disabled:opacity-50"
                      style={{ animation: isDeleting ? 'none' : 'editWiggle 0.5s ease-in-out' }}
                    >
                      {isDeleting
                        ? <span className="h-3.5 w-3.5 rounded-full border-2 border-[#FF4757] border-t-transparent animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <div className="h-11 w-11 shrink-0 rounded-full border flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}14`, borderColor: `${config.color}28`, color: config.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate text-[15px] font-bold text-white">{habit.name}</h4>
                      {!isEditMode && isCompleted && (
                        <span className="shrink-0 rounded border border-[#12B886]/20 bg-[#12B886]/10 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-[#12B886]">Done</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold">
                      <span style={{ color: config.color }}>{habit.category}</span>
                      <span className="text-gray-700">·</span>
                      <span className="flex items-center text-[#FCC419] font-semibold shrink-0">
                        <Zap className="w-2.5 h-2.5 mr-0.5 fill-[#FCC419]" />{habit.routineId ? 0 : habit.points} pts
                      </span>
                    </div>
                  </div>
                  {/* Complete button — hidden in edit mode */}
                  {!isEditMode && (
                    <button type="button" onClick={() => {
                      const current = habit.history[dateToday] || 0;
                      const remaining = Math.max(0, habit.target - current);
                      if (remaining > 0) onLogHabit(habit.id, remaining);
                    }} disabled={isCompleted}
                      aria-label={isCompleted ? `${habit.name} complete` : `Complete ${habit.name}`}
                      className={`h-10 w-10 shrink-0 rounded-full border-2 transition flex items-center justify-center active:scale-95 ${isCompleted
                        ? 'border-[#12B886] bg-[#12B886] text-black'
                        : 'border-[#30364A] bg-transparent hover:border-[#12B886] hover:bg-[#12B886]/10'}`}>
                      {isCompleted && <Check className="h-4.5 w-4.5 stroke-[3px]" />}
                    </button>
                  )}
                </div>
                {!isEditMode && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-[#242938] bg-[#0D0F17]">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}` }} />
                    </div>
                    <span className="w-9 text-right text-[10px] font-mono text-gray-500">{percentage}%</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Inline Add Habit — only in edit mode */}
          {isEditMode && onCreateHabitInRoutine && routine && (
            <div className="rounded-2xl border-2 border-dashed border-[#FCC419]/30 bg-[#FCC419]/5 p-3 transition-all">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = newHabitName.trim();
                  if (!trimmed || isAddingHabit) return;
                  setIsAddingHabit(true);
                  try {
                    await onCreateHabitInRoutine(routine.id, trimmed, rtCategory);
                    setNewHabitName('');
                    addInputRef.current?.focus();
                  } finally {
                    setIsAddingHabit(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                <span className="h-8 w-8 shrink-0 rounded-full bg-[#FCC419]/15 border border-[#FCC419]/30 flex items-center justify-center text-[#FCC419]">
                  <Plus className="h-4 w-4" />
                </span>
                <input
                  ref={addInputRef}
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="New habit name…"
                  maxLength={60}
                  disabled={isAddingHabit}
                  className="flex-1 bg-transparent text-sm font-semibold text-white placeholder-[#FCC419]/40 outline-none disabled:opacity-50"
                  autoFocus
                />
                {newHabitName.trim() && (
                  <button
                    type="submit"
                    disabled={isAddingHabit}
                    aria-label="Add habit"
                    className="h-8 px-3 rounded-xl bg-[#FCC419] text-black text-xs font-extrabold hover:bg-[#FFD43B] transition active:scale-95 disabled:opacity-60 flex items-center gap-1 shrink-0"
                  >
                    {isAddingHabit
                      ? <span className="h-3 w-3 rounded-full border-2 border-black/40 border-t-transparent animate-spin" />
                      : <><Check className="h-3 w-3 stroke-[3px]" /><span>Add</span></>}
                  </button>
                )}
              </form>
              <p className="mt-1.5 pl-10 text-[10px] text-[#FCC419]/50 font-medium">Press Enter or tap Add — habit saved instantly</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── DASHBOARD PROPS ──────────────────────────────────────────────────────────

interface DashboardProps {
  habits: Habit[];
  routines: Routine[];
  userPoints: number;
  onLogHabit: LogHabitHandler;
  setTab: (tab: string) => void;
  onNavigateToRoutine: (routineId: string) => void;
  selectedCategoryId: Category | null;
  setSelectedCategoryId: (cat: Category | null) => void;
  onDeleteHabit?: (id: string) => void;
  onCreateHabitInRoutine?: (routineId: string, name: string, category: Category) => Promise<void>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export default function Dashboard({
  habits, routines, userPoints, onLogHabit, setTab,
  onNavigateToRoutine, selectedCategoryId, setSelectedCategoryId,
  onDeleteHabit, onCreateHabitInRoutine,
}: DashboardProps) {
  const { score: momentumScore, threeDayAvg, trajectory, yesterdayProgress, todayProgress } = calculateMomentum(habits, routines);
  const standaloneHabitsAll = getStandaloneHabits(habits, routines);

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

  const [selectedPillar, setSelectedPillar] = useState<Category | null>(null);

  const activeCategories = React.useMemo(() => {
    const cats = new Set<Category>();
    habits.forEach((h) => cats.add(h.category));
    const order: Category[] = ['Fitness', 'Reading', 'Diet', 'Skill', 'Mindset', 'Rest'];
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

  const { done: doneTodayCount, total: totalTodayCount, progressPercent: overallTodayProgress } = getDailyTaskCounts(habits, routines, dateToday);

  const potentialStandalonePoints = standaloneHabitsAll.reduce((acc, curr) => acc + curr.points, 0);
  const potentialRoutinePoints = routines.reduce((acc, curr) => acc + curr.points, 0);

  const earnedStandalonePoints = standaloneHabitsAll.reduce((acc, curr) => {
    const todayLog = curr.history[dateToday] || 0;
    const progressDonePercent = Math.min(1.0, todayLog / curr.target);
    return acc + Math.round(progressDonePercent * curr.points);
  }, 0);

  const earnedRoutinePoints = routines.reduce((acc, curr) => {
    const completed = curr.completedHistory?.[dateToday] || false;
    return acc + (completed ? curr.points : 0);
  }, 0);

  const totalPotentialPoints = potentialStandalonePoints + potentialRoutinePoints;
  const earnedPointsToday = earnedStandalonePoints + earnedRoutinePoints;


  const [quickVals, setQuickVals] = useState<{ [key: string]: string }>({});
  const autoTimeframe = getTimeframeFromHour();
  const [timeframeFilter, setTimeframeFilter] = useState<'All' | 'Morning' | 'Evening' | 'Night' | 'Anytime'>(autoTimeframe);
  const [isAutoTimeframe, setIsAutoTimeframe] = useState(true);
  const handleSetTimeframeFilter = (val: 'All' | 'Morning' | 'Evening' | 'Night' | 'Anytime') => {
    setTimeframeFilter(val);
    setIsAutoTimeframe(val === autoTimeframe);
  };
  const [selectedRoutineSheetId, setSelectedRoutineSheetId] = useState<string | null>(null);
  const [showAllQuickItems, setShowAllQuickItems] = useState(false);

  // ── Live clock ──
  const [liveClock, setLiveClock] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setLiveClock(formatClock(new Date())), 10000);
    return () => clearInterval(id);
  }, []);

  // ── Daily streak counter ──
  const dailyStreak = getDailyStreak(habits, routines);

  // ── Confetti: fire when all done for first time ──
  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    const allDoneNow = totalTodayCount > 0 && doneTodayCount >= totalTodayCount;
    if (allDoneNow && !prevAllDoneRef.current) {
      setTimeout(() => fireConfetti(), 300);
    }
    prevAllDoneRef.current = allDoneNow;
  }, [doneTodayCount, totalTodayCount]);

  // ── All done state ──
  const allDoneToday = totalTodayCount > 0 && doneTodayCount >= totalTodayCount;

  // ── Daily Todo State ──
  const TODO_STORAGE_KEY = `dashboard_todos_${dateToday}`;
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) || 'null') || []; }
    catch { return []; }
  });
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);

  const persistTodos = useCallback((next: TodoItem[]) => {
    setTodos(next);
    try { localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, [TODO_STORAGE_KEY]);

  const handleAddTodo = useCallback((text: string) => {
    persistTodos([...todos, { id: `todo_${Date.now()}_${Math.random().toString(36).slice(2)}`, text, completed: false }]);
  }, [todos, persistTodos]);

  const handleToggleTodo = useCallback((id: string) => {
    persistTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, [todos, persistTodos]);

  const handleDeleteTodo = useCallback((id: string) => {
    persistTodos(todos.filter(t => t.id !== id));
  }, [todos, persistTodos]);

  const todoCompletedCount = todos.filter(t => t.completed).length;
  const todoTotalCount = todos.length;
  const todoProgressPct = todoTotalCount > 0 ? Math.round((todoCompletedCount / todoTotalCount) * 100) : 0;

  // ── Habit drag-to-reorder state ──
  const HABIT_ORDER_KEY = 'dashboard_habit_order';
  const [habitOrder, setHabitOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HABIT_ORDER_KEY) || 'null') || []; }
    catch { return []; }
  });
  const persistHabitOrder = useCallback((order: string[]) => {
    setHabitOrder(order);
    try { localStorage.setItem(HABIT_ORDER_KEY, JSON.stringify(order)); } catch {}
  }, []);

  const applyHabitOrder = useCallback((habits: Habit[]): Habit[] => {
    if (habitOrder.length === 0) return habits;
    const orderMap = new Map(habitOrder.map((id, i) => [id, i]));
    return [...habits].sort((a, b) => {
      const ia = (orderMap.get(a.id) ?? 9999) as number;
      const ib = (orderMap.get(b.id) ?? 9999) as number;
      return ia - ib;
    });
  }, [habitOrder]);

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
      const dayCounts = getDailyTaskCounts(habits, routines, dateStr);
      let pScore = dayCounts.total > 0 ? (dayCounts.done / dayCounts.total) : 1.0;
      if (journeyStartDate === '2026-05-23') {
        if (dateStr === '2026-05-23') pScore = 0.45;
        else if (dateStr === '2026-05-24') pScore = 0.15;
        else if (dateStr === '2026-05-25') pScore = 0.35;
        else if (dateStr === '2026-05-26') pScore = 1.00;
        else if (dateStr === '2026-05-27') pScore = 1.00;
        else if (dateStr === '2026-05-28') pScore = 0.40;
        else if (dateStr === dateToday) {
          const liveCounts = getDailyTaskCounts(habits, routines, dateStr);
          pScore = liveCounts.total > 0 ? (liveCounts.done / liveCounts.total) : 1.0;
        }
      }
      let growthEarned = 0.0;
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
    if (customVal !== undefined) { onLogHabit(habitId, customVal); return; }
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

      {/* ── UNIFIED HERO DASHBOARD & CENTERPIECE PROGRESS CIRCLE ── */}
      <div className="space-y-4">
        {/* Dashboard Title & Quick Nav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#1A1D24] gap-3">
          <div className="text-left">
            <span className="font-mono text-[10px] md:text-xs text-[#12B886] uppercase tracking-widest font-semibold flex items-center">
              <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 text-[#FCC419] animate-spin-slow" />
              Productivity Identity System
            </span>
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-white font-sans mt-0.5 leading-tight">
              {getGreeting()}<span className="text-gray-500 font-light">,</span> <span className="text-[#12B886]">let's finish strong</span>
            </h1>
            <p className="text-[10px] md:text-xs text-gray-500 font-mono mt-0.5">{getTodayLabel()}</p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {dailyStreak >= 1 && (
              <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/25 px-2.5 py-1 rounded-xl shrink-0">
                <span className="text-sm">🔥</span>
                <span className="text-xs md:text-sm font-extrabold text-orange-400">{dailyStreak}</span>
                <span className="text-[9px] md:text-[10px] font-mono text-orange-400/70 uppercase tracking-wide">day streak</span>
              </div>
            )}
            {/* Daily Focus Button */}
            <button
              id="daily-focus-btn"
              onClick={() => setIsTodoModalOpen(true)}
              className="relative flex items-center gap-1.5 border border-[#272B36] bg-[#12141C] hover:bg-[#1E212E] hover:border-[#845EF7]/40 hover:text-white px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-[11px] md:text-xs font-semibold text-gray-300 cursor-pointer transition select-none group/todob"
              style={{ boxShadow: isTodoModalOpen ? '0 0 0 1px rgba(132,94,247,0.3), 0 0 10px rgba(132,94,247,0.12)' : undefined }}
            >
              <ListTodo className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#845EF7]" />
              <span>Daily Focus</span>
              {todoTotalCount > 0 && (
                <span className={`inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[9px] font-mono font-bold ${
                  todoProgressPct === 100
                    ? 'bg-[#12B886]/20 text-[#12B886] border border-[#12B886]/30'
                    : 'bg-[#845EF7]/20 text-[#845EF7] border border-[#845EF7]/30'
                }`}>
                  {todoProgressPct === 100 ? '✓' : `${todoCompletedCount}/${todoTotalCount}`}
                </span>
              )}
            </button>
            <button onClick={() => setTab('habits')}
              className="flex items-center gap-1.5 border border-[#272B36] bg-[#12141C] hover:bg-[#1E212E] hover:text-white px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-[11px] md:text-xs font-semibold text-gray-300 cursor-pointer transition select-none">
              <span>My Habits</span>
              <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
          </div>
        </div>

        {/* Centerpiece Progress & XP Panel */}
        <div className={`bg-[#14161F]/90 border rounded-2xl p-4 md:p-6 relative overflow-hidden group/hero transition-all duration-350 ${allDoneToday ? 'border-[#12B886]/40 shadow-[0_0_30px_rgba(18,184,134,0.08)]' : 'border-[#232734]/80 hover:border-gray-800'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#12B886]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gradient-to-tr from-[#845EF7]/4 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Mobile: compact horizontal layout | Desktop: full grid */}
          <div className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 items-center">
            {/* Centerpiece Circular gauge */}
            <div className="md:col-span-5 flex flex-row md:flex-col items-center justify-start md:justify-center gap-5 md:gap-0 w-full md:border-b-0 md:border-r border-gray-850/60 md:pb-0 md:pr-6">
              <div>
                <div className="text-[10px] font-mono font-bold tracking-wider text-gray-400 mb-2 md:mb-4 select-none text-center">DAILY PROGRESS</div>
                {/* Mobile: smaller circle (120px) | Desktop: 176px */}
                <div className="relative w-[120px] h-[120px] md:w-44 md:h-44 flex items-center justify-center flex-shrink-0">
                  <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 176 176">
                    <circle cx="88" cy="88" r="74" stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="transparent" />
                    <circle cx="88" cy="88" r="74" stroke="url(#emeraldCyanGrad)" strokeWidth="10" fill="transparent"
                      strokeDasharray={2 * Math.PI * 74}
                      strokeDashoffset={2 * Math.PI * 74 * (1 - overallTodayProgress / 100)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)', filter: 'drop-shadow(0 0 8px rgba(18,184,134,0.4))' }}
                    />
                    <defs>
                      <linearGradient id="emeraldCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#12B886" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="text-center select-none z-10 flex flex-col items-center justify-center">
                    <div className="text-3xl md:text-4xl font-extrabold text-white font-sans tracking-tight filter drop-shadow-[0_0_12px_rgba(18,184,134,0.3)]">
                      {overallTodayProgress}%
                    </div>
                    <div className="text-[8px] md:text-[9px] font-mono font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
                      {doneTodayCount} / {totalTodayCount} Done
                    </div>
                    {overallTodayProgress >= 80 ? (
                      <div className="text-[8px] font-mono font-bold text-[#FCC419] bg-[#FCC419]/10 border border-[#FCC419]/25 px-1.5 py-0.5 rounded-full mt-1.5 animate-pulse">
                        🔥 STREAK SAVE
                      </div>
                    ) : (
                      <div className="text-[7px] font-mono font-semibold text-gray-500 mt-1.5 uppercase tracking-tight">
                        80% for streak
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Mobile: inline stats next to circle */}
              <div className="flex flex-col gap-2 flex-1 md:hidden w-full">
                <div className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest text-left">POINTS TODAY</div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="bg-[#10121A]/80 border border-gray-850 rounded-xl p-2.5 text-left">
                    <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">Habits</div>
                    <div className="text-sm font-extrabold text-white">{earnedStandalonePoints}<span className="text-gray-500 text-[10px] font-normal">/{potentialStandalonePoints}</span></div>
                    <div className="w-full h-1 bg-[#171924] rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-[#12B886] rounded-full" style={{ width: `${potentialStandalonePoints > 0 ? (earnedStandalonePoints / potentialStandalonePoints) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="bg-[#10121A]/80 border border-gray-850 rounded-xl p-2.5 text-left">
                    <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">Routines</div>
                    <div className="text-sm font-extrabold text-white">{earnedRoutinePoints}<span className="text-gray-500 text-[10px] font-normal">/{potentialRoutinePoints}</span></div>
                    <div className="w-full h-1 bg-[#171924] rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-[#845EF7] rounded-full" style={{ width: `${potentialRoutinePoints > 0 ? (earnedRoutinePoints / potentialRoutinePoints) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Breakdown and details (desktop only full version) */}
            <div className="hidden md:flex md:col-span-7 flex-col justify-between gap-5 w-full">
              <div>
                <div className="flex justify-between items-center mb-3.5 select-none">
                  <h3 className="text-sm font-bold text-gray-300 font-sans tracking-wide">Points Breakdown</h3>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#FCC419] bg-[#FCC419]/8 border border-[#FCC419]/25 px-2.5 py-0.5 rounded-md">
                    <Zap className="w-3.5 h-3.5 fill-[#FCC419]" />
                    <span>Level {Math.floor(userPoints / 100) + 1}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Habits XP Card */}
                  <div className="bg-[#10121A]/80 border border-gray-850 rounded-xl p-3.5 text-left relative overflow-hidden group/h-xp hover:border-[#12B886]/35 transition duration-300">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#12B886]/4 to-transparent rounded-full blur-xl pointer-events-none" />
                    <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Habits Points</span>
                    <div className="text-lg font-extrabold text-white font-sans mt-0.5">
                      {earnedStandalonePoints} <span className="text-gray-650 font-light text-sm">/</span> <span className="text-gray-400 font-medium text-sm">{potentialStandalonePoints} pts</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#171924] rounded-full overflow-hidden mt-2 border border-gray-800/40">
                      <div className="h-full bg-[#12B886] rounded-full transition-all duration-500"
                        style={{ width: `${potentialStandalonePoints > 0 ? (earnedStandalonePoints / potentialStandalonePoints) * 100 : 0}%` }} />
                    </div>
                  </div>

                  {/* Routines XP Card */}
                  <div className="bg-[#10121A]/80 border border-gray-850 rounded-xl p-3.5 text-left relative overflow-hidden group/r-xp hover:border-[#845EF7]/35 transition duration-300">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#845EF7]/4 to-transparent rounded-full blur-xl pointer-events-none" />
                    <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Routines Points</span>
                    <div className="text-lg font-extrabold text-white font-sans mt-0.5">
                      {earnedRoutinePoints} <span className="text-gray-650 font-light text-sm">/</span> <span className="text-gray-400 font-medium text-sm">{potentialRoutinePoints} pts</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#171924] rounded-full overflow-hidden mt-2 border border-gray-800/40">
                      <div className="h-full bg-[#845EF7] rounded-full transition-all duration-500"
                        style={{ width: `${potentialRoutinePoints > 0 ? (earnedRoutinePoints / potentialRoutinePoints) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub status cards: Momentum & Growth */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-850/60 pt-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-red-500/20 bg-red-500/5 text-[#FA5252]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider">Momentum</div>
                    <div className="text-xs font-bold text-white truncate mt-0.5">
                      {momentumScore}% &bull; <span className="text-[#FA5252]">{momentumScore >= 90 ? 'Ultra' : momentumScore >= 75 ? 'Flow' : momentumScore >= 45 ? 'Ignite' : 'Inertia'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-[#FCC419]/20 bg-[#FCC419]/5 text-[#FCC419]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider">Growth Index</div>
                    <div className="text-xs font-bold text-white truncate mt-0.5">
                      +{activeGrowthValue.toFixed(1)}% &bull; <span className="text-[#FCC419] font-mono">{betterStreak}d</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile bottom bar: momentum & level */}
            <div className="md:hidden w-full grid grid-cols-2 gap-2 border-t border-gray-800/60 pt-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border border-red-500/20 bg-red-500/5 text-[#FA5252]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[8px] font-mono font-bold text-gray-500 uppercase">Momentum</div>
                  <div className="text-[11px] font-bold text-white">{momentumScore}% <span className="text-[#FA5252]">{momentumScore >= 90 ? 'Ultra' : momentumScore >= 75 ? 'Flow' : momentumScore >= 45 ? 'Ignite' : 'Inertia'}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border border-[#FCC419]/20 bg-[#FCC419]/5 text-[#FCC419]">
                  <Zap className="w-4 h-4 fill-[#FCC419]" />
                </div>
                <div>
                  <div className="text-[8px] font-mono font-bold text-gray-500 uppercase">Level</div>
                  <div className="text-[11px] font-bold text-white">{Math.floor(userPoints / 100) + 1} <span className="text-[#FCC419] font-mono">&bull; {userPoints}xp</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ── 6 PILLARS RINGS ── */}
      <CategoryRingsCard
        categories={['Fitness', 'Reading', 'Diet', 'Skill', 'Mindset', 'Rest']}
        getCategoryStats={getCategoryStats}
        overallAvg={overallCategoryAvg}
        selectedPillar={selectedPillar}
        onSelectCategory={setSelectedPillar}
      />

      {/* ── QUICK HABIT LOGGER ── */}
      <div id="quick-habit-logger-section" className="bg-[#14161F]/90 border border-[#232734]/80 p-4 md:p-6 rounded-2xl shadow-lg relative overflow-hidden group/logger duration-300 transition-all hover:border-[#12B886]/20 hover:shadow-[0_0_35px_rgba(18,184,134,0.03)]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4 md:mb-3 relative z-10">
          <h3 className="text-base md:text-sm font-bold text-white font-sans flex items-center">
            <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4 text-[#12B886] mr-2 md:mr-1.5 animate-pulse" />
            Quick Habit Logger
          </h3>
          <div className="flex items-center gap-2">
            {isAutoTimeframe && timeframeFilter !== 'All' && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500 bg-[#1A1D28] border border-[#2A2F42] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12B886] animate-pulse inline-block" />
                auto
              </span>
            )}
            {/* Remaining badge + 1-TAP */}
            {(() => {
              const incompleteHabits = standaloneHabitsAll.filter(h => (h.history[dateToday] || 0) < h.target).length;
              const incompleteRoutines = routines.filter(rt => !getRoutineProgressToday(rt, habits).allDone && getRoutineHabits(rt, habits).length > 0).length;
              const remaining = incompleteHabits + incompleteRoutines;
              return remaining > 0 ? (
                <span className="text-[10px] font-mono font-bold text-[#12B886] bg-[#12B886]/10 border border-[#12B886]/25 px-2 py-0.5 rounded-full">
                  {remaining} remaining
                </span>
              ) : null;
            })()}
            <span className="text-xs md:text-[10px] text-gray-400 font-mono tracking-widest font-semibold bg-[#1D212F] px-2.5 py-1 md:px-2 md:py-0.5 rounded border border-[#2C3246]/50">
              ⚡ 1-TAP
            </span>
          </div>
        </div>

        {/* Selected Category/Pillar Filter Banner */}
        {selectedPillar && (
          <div 
            className="mb-4 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border font-sans text-sm font-semibold select-none animate-fade-in transition-all duration-350 relative z-10"
            style={{
              backgroundColor: `${getCategoryColor(selectedPillar)}10`,
              borderColor: `${getCategoryColor(selectedPillar)}25`,
              color: getCategoryColor(selectedPillar)
            }}
          >
            <span className="text-base">{getCategoryEmoji(selectedPillar)}</span>
            <span>Filtered: {selectedPillar} habits</span>
          </div>
        )}

        {(() => {
          const allHabitsFiltered = selectedPillar
            ? standaloneHabitsAll.filter(h => h.category === selectedPillar)
            : standaloneHabitsAll;

          const routinesFiltered = selectedPillar
            ? routines.filter(rt => getRoutineHabits(rt, habits).some(h => h.category === selectedPillar))
            : routines;

          const habitMatchesTimeframe = (h: Habit) =>
            timeframeFilter === 'All' || getHabitTimeframe(h, routines) === timeframeFilter;

          const routineMatchesTimeframe = (rt: Routine) => {
            if (timeframeFilter === 'All') return true;
            if (timeframeFilter === 'Anytime') return rt.timeBlock === 'Constant';
            return rt.timeBlock === timeframeFilter;
          };

          const allCount = allHabitsFiltered.length + routinesFiltered.length;
          const morningCount =
            allHabitsFiltered.filter(h => getHabitTimeframe(h, routines) === 'Morning').length +
            routinesFiltered.filter(rt => rt.timeBlock === 'Morning').length;
          const eveningCount =
            allHabitsFiltered.filter(h => getHabitTimeframe(h, routines) === 'Evening').length +
            routinesFiltered.filter(rt => rt.timeBlock === 'Evening').length;
          const nightCount =
            allHabitsFiltered.filter(h => getHabitTimeframe(h, routines) === 'Night').length +
            routinesFiltered.filter(rt => rt.timeBlock === 'Night').length;
          const anytimeCount =
            allHabitsFiltered.filter(h => getHabitTimeframe(h, routines) === 'Anytime').length +
            routinesFiltered.filter(rt => rt.timeBlock === 'Constant').length;

          const standaloneHabitsRaw = sortCompletedLast(
            allHabitsFiltered.filter(h => habitMatchesTimeframe(h)),
            isHabitCompleteToday
          );
          const standaloneHabits = applyHabitOrder(standaloneHabitsRaw);
          const selectedRoutine = routinesFiltered.find(rt => rt.id === selectedRoutineSheetId) || null;
          const selectedRoutineHabits = selectedRoutine
            ? getRoutineHabits(selectedRoutine, habits)
                .filter((h): h is Habit => habitMatchesTimeframe(h) && (!selectedPillar || h.category === selectedPillar))
            : [];



          const totalVisible =
            routinesFiltered.filter(routineMatchesTimeframe).reduce((acc, rt) => {
              const filtered = getRoutineHabits(rt, habits).filter(h => !selectedPillar || h.category === selectedPillar);
              return acc + (filtered.length > 0 ? 1 : 0);
            }, 0) + standaloneHabits.length;

          return (
            <div className="space-y-3">
              {/* Filter Tabs — hidden when a pillar is selected */}
              {!selectedPillar && (
                <div className="flex items-center gap-2 md:gap-1.5 border-b border-gray-800/60 pb-3.5 md:pb-3 overflow-x-auto scrollbar-none">
                  {[
                    { value: 'All', label: 'All', count: allCount, icon: '', activeColor: 'bg-[#12B886]/10 text-[#12B886] border-[#12B886]/20' },
                    { value: 'Morning', label: 'Morning', count: morningCount, icon: '☀️', activeColor: 'bg-[#FCC419]/10 text-[#FCC419] border-[#FCC419]/30' },
                    { value: 'Evening', label: 'Evening', count: eveningCount, icon: '🌆', activeColor: 'bg-[#FD7E14]/10 text-[#FD7E14] border-[#FD7E14]/30' },
                    { value: 'Night', label: 'Night', count: nightCount, icon: '🌙', activeColor: 'bg-[#845EF7]/10 text-[#845EF7] border-[#845EF7]/30' },
                    { value: 'Anytime', label: 'Anytime', count: anytimeCount, icon: '🔄', activeColor: 'bg-[#20C997]/10 text-[#20C997] border-[#20C997]/30' },
                  ].map(tab => {
                    const isActive = timeframeFilter === tab.value;
                    const isNowTab = tab.value === autoTimeframe;
                    return (
                      <button key={tab.value} onClick={() => handleSetTimeframeFilter(tab.value as any)}
                        className={`relative flex items-center gap-1.5 md:gap-1 px-3.5 py-2 md:px-2.5 md:py-1 rounded-full text-[13px] md:text-[11px] font-semibold cursor-pointer transition select-none shrink-0 ${
                          isActive ? 'border ' + tab.activeColor : 'bg-[#12141C] border border-[#232734] text-gray-400 hover:text-white hover:bg-[#1E212E]'
                        }`}>
                        {tab.icon && <span className="text-[13px] md:text-[11px]">{tab.icon}</span>}
                        <span>{tab.label}</span>
                        <span className="text-[11px] md:text-[9px] font-mono font-extrabold bg-[#1A1D28] text-gray-500 border border-gray-800 px-1.5 md:px-1 rounded">{tab.count}</span>
                        {/* NOW dot + live clock on auto-selected tab */}
                        {isNowTab && isActive && (
                          <span className="text-[9px] font-mono font-bold opacity-70 ml-0.5">{liveClock}</span>
                        )}
                        {isNowTab && !isActive && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#12B886] border border-[#12141C] animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Habit List */}
              {/* Yesterday vs Today mini comparison bar */}
              {habits.length > 0 && (
                <div className="flex items-center gap-3 bg-[#0F111A] border border-[#1E2130] rounded-xl px-4 py-2.5 relative z-10">
                  <div className="flex-1">
                    <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Yesterday</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#1A1D28] rounded-full overflow-hidden">
                        <div className="h-full bg-gray-600 rounded-full transition-all duration-500"
                          style={{ width: `${yesterdayProgress}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-gray-500 w-7 text-right">{yesterdayProgress}%</span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-[#252840]" />
                  <div className="flex-1">
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-1"
                      style={{ color: overallTodayProgress >= yesterdayProgress ? '#12B886' : '#FA5252' }}>Today</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#1A1D28] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${overallTodayProgress}%`,
                            backgroundColor: overallTodayProgress >= yesterdayProgress ? '#12B886' : '#FA5252',
                          }} />
                      </div>
                      <span className="text-[9px] font-mono w-7 text-right"
                        style={{ color: overallTodayProgress >= yesterdayProgress ? '#12B886' : '#FA5252' }}>{overallTodayProgress}%</span>
                    </div>
                  </div>
                  {overallTodayProgress >= yesterdayProgress ? (
                    <span className="text-[9px] font-mono font-bold text-[#12B886] shrink-0">↑ ahead</span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-[#FA5252] shrink-0">↓ behind</span>
                  )}
                </div>
              )}
              {totalVisible === 0 ? (
                <div className="bg-[#12141C]/50 border border-dashed border-gray-800 rounded-xl py-10 text-center">
                  <CheckCircle2 className="w-7 h-7 text-[#12B886] mx-auto mb-2 animate-pulse" />
                  <h4 className="text-sm font-bold text-white">All clear!</h4>
                  <p className="text-xs text-gray-400 mt-1 px-4 max-w-sm mx-auto">
                    {timeframeFilter === 'Morning' && eveningCount > 0 ? `Morning complete! ${eveningCount} Evening habits coming up` :
                     timeframeFilter === 'Evening' && nightCount > 0 ? `Evening complete! ${nightCount} Night habits coming up` :
                     `No habits active for the ${timeframeFilter === 'All' ? 'day' : `${timeframeFilter.toLowerCase()} block`}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 md:space-y-3">
                  {/* All done celebration banner */}
                  {allDoneToday && (
                    <div className="flex items-center gap-3 bg-[#0D1C15] border border-[#12B886]/30 rounded-xl px-4 py-3 animate-fade-in">
                      <span className="text-2xl">🎉</span>
                      <div>
                        <div className="text-sm font-extrabold text-[#12B886]">All done! Amazing work today!</div>
                        <div className="text-xs text-gray-400 mt-0.5">You've completed every habit for {timeframeFilter === 'All' ? 'the day' : `the ${timeframeFilter.toLowerCase()} block`}. Keep the streak going tomorrow!</div>
                      </div>
                    </div>
                  )}
                  {/* Routines */}
                  {(() => {
                    const allFilteredRoutines = sortCompletedLast(
                      routinesFiltered.filter(routineMatchesTimeframe),
                      rt => getRoutineProgressToday(rt, habits).allDone
                    );
                    const visibleRoutines = showAllQuickItems ? allFilteredRoutines : allFilteredRoutines.slice(0, 3);
                    const hasMore = allFilteredRoutines.length > 3;
                    return (
                      <>
                        {visibleRoutines.map(rt => {
                          const rtHabits = getRoutineHabits(rt, habits);
                          if (rtHabits.length === 0) return null;
                          const { doneCount, totalCount, progress: rtProgress, allDone } = getRoutineProgressToday(rt, habits);
                          const rtCategory = getRoutineCategory(rt, habits);
                          const config = getQuickHabitConfig(rtCategory);
                          const IconComp = config.icon;
                          const pillarColor = config.color;

                          return (
                            <button key={rt.id} type="button" onClick={() => setSelectedRoutineSheetId(rt.id)}
                              aria-label={`Open ${rt.name} routine`}
                              className={`w-full rounded-xl border text-left overflow-hidden bg-[#0F1018] hover:bg-[#151826] transition-all duration-200 cursor-pointer select-none shadow-sm active:scale-[0.99]`}
                              style={{
                                borderColor: allDone ? 'rgba(18,184,134,0.25)' : `${pillarColor}20`
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = allDone ? 'rgba(18,184,134,0.45)' : `${pillarColor}45`; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = allDone ? 'rgba(18,184,134,0.25)' : `${pillarColor}20`; }}
                            >
                              <div className="flex items-center gap-3 md:gap-2.5 px-3.5 md:px-3 py-3 md:py-2.5">
                                <div className="w-1 h-8 md:h-7 rounded-full shrink-0" style={{ backgroundColor: pillarColor }} />
                                <div className="h-10 w-10 md:h-8 md:w-8 rounded-full border flex items-center justify-center shrink-0"
                                  style={{ borderColor: `${pillarColor}20`, backgroundColor: `${pillarColor}10`, color: pillarColor }}>
                                  <IconComp className="w-4.5 h-4.5 md:w-3.5 md:h-3.5" />
                                </div>
                              <div className="flex-1 min-w-0">
                                  {/* Name — full width, always visible */}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[14px] md:text-[13px] font-bold text-white leading-tight">{rt.name}</span>
                                    {allDone && (
                                      <span className="shrink-0 text-[9px] font-mono text-[#12B886] bg-[#12B886]/10 border border-[#12B886]/20 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  {/* Tags + progress row */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] font-mono border px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
                                      style={{ color: pillarColor, backgroundColor: `${pillarColor}10`, borderColor: `${pillarColor}20` }}>
                                      {rt.timeBlock}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden min-w-[40px]">
                                      <div className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${rtProgress}%`, backgroundColor: pillarColor, boxShadow: `0 0 4px ${pillarColor}` }} />
                                    </div>
                                    <span className="text-[10px] font-mono shrink-0" style={{ color: pillarColor }}>{doneCount}/{totalCount}</span>
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

                        {hasMore && !showAllQuickItems && (
                          <button
                            type="button"
                            onClick={() => setShowAllQuickItems(true)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-[#845EF7]/20 text-[12px] md:text-[11px] font-semibold text-purple-400 hover:bg-[#845EF7]/5 hover:border-[#845EF7]/40 transition cursor-pointer select-none"
                          >
                            View all {allFilteredRoutines.length} routines →
                          </button>
                        )}
                        {showAllQuickItems && allFilteredRoutines.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllQuickItems(false)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-gray-800 text-[12px] md:text-[11px] font-semibold text-gray-500 hover:text-gray-300 hover:bg-gray-800/20 transition cursor-pointer select-none"
                          >
                            Show less
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {/* Standalone habits — draggable */}
                  {standaloneHabits.length > 0 && (
                    <DraggableHabitList
                      habits={standaloneHabits}
                      showAll={showAllQuickItems}
                      setShowAll={setShowAllQuickItems}
                      hasRoutines={routinesFiltered.length > 0}
                      onReorder={persistHabitOrder}
                      onLogHabit={handleQuickLog}
                      routines={routines}
                    />
                  )}
                </div>
              )}

              <QuickRoutineSheet
                routine={selectedRoutine}
                habits={selectedRoutineHabits}
                onClose={() => setSelectedRoutineSheetId(null)}
                onLogHabit={onLogHabit}
                onDeleteHabit={onDeleteHabit}
                onCreateHabitInRoutine={onCreateHabitInRoutine}
              />
            </div>
          );
        })()}
      </div>

      {/* ── BOTTOM GRID: Category Progress + Active Routines ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category Progress Widget */}
        <div className="bg-[#14161F]/90 border border-[#232734]/80 rounded-2xl p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider text-gray-500">CATEGORIES BREAKDOWN</span>
              <span className="text-lg font-bold text-white font-mono">{overallCategoryAvg}%</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 text-left">Category Progress</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {activeCategories.length} active {activeCategories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
          <div className="my-6">
            {categoryProgressList.length > 0 ? (
              <div className={`grid gap-3 md:gap-4 ${
                categoryProgressList.length <= 3 ? 'grid-cols-3' :
                categoryProgressList.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}>
                {categoryProgressList.map((item) => (
                  <div key={item.name} className="flex flex-col items-center">
                    <div onClick={() => setSelectedCategoryId(item.name)}
                      className="w-full h-20 md:h-24 bg-gray-900 rounded-lg relative overflow-hidden flex items-end cursor-pointer hover:bg-[#1A1C27] border border-gray-800 transition">
                      <div className="w-full rounded-t transition-all duration-500"
                        style={{ height: `${item.progress}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-300 mt-2 text-center">{item.name}</span>
                    <span className="text-[10px] font-mono text-gray-500 mt-0.5">{item.progress}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">No habits yet. Create habits to see category progress.</div>
            )}
          </div>
          <div className="flex items-start space-x-2 bg-gray-950/20 border border-gray-800/40 rounded-xl p-3 text-left">
            <AlertTriangle className="w-4 h-4 text-[#FCC419] shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
              Unlock maximum focus points by balancing your daily category habits equitably.
            </p>
          </div>
        </div>

        {/* Active Routines Widget */}
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
                const routineHabits = getRoutineHabits(rt, habits);
                const completedInRt = routineHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length;
                const totalInRt = routineHabits.length;
                const progress = totalInRt > 0 ? Math.round((completedInRt / totalInRt) * 100) : 0;
                const rtCategory = getRoutineCategory(rt, habits);
                const config = getQuickHabitConfig(rtCategory);
                const pillarColor = config.color;
                const emoji = getCategoryEmoji(rtCategory);

                return (
                  <div key={rt.id}
                    onClick={() => { setTimeframeFilter('All'); setSelectedRoutineSheetId(rt.id); }}
                    className="bg-[#10121A] hover:bg-[#151722] border border-gray-850 p-3.5 rounded-xl cursor-pointer transition flex items-center justify-between group shadow"
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${pillarColor}35`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; }}
                  >
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-white transition" style={{ '--hover-color': pillarColor } as React.CSSProperties} onMouseEnter={e => e.currentTarget.style.color = pillarColor} onMouseLeave={e => e.currentTarget.style.color = '#fff'}>
                        {emoji} {rt.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-1 font-semibold">{completedInRt}/{totalInRt} habits done &bull; {rt.timeBlock} &bull; <span style={{ color: pillarColor }}>{rtCategory}</span></p>
                    </div>
                    <div className="text-right font-sans">
                      <span className="text-xs font-bold font-mono" style={{ color: pillarColor }}>{progress}%</span>
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

      {/* Daily Focus Modal */}
      {isTodoModalOpen && (
        <DailyTodoModal
          todos={todos}
          onAdd={handleAddTodo}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
          onClose={() => setIsTodoModalOpen(false)}
          completedCount={todoCompletedCount}
          totalCount={todoTotalCount}
          progressPct={todoProgressPct}
        />
      )}

    </div>
  );
}