import React, { useState, useEffect } from 'react';
import { X, Zap, Clock, Sparkles, Clipboard, Plus, ShieldCheck } from 'lucide-react';
import { Category, Habit, HabitType, Routine } from '../types';
import { motion } from 'motion/react';

interface CreateHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (habitData: Partial<Habit>) => void;
  onSave?: (id: string, habitData: Partial<Habit>) => void;
  habitToEdit?: Habit | null;
  routines: Routine[];
}

export function CreateHabitModal({ isOpen, onClose, onCreate, onSave, habitToEdit, routines }: CreateHabitModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Fitness');
  const [points, setPoints] = useState(10);
  const [type, setType] = useState<HabitType>('Count');
  const [target, setTarget] = useState<number | string>('');
  const [unit, setUnit] = useState('reps');
  const [repeat, setRepeat] = useState<'Daily' | 'Custom Days' | 'Today Only'>('Daily');
  const [timeBlock, setTimeBlock] = useState<'' | 'Morning' | 'Evening' | 'Night'>('');
  const [enableFocusTimer, setEnableFocusTimer] = useState(false);
  const [routineId, setRoutineId] = useState('');

  useEffect(() => {
    if (habitToEdit) {
      setName(habitToEdit.name || '');
      setCategory(habitToEdit.category || 'Fitness');
      setPoints(habitToEdit.points || 10);
      setType(habitToEdit.type || 'Count');
      setTarget(habitToEdit.target ?? '');
      setUnit(habitToEdit.unit || 'reps');
      setRepeat(habitToEdit.repeat || 'Daily');
      const tod = habitToEdit.timeOfDay || '';
      if (tod === 'Morning' || tod === 'Evening' || tod === 'Night') {
        setTimeBlock(tod);
      } else if (tod.toLowerCase().includes('morning')) {
        setTimeBlock('Morning');
      } else if (tod.toLowerCase().includes('evening') || tod.toLowerCase().includes('afternoon')) {
        setTimeBlock('Evening');
      } else if (tod.toLowerCase().includes('night')) {
        setTimeBlock('Night');
      } else {
        setTimeBlock('');
      }
      setEnableFocusTimer(!!habitToEdit.enableFocusTimer);
      setRoutineId(habitToEdit.routineId || '');
    } else {
      setName('');
      setCategory('Fitness');
      setPoints(10);
      setType('Count');
      setTarget('');
      setUnit('reps');
      setRepeat('Daily');
      setTimeBlock('');
      setEnableFocusTimer(false);
      setRoutineId('');
    }
  }, [habitToEdit, isOpen]);

  const timeBlocks: { id: '' | 'Morning' | 'Evening' | 'Night'; label: string; icon: string }[] = [
    { id: '', label: 'Anytime', icon: '🔄' },
    { id: 'Morning', label: 'Morning', icon: '☀️' },
    { id: 'Evening', label: 'Evening', icon: '🌇' },
    { id: 'Night', label: 'Night', icon: '🌙' },
  ];

  const getDefaultTarget = (habitType: HabitType) => (habitType === 'Timer' ? 30 : 10);

  const resolvedTarget = () => {
    const parsed = Number(target);
    if (target !== '' && !Number.isNaN(parsed) && parsed >= 1) return parsed;
    return getDefaultTarget(type);
  };

  const categories: { id: Category; label: string; icon: string; color: string; activeClass: string }[] = [
    { id: 'Health', label: 'Health', icon: '❤️', color: 'text-rose-400', activeClass: 'border-rose-500 bg-rose-500/10 text-rose-400 ring-2 ring-rose-500/5' },
    { id: 'Fitness', label: 'Fitness', icon: '💪', color: 'text-emerald-400', activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/5' },
    { id: 'Study', label: 'Study', icon: '📝', color: 'text-cyan-400', activeClass: 'border-cyan-500 bg-cyan-500/10 text-cyan-400 ring-2 ring-cyan-500/5' },
    { id: 'Reading', label: 'Reading', icon: '📖', color: 'text-purple-400', activeClass: 'border-purple-500 bg-purple-500/10 text-purple-400 ring-2 ring-purple-500/5' },
    { id: 'Productivity', label: 'Productivity', icon: '⚡', color: 'text-amber-400', activeClass: 'border-amber-500 bg-amber-500/10 text-amber-400 ring-2 ring-amber-500/5' },
    { id: 'Mindfulness', label: 'Mindfulness', icon: '🧘', color: 'text-orange-400', activeClass: 'border-orange-500 bg-orange-500/10 text-orange-400 ring-2 ring-orange-500/5' },
    { id: 'Social', label: 'Social', icon: '👥', color: 'text-blue-400', activeClass: 'border-blue-500 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/5' },
    { id: 'Custom', label: 'Custom', icon: '📌', color: 'text-pink-400', activeClass: 'border-pink-500 bg-pink-500/10 text-pink-400 ring-2 ring-pink-500/5' },
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalTarget = resolvedTarget();

    const payload: Partial<Habit> = {
      name,
      category,
      points,
      type,
      target: finalTarget,
      unit: type === 'Timer' ? 'min' : unit || 'reps',
      repeat,
      timeOfDay: timeBlock || undefined,
      enableFocusTimer,
      routineId: routineId || undefined,
    };

    if (habitToEdit && onSave) {
      onSave(habitToEdit.id, payload);
    } else {
      onCreate(payload);
    }

    // Reset properties to default state if not editing
    if (!habitToEdit) {
      setName('');
      setCategory('Fitness');
      setPoints(10);
      setType('Count');
      setTarget('');
      setUnit('reps');
      setRepeat('Daily');
      setTimeBlock('');
      setEnableFocusTimer(false);
      setRoutineId('');
    }
  };

  const pointPresets = [5, 10, 15, 25, 50];
  const displayTarget = target === '' ? '' : target;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm md:p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full h-[100dvh] md:h-auto md:max-w-md md:max-h-[92vh] bg-[#0C0E14] border-0 md:border border-[#232734] rounded-none md:rounded-2xl shadow-2xl p-4 md:p-5 flex flex-col overflow-hidden text-left font-sans"
      >
        
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full blur-2xl pointer-events-none" />

        {/* Header (More compact) */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1A1E29] relative z-10 shrink-0">
          <div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#12B886] uppercase">
              HABIT CONSTRUCTOR
            </span>
            <h3 className="text-lg font-extrabold text-white font-sans mt-0.5 flex items-center">
              <Sparkles className="w-4 h-4 text-purple-400 mr-2 animate-pulse" />
              {habitToEdit ? 'Edit Habit' : 'Create New Habit'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-[#1A1D27] border border-transparent hover:border-gray-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Sleek layout with smaller elements) */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 relative z-10 overflow-y-auto pr-1 flex-1 min-h-0 pb-safe">
          
          {/* Habit Title */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1">
              Habit Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pull ups, Sleep early, Read 1 chapter"
              required
              className="w-full bg-[#13151D] border border-[#252A39] focus:border-purple-500 focus:ring-1 focus:ring-purple-500/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition font-sans shadow-inner"
            />
          </div>

          {/* Core Categories focusing on micro-pill structure */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1.5">
              Category Focus
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {categories.map((cat) => {
                const isActive = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border text-[10px] font-bold cursor-pointer transition-all duration-150 ${
                      isActive
                        ? cat.activeClass
                        : 'border-[#1C1F2B] bg-[#12141A]/60 text-gray-450 hover:text-gray-200 hover:bg-[#1A1D27]'
                    }`}
                  >
                    <span className="text-sm mb-0.5">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Type & Frequency Side-by-Side to conserve space */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1">
                Action Type
              </label>
              <div className="flex bg-[#13151D] border border-[#252A39] p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setType('Count');
                    setUnit('reps');
                    if (target === '') setTarget('');
                  }}
                  className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                    type === 'Count'
                      ? 'bg-[#1E212E] text-white border border-[#2F3446] shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Count
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('Timer');
                    setUnit('min');
                    if (target === '') setTarget('');
                  }}
                  className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                    type === 'Timer'
                      ? 'bg-[#1E212E] text-white border border-[#2F3446] shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Timer
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1">
                Frequency
              </label>
              <div className="flex bg-[#13151D] border border-[#252A39] p-0.5 rounded-xl">
                {(['Daily', 'Today Only'] as const).map((opt) => {
                  const isSel = repeat === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRepeat(opt)}
                      className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                        isSel
                          ? 'bg-[#1E212E] text-white border border-[#2F3446] shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Points & presets merged into sleek bar */}
          <div className="bg-[#13151D] border border-[#252A39] rounded-xl px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center text-white font-extrabold text-xs font-sans shrink-0">
              <Zap className="w-4 h-4 text-[#FCC419] mr-1.5 fill-[#FCC419]" />
              <span>{points} pts</span>
            </div>
            
            <div className="flex gap-1 max-w-xs justify-end flex-1">
              {pointPresets.map((val) => {
                const isSel = points === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPoints(val)}
                    className={`px-2 py-1 text-[9px] font-mono font-bold rounded-lg border transition cursor-pointer ${
                      isSel
                        ? 'bg-[#FCC419]/10 text-[#FCC419] border-[#FCC419]/30'
                        : 'bg-[#1A1D27]/80 hover:bg-gray-800 text-gray-450 border-[#242939]'
                    }`}
                  >
                    +{val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target specifications row (more ultra compact) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1">
                Target Objective
              </label>
              <div className="flex items-center space-x-1 bg-[#13151D] border border-[#252A39] rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setTarget(Math.max(1, (Number(target) || 1) - 1))}
                  className="w-6 h-6 rounded-lg bg-[#242A38] border border-[#3E4962] text-white text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={displayTarget}
                  placeholder={String(getDefaultTarget(type))}
                  onChange={(e) => setTarget(e.target.value)}
                  onBlur={() => {
                    if (target === '') return;
                    const parsed = Number(target);
                    if (!Number.isNaN(parsed) && parsed >= 1) {
                      setTarget(parsed);
                    } else {
                      setTarget('');
                    }
                  }}
                  className="w-full bg-transparent border-0 text-center text-white placeholder-gray-600 focus:outline-none focus:ring-0 font-bold font-mono text-xs p-0"
                />
                <button
                  type="button"
                  onClick={() => setTarget((Number(target) || 1) + 1)}
                  className="w-6 h-6 rounded-lg bg-[#242A38] border border-[#3E4962] text-white text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1">
                Measurement Unit
              </label>
              <input
                type="text"
                disabled={type === 'Timer'}
                value={type === 'Timer' ? 'min' : unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="reps, times, pages, km"
                className={`w-full bg-[#13151D]/80 border border-[#252A39] rounded-xl px-3 py-1.5 text-center text-xs text-white focus:outline-none focus:border-purple-500 font-mono ${type === 'Timer' ? 'opacity-40 select-none' : ''}`}
              />
            </div>
          </div>

          {/* Time block (optional) */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1.5 flex items-center">
              <Clock className="w-3 h-3 mr-1 text-gray-500" />
              Time Block (Optional)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {timeBlocks.map((blk) => {
                const isActive = timeBlock === blk.id;
                return (
                  <button
                    key={blk.id || 'anytime'}
                    type="button"
                    onClick={() => setTimeBlock(blk.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[9px] font-bold cursor-pointer transition ${
                      isActive
                        ? 'border-[#12B886] bg-[#12B886]/10 text-white'
                        : 'border-[#1C1F2B] bg-[#12141A]/60 text-gray-450 hover:text-white hover:bg-[#1A1D27]'
                    }`}
                  >
                    <span className="text-sm mb-0.5">{blk.icon}</span>
                    <span>{blk.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link routine (optional) */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase mb-1 flex items-center">
              <Clipboard className="w-3 h-3 mr-1 text-gray-500" />
              Link Routine (Optional)
            </label>
            <select
              value={routineId}
              onChange={(e) => setRoutineId(e.target.value)}
              className="w-full bg-[#13151D] border border-[#252A39] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
            >
              <option value="">None (Independent)</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Pomodoro slider box (Snug layout) */}
          <div className="bg-[#13151D] border border-[#252A39] p-3 rounded-xl flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="focusTimerCheck"
              checked={enableFocusTimer}
              onChange={(e) => setEnableFocusTimer(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 text-purple-500 border border-gray-750 rounded bg-[#13151D] focus:ring-purple-500"
            />
            <div>
              <label htmlFor="focusTimerCheck" className="text-xs font-bold text-white select-none cursor-pointer font-sans block flex items-center">
                Enable Focus Clock (Pomodoro Mode)
              </label>
              <p className="text-[9px] text-gray-500 font-sans mt-0.5 leading-tight">
                Adds interactive stopwatch/clock tools directly inside the habit card listing.
              </p>
            </div>
          </div>

          {/* Footer controls button */}
          <div className="flex space-x-2.5 pt-3 border-t border-[#1A1E29] shrink-0 sticky bottom-0 bg-[#0C0E14]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#151722] hover:bg-[#1E2131] border border-[#252C3E] text-[11px] font-bold text-gray-400 hover:text-white py-2.5 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[11px] font-extrabold text-[#0B0F19] py-2.5 rounded-xl transition cursor-pointer shadow-md uppercase tracking-wider min-h-[44px]"
            >
              {habitToEdit ? 'Save Changes' : 'Construct Habit'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (routineData: any) => void;
}

export function CreateRoutineModal({ isOpen, onClose, onCreate }: CreateRoutineModalProps) {
  const [name, setName] = useState('');
  const [awardPoints, setAwardPoints] = useState(25);
  const [timeBlock, setTimeBlock] = useState<'Morning' | 'Evening' | 'Night' | 'Constant'>('Morning');
  const [repeat, setRepeat] = useState<'Daily' | 'Custom Days' | 'Today Only'>('Daily');

  // Temporary list to draft habit steps inside the Constructor Modal
  const [habitLines, setHabitLines] = useState<string[]>(['']);

  if (!isOpen) return null;

  const handleAddHabitLine = () => {
    setHabitLines([...habitLines, '']);
  };

  const handleHabitLineChange = (idx: number, value: string) => {
    const updated = [...habitLines];
    updated[idx] = value;
    setHabitLines(updated);
  };

  const handleRemoveHabitLine = (idx: number) => {
    setHabitLines(habitLines.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Filter valid step lines
    const validNames = habitLines.filter(line => line.trim() !== '');

    onCreate({
      name,
      points: Number(awardPoints),
      timeBlock,
      repeat,
      habitNames: validNames,
    });

    // Reset modals variables
    setName('');
    setAwardPoints(25);
    setTimeBlock('Morning');
    setRepeat('Daily');
    setHabitLines(['']);
  };

  const timeBlocks: { id: typeof timeBlock; label: string; icon: string; style: string; activeClass: string }[] = [
    { id: 'Morning', label: 'Morning', icon: '☀️', style: 'border-[#FDAF17]/10 bg-[#FDAF17]/05 text-[#FDAF17]', activeClass: 'border-[#FDAF17] bg-[#FDAF17]/10 text-white shadow-md' },
    { id: 'Evening', label: 'Evening', icon: '🌇', style: 'border-[#F06A33]/10 bg-[#F06A33]/05 text-[#F06A33]', activeClass: 'border-[#F06A33] bg-[#F06A33]/10 text-white shadow-md' },
    { id: 'Night', label: 'Night', icon: '🌙', style: 'border-[#7952B3]/10 bg-[#7952B3]/05 text-[#B197FC]', activeClass: 'border-[#7952B3] bg-[#7952B3]/10 text-white shadow-md' },
    { id: 'Constant', label: 'Constant', icon: '🔄', style: 'border-[#12B886]/10 bg-[#12B886]/05 text-[#12B886]', activeClass: 'border-[#12B886] bg-[#12B886]/10 text-white shadow-md' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm md:p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full h-[100dvh] md:h-auto md:max-w-md md:max-h-[92vh] bg-[#0C0E14] border-0 md:border border-[#232734] rounded-none md:rounded-2xl shadow-2xl p-4 md:p-5 flex flex-col overflow-hidden text-left font-sans"
      >
        
        {/* Subtle top decoration light */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full blur-2xl pointer-events-none" />
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1A1E29] shrink-0">
          <div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#B197FC] uppercase">
              ROUTINE ARCHITECT
            </span>
            <h3 className="text-lg font-extrabold text-white font-sans mt-0.5 flex items-center">
              <Clipboard className="w-4 h-4 text-purple-400 mr-2" />
              Build New Routine
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-[#1A1D27] border border-transparent hover:border-gray-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
          
          {/* Main Title Input (Very slim profile) */}
          <div className="flex items-center space-x-2.5">
            <div className="bg-[#B197FC]/10 text-[#B197FC] p-2.5 rounded-xl border border-[#B197FC]/20 shrink-0 hidden sm:block">
              <Sparkles className="w-4 h-4 fill-current text-purple-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Routine Name (e.g. Morning Focus, Evening Wind-Down)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#13151D] border border-[#252A39] focus:border-purple-500 focus:ring-1 focus:ring-purple-500/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition font-sans shadow-inner"
              />
            </div>
          </div>

          {/* Points Bonus layout with input merged nicely */}
          <div className="bg-[#13151D] border border-[#252A39] rounded-xl p-3">
            <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-gray-450 mb-1.5">
              Routine completion bonus points
            </label>
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1.5 bg-[#1C1F2B] border border-gray-850 px-2 py-0.5 rounded-lg shrink-0">
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={awardPoints}
                  onChange={(e) => setAwardPoints(Math.max(5, Number(e.target.value)))}
                  className="w-10 bg-transparent border-0 text-center text-xs font-black text-[#FCC419] focus:outline-none focus:ring-0 font-mono p-0"
                />
                <span className="text-[10px] text-gray-500">PT</span>
              </div>
              <span className="text-[10px] text-gray-500 leading-tight">
                Awarded as bonus points when you clear all routine tasks today.
              </span>
            </div>
          </div>

          {/* Time Block selection (more compact) */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Assigned Time Block
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {timeBlocks.map((blk) => {
                const isActive = timeBlock === blk.id;
                return (
                  <button
                    key={blk.id}
                    type="button"
                    onClick={() => setTimeBlock(blk.id)}
                    className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isActive
                        ? blk.activeClass
                        : 'border-[#1C1F2B] bg-[#12141A]/50 text-gray-450 hover:bg-[#1A1D27] hover:text-white'
                    }`}
                  >
                    <span className="text-sm mb-0.5">{blk.icon}</span>
                    <span className="text-[9px] font-bold font-sans select-none">{blk.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repeat Selector (lowered heights) */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-1">
              Repeat Schedule
            </label>
            <div className="flex bg-[#13151D] border border-[#252A39] p-0.5 rounded-xl">
              {(['Daily', 'Custom Days', 'Today Only'] as const).map((opt) => {
                const isSel = repeat === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRepeat(opt)}
                    className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${
                      isSel
                        ? 'bg-[#1E212E] text-white border border-[#2F3446] shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Habit Timeline Steps draft (super compact scroll area) */}
          <div>
            <label className="block text-[10px] font-sans font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
              Include Habit Steps ({habitLines.filter(h => h.trim() !== '').length} draft)
            </label>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 select-none">
              {habitLines.map((line, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-[#181C26] border border-gray-800 text-purple-400 text-[10px] font-mono font-black flex items-center justify-center rounded-lg shrink-0">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Meditate for 10 min, Gym progression"
                    value={line}
                    onChange={(e) => handleHabitLineChange(index, e.target.value)}
                    className="flex-1 bg-[#13151D] border border-[#252A39] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans shadow-inner"
                  />
                  {habitLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHabitLine(index)}
                      className="text-gray-500 hover:text-red-400 hover:bg-gray-800 transition text-[10px] font-bold font-mono px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddHabitLine}
              className="mt-2 w-full flex items-center justify-center py-2 border border-dashed border-purple-500/15 hover:border-purple-500/30 rounded-xl text-[10px] font-bold text-purple-400 hover:bg-[#1A1C28]/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add custom steps to timeline</span>
            </button>
          </div>

          {/* Footer controls button */}
          <div className="flex space-x-2.5 pt-3 border-t border-[#1A1E29] shrink-0 sticky bottom-0 bg-[#0C0E14]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#151722]/85 hover:bg-[#1E2131] border border-[#252C3E] text-[11px] font-bold text-gray-400 hover:text-white py-2.5 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-[11px] font-extrabold text-white py-2.5 rounded-xl transition cursor-pointer shadow-md uppercase tracking-wider min-h-[44px]"
            >
              Build Routine ({habitLines.filter(h => h.trim() !== '').length})
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
