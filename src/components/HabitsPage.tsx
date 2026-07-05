import React, { useState, useEffect } from 'react';
import {
  Zap, Clock, Repeat, Plus, Check, Play, Pause, RotateCcw,
  ChevronLeft, MoreVertical, Trash2, Pencil, Undo2,
  Dumbbell, BookOpen, Heart, Brain, Sparkles, CalendarDays,
  Target, Moon, ListChecks, CheckCircle2, TrendingUp, FlameKindling
} from 'lucide-react';
import { Habit, Category, Routine } from '../types';
import { dateToday, isHabitScheduledForDate, formatDateString, getStandaloneHabits } from '../data';
import CategoryDetailView from './CategoryDetailView';
import { useToast } from './Toast';

// ─── CATEGORY CONFIG ───────────────────────────────────────────────────────────
const CAT_CFG: Record<string, { color: string; emoji: string; icon: React.ElementType }> = {
  Fitness:  { color: '#12B886', emoji: '🏃', icon: Dumbbell },
  Reading:  { color: '#339AF0', emoji: '📚', icon: BookOpen },
  Diet:     { color: '#FD7E14', emoji: '🥗', icon: Heart },
  Skill:    { color: '#FCC419', emoji: '🎯', icon: Target },
  Mindset:  { color: '#845EF7', emoji: '🧘', icon: Brain },
  Rest:     { color: '#06B6D4', emoji: '😴', icon: Moon },
};

const getCatConfig = (cat: Category) => CAT_CFG[cat] ?? { color: '#868E96', emoji: '⭐', icon: Sparkles };

// ─── ROUTINE DOMINANT CATEGORY ────────────────────────────────────────────────
const getRoutineDomCategory = (routine: Routine, habits: Habit[]): Category => {
  const rh = habits.filter(h => routine.habitIds.includes(h.id));
  if (rh.length === 0) return 'Mindset';
  const counts: Record<string, number> = {};
  rh.forEach(h => { counts[h.category] = (counts[h.category] || 0) + 1; });
  let maxCat: Category = rh[0].category;
  let maxN = 0;
  Object.keys(counts).forEach(cat => {
    if (counts[cat]! > maxN) { maxN = counts[cat]!; maxCat = cat as Category; }
  });
  return maxCat;
};

const getHabitTimeframeLocal = (habit: Habit, routines: Routine[]): 'Morning'|'Evening'|'Night'|'Anytime' => {
  const parent = routines.find(r => r.habitIds.includes(habit.id));
  if (parent) {
    if (parent.timeBlock === 'Morning') return 'Morning';
    if (parent.timeBlock === 'Evening') return 'Evening';
    if (parent.timeBlock === 'Night')   return 'Night';
  }
  if (habit.timeOfDay) {
    const tod = habit.timeOfDay.toLowerCase().trim();
    if (tod === 'anytime' || tod === 'constant' || tod === 'none') return 'Anytime';
    const m = tod.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (m) {
      let hr = parseInt(m[1], 10);
      if (m[3] === 'pm' && hr < 12) hr += 12;
      if (m[3] === 'am' && hr === 12) hr = 0;
      if (hr >= 4 && hr < 12)  return 'Morning';
      if (hr >= 12 && hr < 18) return 'Evening';
      return 'Night';
    }
    if (tod.includes('morning'))                              return 'Morning';
    if (tod.includes('evening') || tod.includes('afternoon')) return 'Evening';
    if (tod.includes('night'))                                return 'Night';
  }
  return 'Anytime';
};

// ─── PROPS ────────────────────────────────────────────────────────────────────
interface HabitsPageProps {
  habits: Habit[];
  routines: Routine[];
  onLogHabit: (id: string, value: number) => void;
  onDeleteHabit: (id: string) => void;
  deletingHabitId: string | null;
  openCreateHabit: () => void;
  openCreateRoutine: () => void;
  onEditHabit: (habit: Habit) => void;
  onRevertHabit: (id: string) => void;
  onEditRoutine: (routine: Routine) => void;
  onDeleteRoutine: (routineId: string) => void;
  onAddHabitToRoutine: (routineId: string) => void;
  selectedRoutineId: string | null;
  setSelectedRoutineId: (id: string | null) => void;
  selectedCategoryId: Category | null;
  setSelectedCategoryId: (cat: Category | null) => void;
}

export default function HabitsPage({
  habits, routines, onLogHabit, onDeleteHabit, deletingHabitId,
  openCreateHabit, openCreateRoutine, onEditHabit, onRevertHabit,
  onEditRoutine, onDeleteRoutine, onAddHabitToRoutine,
  selectedRoutineId, setSelectedRoutineId, selectedCategoryId, setSelectedCategoryId,
}: HabitsPageProps) {
  const toast = useToast();
  const [activeSubTab,    setActiveSubTab]    = useState<'all'|'routines'>('all');
  const [selectedFilter,  setSelectedFilter]  = useState<'active'|'completed'>('active');
  const [selectedCategory,setSelectedCategory]= useState<Category|'All'>('All');
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [menuOpenId,      setMenuOpenId]      = useState<string | null>(null);
  const [activeTimerId,   setActiveTimerId]   = useState<string | null>(null);
  const [timeLeft,        setTimeLeft]        = useState<number>(0);
  const [isTimerRunning,  setIsTimerRunning]  = useState<boolean>(false);

  // Focus timer tick
  useEffect(() => {
    let id: any = null;
    if (isTimerRunning && activeTimerId && timeLeft > 0) {
      id = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            const h = habits.find(h => h.id === activeTimerId);
            if (h) {
              onLogHabit(h.id, h.target);
              toast.success(`Focus session complete for "${h.name}"!`);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(id);
  }, [isTimerRunning, activeTimerId, timeLeft, habits]);

  const startTimer = (habitId: string, mins: number) => {
    setActiveTimerId(habitId); setTimeLeft(mins * 60); setIsTimerRunning(true);
  };

  const standaloneHabits = getStandaloneHabits(habits, routines);

  const getCategoryStats = (cat: Category) => {
    const ch = standaloneHabits.filter(h => h.category === cat);
    if (!ch.length) return 0;
    return Math.round(ch.reduce((s, h) =>
      s + Math.min(100, ((h.history[dateToday]||0)/h.target)*100), 0) / ch.length);
  };

  const filteredHabits = standaloneHabits.filter(h => {
    if (!isHabitScheduledForDate(h, dateToday)) return false;
    const done = (h.history[dateToday]||0) >= h.target;
    return (selectedFilter === 'active' ? !done : done) &&
      (selectedCategory === 'All' || h.category === selectedCategory);
  });

  const scheduledToday = standaloneHabits.filter(h => isHabitScheduledForDate(h, dateToday));
  const remainingCount = scheduledToday.filter(h => (h.history[dateToday]||0) < h.target).length;

  // ── CATEGORY DETAIL VIEW ──────────────────────────────────────────────────
  if (selectedCategoryId) {
    return (
      <div className="max-w-5xl mx-auto py-2 p-4">
        <CategoryDetailView
          category={selectedCategoryId}
          habits={habits}
          onLogHabit={onLogHabit}
          onBack={() => setSelectedCategoryId(null)}
        />
      </div>
    );
  }

  // ── ROUTINE DETAIL VIEW ───────────────────────────────────────────────────
  if (selectedRoutineId) {
    const rt = routines.find(r => r.id === selectedRoutineId);
    if (!rt) { setSelectedRoutineId(null); return null; }
    const rh = habits.filter(h => rt.habitIds.includes(h.id));
    const doneInRt = rh.filter(h => (h.history[dateToday]||0) >= h.target).length;
    const allDone = rh.length > 0 && doneInRt === rh.length;
    const progressPct = rh.length > 0 ? Math.round((doneInRt / rh.length) * 100) : 0;

    // 7-day consistency
    let consistency7 = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (rt.completedHistory?.[formatDateString(d)]) consistency7++;
    }

    const timeBlockColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
      Morning: { bg: 'bg-amber-500/10',  text: 'text-amber-300',  border: 'border-amber-500/25',  glow: '#F59E0B' },
      Evening: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/25', glow: '#F97316' },
      Night:   { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/25', glow: '#6366F1' },
      Constant:{ bg: 'bg-emerald-500/10',text: 'text-emerald-300',border: 'border-emerald-500/25',glow: '#10B981' },
    };
    const tbColor = timeBlockColors[rt.timeBlock] ?? { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/25', glow: '#8B5CF6' };

    return (
      <div className="max-w-3xl mx-auto space-y-5 p-4 md:p-0">
        {/* Back button */}
        <button onClick={() => setSelectedRoutineId(null)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white transition cursor-pointer group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Routines
        </button>

        {/* ── Hero Header ── */}
        <div className="relative bg-gradient-to-br from-[#13151E] to-[#0E101A] border border-[#222631] rounded-2xl p-6 shadow-2xl overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: tbColor.glow }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none"
            style={{ background: tbColor.glow }} />

          <div className="relative">
            {/* Time block badge + routine name */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest font-bold ${tbColor.bg} ${tbColor.border} ${tbColor.text} border px-2.5 py-0.5 rounded-full uppercase`}>
                  <span>{
                    rt.timeBlock === 'Morning' ? '☀️' :
                    rt.timeBlock === 'Evening' ? '🌇' :
                    rt.timeBlock === 'Night'   ? '🌙' : '🔄'
                  }</span>
                  {rt.timeBlock} Block
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-2 leading-tight">{rt.name}</h2>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <Repeat className="w-3 h-3" />
                  {rt.repeat} · {rh.length} habit{rh.length !== 1 ? 's' : ''}
                </p>
              </div>
              {/* Points badge */}
              <div className="shrink-0 flex flex-col items-end gap-3">
                <div className="bg-[#FCC419]/10 border border-[#FCC419]/25 rounded-xl px-3 py-2 text-center">
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Bonus Award</span>
                  <span className="text-lg font-black text-[#FCC419] flex items-center gap-1 justify-center">
                    <Zap className="w-4 h-4 fill-[#FCC419]" /> {rt.points} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Big Progress Arc + Stats */}
            <div className="mt-5 pt-5 border-t border-[#1C1F2B] grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-white font-mono">{progressPct}%</span>
                  <span className="text-xs text-gray-500">today</span>
                </div>
                <div className="w-full h-2.5 bg-[#171924] rounded-full overflow-hidden border border-[#1E2130]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      allDone
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5 font-mono">{doneInRt} of {rh.length} habits complete</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-500 uppercase block mb-1">7-Day Streak</span>
                <span className="text-2xl font-black text-white font-mono">{consistency7}<span className="text-sm text-gray-500">/7</span></span>
                <div className="flex gap-1 justify-end mt-1.5">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(); d.setDate(d.getDate() - (6 - i));
                    const hit = rt.completedHistory?.[formatDateString(d)];
                    return (
                      <div key={i} className={`w-2.5 h-2.5 rounded-sm ${ hit ? 'bg-emerald-400' : 'bg-[#1E2130]' }`} />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div className="space-y-2">
          {/* Primary CTA */}
          {!allDone && rh.length > 0 && (
            <button
              type="button"
              onClick={() => rh.filter(h => (h.history[dateToday]||0) < h.target).forEach(h => onLogHabit(h.id, Math.max(0, h.target - (h.history[dateToday]||0))))}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm px-4 py-3.5 rounded-xl cursor-pointer transition shadow-lg shadow-emerald-500/20 active:scale-95 min-h-[48px]"
            >
              <CheckCircle2 className="w-5 h-5" />
              Complete All Habits
              <span className="text-[11px] opacity-75 font-mono bg-black/20 px-2 py-0.5 rounded-full">
                {rh.length - doneInRt} left
              </span>
            </button>
          )}
          {allDone && rh.length > 0 && (
            <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-sm px-4 py-3.5 rounded-xl min-h-[48px]">
              <Check className="w-5 h-5 stroke-[3px]" />
              Routine Complete! 🎉
            </div>
          )}

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddHabitToRoutine(rt.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1D2A] hover:bg-[#22263A] border border-purple-500/25 hover:border-purple-500/50 text-purple-400 font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer transition active:scale-95 min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Habit
            </button>
            <button
              type="button"
              onClick={() => onEditRoutine(rt)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1D2A] hover:bg-[#22263A] border border-[#2A2F40] hover:border-gray-600 text-gray-300 font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer transition active:scale-95 min-h-[40px]"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => onDeleteRoutine(rt.id)}
              className="flex items-center justify-center gap-1.5 bg-red-500/8 hover:bg-red-500/15 border border-red-500/25 hover:border-red-500/40 text-red-400 font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer transition active:scale-95 min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Habit Steps ── */}
        <div className="bg-[#12141A] border border-[#222631] rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1F2B]">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Routine Steps</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-500 bg-[#1A1D25] border border-[#252A38] px-2.5 py-0.5 rounded-full">
                {doneInRt}/{rh.length} done
              </span>
            </div>
          </div>

          {rh.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm font-bold text-gray-300">No habits in this routine yet</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Add your first habit to get started</p>
              <button
                type="button"
                onClick={() => onAddHabitToRoutine(rt.id)}
                className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition"
              >
                <Plus className="w-4 h-4" /> Add First Habit
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#1C1F2B]">
              {rh.map((item, idx) => {
                const val  = item.history[dateToday] || 0;
                const pct  = Math.min(100, Math.round((val / item.target) * 100));
                const done = val >= item.target;
                const rem  = Math.max(0, item.target - val);
                const cfg  = getCatConfig(item.category);
                return (
                  <div key={item.id} className={`group relative overflow-hidden transition-all duration-200 ${
                    done ? 'bg-emerald-500/5' : 'hover:bg-[#161922]'
                  }`}>
                    {/* Progress fill */}
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-700 pointer-events-none ${
                        done ? 'opacity-60' : 'opacity-40'
                      }`}
                      style={{
                        width: `${pct}%`,
                        background: done
                          ? 'linear-gradient(90deg, rgba(16,185,129,0.08), transparent)'
                          : `linear-gradient(90deg, ${cfg.color}10, transparent)`
                      }}
                    />
                    <div className="relative flex items-center gap-3 px-5 py-4">
                      {/* Step circle */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs font-mono transition-all ${
                        done
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                          : 'bg-[#12141D] border-2 border-[#2E3547] text-gray-500'
                      }`}>
                        {done ? <Check className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border"
                            style={{ color: cfg.color, borderColor: `${cfg.color}30`, background: `${cfg.color}12` }}>
                            {item.category}
                          </span>
                          {done ? (
                            <span className="text-[9px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-1.5 rounded border border-emerald-500/25">
                              ✓ Done
                            </span>
                          ) : pct > 0 ? (
                            <span className="text-[9px] text-purple-400 font-mono">{pct}%</span>
                          ) : null}
                        </div>
                        <h4 className={`text-sm font-bold leading-snug ${ done ? 'text-emerald-300 line-through decoration-emerald-500/40' : 'text-white' }`}>
                          {item.name}
                        </h4>
                        {!done && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="h-1 bg-[#1E2130] rounded-full overflow-hidden flex-1 max-w-[120px]">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: cfg.color }} />
                            </div>
                            <span className="text-[10px] text-gray-600 font-mono">{rem} {item.unit} left</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Delete habit (always visible on hover) */}
                        <button
                          type="button"
                          onClick={() => onDeleteHabit(item.id)}
                          disabled={!!deletingHabitId}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-30"
                          title="Delete habit"
                        >
                          {deletingHabitId === item.id
                            ? <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                        {/* Edit habit */}
                        <button
                          type="button"
                          onClick={() => onEditHabit(item)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 transition cursor-pointer"
                          title="Edit habit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!done ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onLogHabit(item.id, Math.ceil(item.target / 3))}
                              className="bg-[#1E2130] hover:bg-[#252A3C] border border-[#2A3040] text-gray-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition font-mono"
                            >
                              +{Math.ceil(item.target / 3)}
                            </button>
                            <button
                              type="button"
                              onClick={() => onLogHabit(item.id, rem)}
                              className="bg-emerald-500/12 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition whitespace-nowrap"
                            >
                              Done ✓
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRevertHabit(item.id)}
                            className="bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1"
                          >
                            <Undo2 className="w-3 h-3" /> Undo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: Add Habit to Routine */}
          <div className="px-5 py-4 border-t border-[#1C1F2B]">
            <button
              type="button"
              onClick={() => onAddHabitToRoutine(rt.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-purple-500/25 hover:border-purple-500/50 rounded-xl text-[11px] font-bold text-purple-400 hover:bg-purple-500/5 transition cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Habit to this Routine
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN HABITS PAGE ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-0">

      {/* Category filter row */}
      <div className="flex flex-nowrap items-center gap-2 border-b border-[#1A1D24] pb-4 overflow-x-auto scrollbar-hide">
        {(['All','Fitness','Reading','Diet','Skill','Mindset','Rest'] as const).map(cat => {
          const isA = selectedCategory === cat;
          const prog = cat !== 'All' ? getCategoryStats(cat as Category) : 0;
          const color = cat !== 'All' ? getCatConfig(cat as Category).color : '#4ecf7f';
          const emoji = cat !== 'All' ? getCatConfig(cat as Category).emoji : '';
          return (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 ${
                isA ? 'bg-[#181C24] border border-[#2E3547] text-white shadow-lg'
                    : 'bg-[#121419]/60 border border-transparent text-gray-400 hover:text-white hover:bg-[#1A1C24]'
              }`}>
              {emoji && <span>{emoji}</span>}
              <span>{cat}</span>
              {cat !== 'All' && (
                <span className="text-[10px] font-mono font-bold bg-[#1B1E29] rounded px-1.5 py-0.5"
                  style={{ color: isA ? color : '#666' }}>{prog}%</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab + action buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex space-x-1 bg-[#12141A] border border-[#212431] p-1 rounded-xl w-fit">
          {(['all','routines'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all capitalize ${
                activeSubTab === tab ? 'bg-[#1E212E] text-white border border-[#2F3446]' : 'text-gray-400 hover:text-white'
              }`}>
              {tab === 'all' ? 'All habits' : 'Routines'}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3">
          {activeSubTab === 'routines' && (
            <button onClick={openCreateRoutine}
              className="flex items-center space-x-1.5 bg-transparent border border-[#12B886]/30 text-[#12B886] font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition hover:bg-[#12B886]/10">
              <Plus className="w-4 h-4" /><span>Routine</span>
            </button>
          )}
          <button onClick={openCreateHabit}
            className="flex items-center space-x-1.5 bg-[#12B886] hover:bg-[#0E906B] text-[#0A0D10] font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-emerald-500/15">
            <Plus className="w-4 h-4 stroke-[3px]" /><span>New habit</span>
          </button>
        </div>
      </div>

      {/* Active / Completed filter */}
      {activeSubTab === 'all' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex space-x-2.5">
              {(['active','completed'] as const).map(f => {
                const isA = selectedFilter === f;
                const count = f === 'active' ? remainingCount : scheduledToday.length - remainingCount;
                return (
                  <button key={f} onClick={() => setSelectedFilter(f)}
                    className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition ${
                      isA ? 'bg-[#181C25] border border-emerald-500/15 text-white shadow-lg'
                          : 'bg-[#12141A]/60 border border-transparent text-gray-400 hover:text-white'
                    }`}>
                    <span className="capitalize">{f}</span>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-extrabold ${
                      isA ? 'bg-[#12B886]/10 text-[#12B886]' : 'bg-gray-800 text-gray-400'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              {remainingCount} remaining
            </span>
          </div>
          <hr className="border-[#1C1F2B]" />
        </>
      )}

      {/* ── ALL HABITS GRID ── */}
      {activeSubTab === 'all' ? (
        <div className="space-y-8">
          {(() => {
            const timeframes = [
              { id: 'Anytime' as const, label: 'ANYTIME' },
              { id: 'Morning' as const, label: 'MORNING' },
              { id: 'Evening' as const, label: 'EVENING' },
              { id: 'Night'   as const, label: 'NIGHT' },
            ];
            const blocks = timeframes.map(tf => {
              const group = filteredHabits.filter(h => getHabitTimeframeLocal(h, routines) === tf.id);
              if (!group.length) return null;
              return (
                <div key={tf.id} className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono select-none">
                    {tf.label}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.map(item => {
                      const val  = item.history[dateToday] || 0;
                      const pct  = Math.min(100, Math.round((val/item.target)*100));
                      const done = val >= item.target;
                      const rem  = Math.max(0, item.target - val);
                      const isExp = expandedHabitId === item.id;
                      const cfg  = getCatConfig(item.category);
                      const shortcuts = item.type === 'Timer' ? [10,15,30] : [1,3,5];

                      return (
                        <div key={item.id}
                          className="bg-[#12141A] border border-[#222631] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between hover:border-gray-700/60 transition group border-l-[5px]"
                          style={{ borderLeftColor: cfg.color }}>
                          <div className="space-y-3">
                            {/* Name + menu */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                                <h4 className="text-base font-extrabold text-white tracking-tight leading-tight">
                                  {item.name}
                                </h4>
                              </div>
                              <div className="relative shrink-0">
                                <button type="button"
                                  onClick={() => { setMenuOpenId(menuOpenId === item.id ? null : item.id); setExpandedHabitId(null); }}
                                  className={`text-gray-500 group-hover:text-gray-300 p-1.5 rounded-lg hover:bg-[#1C1F2B] transition min-h-[32px] min-w-[32px] flex items-center justify-center ${menuOpenId === item.id ? 'bg-gray-800 text-white' : ''}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {menuOpenId === item.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-[#1A1D27] border border-[#2A3040] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                                      <button type="button" onClick={() => { setMenuOpenId(null); onEditHabit(item); }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-gray-300 hover:bg-[#242938] hover:text-white transition cursor-pointer">
                                        <Pencil className="w-3.5 h-3.5 text-purple-400" /> Edit Habit
                                      </button>
                                      {item.enableFocusTimer && (
                                        <button type="button" onClick={() => { setMenuOpenId(null); setExpandedHabitId(isExp ? null : item.id); }}
                                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-gray-300 hover:bg-[#242938] hover:text-white transition cursor-pointer">
                                          <Clock className="w-3.5 h-3.5 text-[#12B886]" /> Focus Timer
                                        </button>
                                      )}
                                      {done && (
                                        <button type="button" onClick={() => { setMenuOpenId(null); onRevertHabit(item.id); }}
                                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition cursor-pointer">
                                          <Undo2 className="w-3.5 h-3.5" /> Revert to Active
                                        </button>
                                      )}
                                      <button type="button" onClick={() => { setMenuOpenId(null); onDeleteHabit(item.id); }}
                                        disabled={!!deletingHabitId}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-50">
                                        {deletingHabitId === item.id ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        Delete Habit
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono font-bold select-none">
                              <span className="tracking-widest uppercase px-1.5 py-0.5 border rounded"
                                style={{ color: cfg.color, borderColor: `${cfg.color}25`, background: `${cfg.color}08` }}>
                                {item.category}
                              </span>
                              <span className="flex items-center px-1.5 py-0.5 border border-[#FCC419]/25 bg-[#FCC419]/05 text-[#FCC419] rounded">
                                <Zap className="w-3 h-3 mr-0.5 fill-[#FCC419]" />{item.routineId ? 0 : item.points}
                              </span>
                              <span className="flex items-center px-1.5 py-0.5 border border-gray-800 bg-gray-900/10 text-gray-500 rounded">
                                <Clock className="w-3 h-3 mr-0.5" />{item.timeOfDay || 'Anytime'}
                              </span>
                              <span className="flex items-center px-1.5 py-0.5 border border-gray-800 bg-gray-900/10 text-gray-500 rounded">
                                <Repeat className="w-3 h-3 mr-0.5" />{item.repeat === 'Daily' ? 'daily' : item.repeat.toLowerCase()}
                              </span>
                            </div>

                            {/* Progress */}
                            <div className="flex justify-between items-center text-xs font-bold mt-4 select-none">
                              <span style={{ color: cfg.color }}>{pct}%</span>
                              <span className="text-gray-500 font-mono">{rem} {item.unit} left</span>
                            </div>
                            <div className="w-full h-1 bg-[#171924]/90 border border-[#212431]/80 rounded-full overflow-hidden">
                              <div className="h-full transition-all duration-300 rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: cfg.color, boxShadow: `0 0 6px ${cfg.color}88` }} />
                            </div>

                            {/* Shortcut buttons */}
                            <div className="flex gap-2 pt-1 select-none">
                              {shortcuts.map(val => (
                                <button key={val} onClick={() => onLogHabit(item.id, val)}
                                  className="border border-[#12B886]/15 bg-[#12B886]/03 text-[#12B886] hover:bg-[#12B886]/10 py-3 min-h-[44px] rounded-xl flex-1 text-xs font-extrabold cursor-pointer transition font-mono text-center active:scale-95">
                                  +{val}{item.type === 'Timer' ? 'm' : ''}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Complete / Revert */}
                          <div className="mt-3">
                            {done ? (
                              <div className="space-y-2">
                                <div className="w-full bg-[#12B886]/10 border border-[#12B886]/30 text-[#12B886] py-3 min-h-[44px] px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5 select-none">
                                  <Check className="w-4 h-4 stroke-[3px]" /><span>Done for Today!</span>
                                </div>
                                <button type="button" onClick={() => onRevertHabit(item.id)}
                                  className="w-full bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-400 py-2.5 min-h-[40px] px-3 rounded-xl text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-95">
                                  <Undo2 className="w-3.5 h-3.5" /> Revert to Active
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => onLogHabit(item.id, rem)}
                                className="w-full bg-[#12b886]/10 hover:bg-[#12b886]/20 border border-[#12b886]/30 hover:border-[#12b886]/50 text-[#12b886] py-3 min-h-[44px] px-3 rounded-xl text-xs font-extrabold cursor-pointer transition text-center flex items-center justify-center space-x-1.5 select-none active:scale-95">
                                <Check className="w-4 h-4 stroke-[3px]" />
                                <span>Complete Habit</span>
                                <span className="text-[10px] font-mono opacity-80">(+{rem} {item.unit})</span>
                              </button>
                            )}
                          </div>

                          {/* Focus timer panel */}
                          {isExp && item.enableFocusTimer && (
                            <div className="mt-3 pt-3 border-t border-[#1C1F2B]/80 space-y-3">
                              <div className="bg-[#181C26] border border-[#242A3A] rounded-xl p-2 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="p-1 px-2 rounded bg-[#12B886]/10 text-[#12B886] font-mono text-xs font-bold">
                                    {activeTimerId === item.id
                                      ? `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`
                                      : `${item.target}m`}
                                  </div>
                                  <span className="text-[9px] font-mono text-gray-500 uppercase">Focus Timer</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  {activeTimerId === item.id && isTimerRunning ? (
                                    <button type="button" onClick={() => setIsTimerRunning(false)}
                                      className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-500 p-1 rounded">
                                      <Pause className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button type="button" onClick={() => startTimer(item.id, item.target)}
                                      className="bg-[#12B886]/10 border border-[#12B886]/30 text-[#12B886] p-1 rounded">
                                      <Play className="w-3 h-3 fill-current" />
                                    </button>
                                  )}
                                  <button type="button"
                                    onClick={() => { setActiveTimerId(null); setIsTimerRunning(false); setTimeLeft(0); }}
                                    className="bg-gray-800 border border-gray-700 text-gray-400 p-1 rounded">
                                    <RotateCcw className="w-3 h-3" />
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

            const any = blocks.some(b => b !== null);
            if (!scheduledToday.length) return (
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-5">
                  <Sparkles className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">No Habits Scheduled Today</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                  Create your first habit to start tracking progress and earning points.
                </p>
                <button onClick={openCreateHabit}
                  className="mt-6 flex items-center space-x-2 bg-[#12B886] hover:bg-[#0E906B] text-[#0A0D10] font-extrabold text-sm px-5 py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-emerald-500/15">
                  <Plus className="w-4 h-4 stroke-[3px]" /><span>Create Your First Habit</span>
                </button>
              </div>
            );
            return any ? blocks : (
              <div className="h-64 bg-[#121419]/70 border border-dashed border-[#222631] text-center p-12 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-3xl">🧘</span>
                <h3 className="text-base font-bold text-white mt-3">All habits filtered out</h3>
                <p className="text-xs text-gray-500 mt-1">Adjust your filter or create a new habit.</p>
              </div>
            );
          })()}
        </div>
      ) : (
        /* ── ROUTINES GRID ── */
        <div className="space-y-4">
          {!routines.length ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-5">
                <CalendarDays className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">No Routines Yet</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Group habits into a routine to earn bonus XP when you complete them all.
              </p>
              <button onClick={openCreateRoutine}
                className="mt-6 flex items-center space-x-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-sm px-5 py-2.5 rounded-xl cursor-pointer transition">
                <Plus className="w-4 h-4" /><span>Create Your First Routine</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {routines.map(rt => {
                const rh   = habits.filter(h => rt.habitIds.includes(h.id) && isHabitScheduledForDate(h, dateToday));
                const done = rh.filter(h => (h.history[dateToday]||0) >= h.target).length;
                const pct  = rh.length > 0 ? Math.round((done/rh.length)*100) : 0;
                const allDone = rh.length > 0 && done === rh.length;
                const domCat = getRoutineDomCategory(rt, habits);
                const cfg = getCatConfig(domCat);
                const IconComp = cfg.icon;
                const pillarColor = cfg.color;
                const timeBlockEmoji = rt.timeBlock === 'Morning' ? '☀️' : rt.timeBlock === 'Evening' ? '🌇' : rt.timeBlock === 'Night' ? '🌙' : '🔄';
                return (
                  <div
                    key={rt.id}
                    className="group relative bg-[#12141A] hover:bg-[#171A26] border rounded-2xl shadow-lg overflow-hidden transition-all duration-200 flex flex-col"
                    style={{ borderColor: allDone ? 'rgba(18,184,134,0.3)' : `${pillarColor}22` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = allDone ? 'rgba(18,184,134,0.5)' : `${pillarColor}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = allDone ? 'rgba(18,184,134,0.3)' : `${pillarColor}22`; }}
                  >
                    {/* Color accent strip */}
                    <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${pillarColor}, ${pillarColor}44)` }} />

                    {/* Card Body (clickable area) */}
                    <div
                      onClick={() => setSelectedRoutineId(rt.id)}
                      className="flex-1 p-4 cursor-pointer"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center border shrink-0"
                            style={{ backgroundColor: `${pillarColor}14`, borderColor: `${pillarColor}28`, color: pillarColor }}>
                            <IconComp className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white leading-tight">{rt.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold uppercase"
                                style={{ color: pillarColor, borderColor: `${pillarColor}30`, background: `${pillarColor}12` }}>
                                {domCat}
                              </span>
                              <span className="text-[9px] text-gray-500 font-mono">{timeBlockEmoji} {rt.timeBlock}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold font-mono text-[#FCC419] flex items-center gap-0.5 justify-end">
                            <Zap className="w-3 h-3 fill-[#FCC419]" /> {rt.points}
                          </div>
                          <div className="text-[9px] text-gray-500 font-mono">bonus pts</div>
                        </div>
                      </div>

                      {/* Stats */}
                      <p className="text-[11px] text-gray-500 mb-2.5 font-mono">
                        {allDone ? '✅ Complete!' : `${done} of ${rh.length} done today`}
                        {rh.length === 0 && ' · No habits yet'}
                      </p>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between items-baseline text-[10px] mb-1 font-mono">
                          <span style={{ color: pillarColor }}>{pct}%</span>
                          <span className="text-gray-600">{done}/{rh.length}</span>
                        </div>
                        <div className="w-full h-2 bg-[#0E1018] rounded-full overflow-hidden border border-[#1E2130]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: allDone ? 'linear-gradient(90deg, #12B886, #06B6D4)' : pillarColor,
                              boxShadow: pct > 0 ? `0 0 8px ${pillarColor}66` : 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#1C1F2B] bg-[#0E1016]/60">
                      <button
                        type="button"
                        onClick={() => setSelectedRoutineId(rt.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-white transition cursor-pointer"
                      >
                        <ListChecks className="w-3.5 h-3.5" /> View Steps
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEditRoutine(rt); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition cursor-pointer"
                          title="Edit routine"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteRoutine(rt.id); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          title="Delete routine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}