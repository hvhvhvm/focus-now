import React, { useState } from 'react';
import { ChevronLeft, Zap, Clock, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Habit, Category, Routine } from '../types';
import { dateToday, getStandaloneHabits } from '../data';

interface CategoryDetailViewProps {
  category: Category;
  habits: Habit[];
  routines?: Routine[];
  onLogHabit: (id: string, value: number) => void;
  onBack: () => void;
}

// Map styles according to Image 12 and 13 design cues
export const getCategoryStyles = (category: Category) => {
  switch (category) {
    case 'Fitness':
      return {
        color: '#12B886', // Neon emerald
        borderClass: 'border-l-[5px] border-l-[#12B886]',
        textColor: 'text-[#12B886]',
        accentClass: 'border-[#12B886]/20 bg-[#12B886]/5 text-[#12B886]',
        progressBarClass: 'bg-[#12B886]',
        buttonClass: 'border-[#12B886]/15 hover:bg-[#12B886]/20 text-[#12B886] hover:text-white',
        inputFocusClass: 'focus:border-[#12B886]/60',
        badgeClass: 'bg-[#12B886]/10 text-[#12B886] border border-[#12B886]/20'
      };
    case 'Reading':
      return {
        color: '#FD7E14', // Warm orange
        borderClass: 'border-l-[5px] border-l-[#FD7E14]',
        textColor: 'text-[#FD7E14]',
        accentClass: 'border-[#FD7E14]/20 bg-[#FD7E14]/5 text-[#FD7E14]',
        progressBarClass: 'bg-[#FD7E14]',
        buttonClass: 'border-[#FD7E14]/15 hover:bg-[#FD7E14]/20 text-[#FD7E14] hover:text-white',
        inputFocusClass: 'focus:border-[#FD7E14]/60',
        badgeClass: 'bg-[#FD7E14]/10 text-[#FD7E14] border border-[#FD7E14]/20'
      };
    case 'Productivity':
      return {
        color: '#FCC419', // Amber yellow
        borderClass: 'border-l-[5px] border-l-[#FCC419]',
        textColor: 'text-[#FCC419]',
        accentClass: 'border-[#FCC419]/25 bg-[#FCC419]/5 text-[#FCC419]',
        progressBarClass: 'bg-[#FCC419]',
        buttonClass: 'border-[#FCC419]/15 hover:bg-[#FCC419]/20 text-[#FCC419] hover:text-white',
        inputFocusClass: 'focus:border-[#FCC419]/60',
        badgeClass: 'bg-[#FCC419]/10 text-[#FCC419] border border-[#FCC419]/20'
      };
    case 'Health':
      return {
        color: '#228BE6', // Clear blue
        borderClass: 'border-l-[5px] border-l-[#228BE6]',
        textColor: 'text-[#339AF0]',
        accentClass: 'border-[#228BE6]/20 bg-[#228BE6]/5 text-[#339AF0]',
        progressBarClass: 'bg-[#228BE6]',
        buttonClass: 'border-[#228BE6]/15 hover:bg-[#228BE6]/20 text-[#228BE6] hover:text-white',
        inputFocusClass: 'focus:border-[#228BE6]/60',
        badgeClass: 'bg-[#228BE6]/10 text-[#228BE6] border border-[#228BE6]/20'
      };
    case 'Mindfulness':
      return {
        color: '#845EF7', // Deep purple
        borderClass: 'border-l-[5px] border-l-[#845EF7]',
        textColor: 'text-[#B197FC]',
        accentClass: 'border-[#845EF7]/20 bg-[#845EF7]/5 text-[#B197FC]',
        progressBarClass: 'bg-[#845EF7]',
        buttonClass: 'border-[#845EF7]/15 hover:bg-[#845EF7]/20 text-[#845EF7] hover:text-white',
        inputFocusClass: 'focus:border-[#845EF7]/60',
        badgeClass: 'bg-[#845EF7]/10 text-[#B197FC] border border-[#845EF7]/20'
      };
    case 'Study':
      return {
        color: '#20C997', // Teal
        borderClass: 'border-l-[5px] border-l-[#20C997]',
        textColor: 'text-[#20C997]',
        accentClass: 'border-[#20C997]/20 bg-[#20C997]/5 text-[#20C997]',
        progressBarClass: 'bg-[#20C997]',
        buttonClass: 'border-[#20C997]/15 hover:bg-[#20C997]/20 text-[#20C997] hover:text-white',
        inputFocusClass: 'focus:border-[#20C997]/60',
        badgeClass: 'bg-[#20C997]/10 text-[#20C997] border border-[#20C997]/20'
      };
    case 'Social':
      return {
        color: '#B54708', // Rust brown / deep orange
        borderClass: 'border-l-[5px] border-l-[#B54708]',
        textColor: 'text-[#B54708]',
        accentClass: 'border-[#B54708]/20 bg-[#B54708]/5 text-[#B54708]',
        progressBarClass: 'bg-[#B54708]',
        buttonClass: 'border-[#B54708]/15 hover:bg-[#B54708]/20 text-[#B54708] hover:text-white',
        inputFocusClass: 'focus:border-[#B54708]/60',
        badgeClass: 'bg-[#B54708]/10 text-[#B54708] border border-[#B54708]/20'
      };
    default:
      return {
        color: '#868E96', // Slate grey
        borderClass: 'border-l-[5px] border-l-[#868E96]',
        textColor: 'text-[#868E96]',
        accentClass: 'border-[#868E96]/20 bg-[#868E96]/5 text-gray-300',
        progressBarClass: 'bg-[#868E96]',
        buttonClass: 'border-[#868E96]/20 hover:bg-gray-800 text-gray-400 hover:text-white',
        inputFocusClass: 'focus:border-gray-500',
        badgeClass: 'bg-gray-800 text-gray-300 border border-gray-700'
      };
  }
};

export default function CategoryDetailView({
  category,
  habits,
  routines = [],
  onLogHabit,
  onBack
}: CategoryDetailViewProps) {
  const [inputVals, setInputVals] = useState<{ [key: string]: string }>({});

  const categoryHabits = getStandaloneHabits(habits, routines).filter((h) => h.category === category);
  const doneCount = categoryHabits.filter((h) => (h.history[dateToday] || 0) >= h.target).length;
  const totalCount = categoryHabits.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const styles = getCategoryStyles(category);

  const handleManualSubmit = (e: React.FormEvent, habitId: string) => {
    e.preventDefault();
    const val = Number(inputVals[habitId] || 0);
    if (val > 0) {
      onLogHabit(habitId, val);
      setInputVals((prev) => ({ ...prev, [habitId]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to previous stream */}
      <button
        onClick={onBack}
        id="btn-category-back"
        className="flex items-center text-sm font-semibold text-gray-400 hover:text-white transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header card themed in category styling elements */}
      <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Glow according to category colors */}
        <div
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: styles.color }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <span
              className={`text-[9px] font-mono tracking-widest font-extrabold px-3 py-1 rounded-full uppercase border ${styles.badgeClass}`}
            >
              Category Details
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-3 font-sans flex items-center">
              <span className="mr-2" style={{ color: styles.color }}>✦</span>
              {category}
            </h2>
            <p className="text-gray-400 text-xs mt-1 max-w-sm font-sans leading-relaxed">
              Complete these active habits to raise your {category} mastery level and earn bonus multiplier points!
            </p>
          </div>

          <div className="bg-[#191C26] border border-[#2E3347] px-6 py-4 rounded-xl min-w-[130px] text-center shadow">
            <span className="text-2xl font-black font-mono text-white block">{progressPercent}%</span>
            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">
              {doneCount} / {totalCount} Completed
            </span>
          </div>
        </div>

        {/* Large matched overall slider progress */}
        <div className="w-full h-1.5 bg-[#1B1E2B] rounded-full overflow-hidden mt-6">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, backgroundColor: styles.color }}
          />
        </div>
      </div>

      {/* Fast Logging Grid (Exact Image 13 layout styling) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="category-habits-quick-grid">
        {categoryHabits.map((item) => {
          const progressVal = item.history[dateToday] || 0;
          const percentage = Math.min(100, Math.round((progressVal / item.target) * 100));
          const isCompleted = progressVal >= item.target;
          const remaining = Math.max(0, item.target - progressVal);

          const itemStyles = getCategoryStyles(item.category);

          return (
            <div
              key={item.id}
              className={`bg-[#12141A] border border-[#212431]/80 rounded-2xl p-5 shadow-xl transition-all duration-150 flex flex-col justify-between min-h-[260px] relative overflow-hidden ${itemStyles.borderClass}`}
            >
              {/* Top part block details */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <span
                    className={`text-[9px] font-mono tracking-widest font-black px-2 py-0.5 rounded uppercase ${itemStyles.badgeClass}`}
                  >
                    {item.category.toUpperCase()}
                  </span>

                  <div className="flex items-center space-x-2.5">
                    {/* Points Allocation Badge */}
                    <span className="bg-[#FCC419]/10 text-[#FCC419] border border-[#FCC419]/20 text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded flex items-center">
                      <Zap className="w-3 h-3 mr-0.5" />
                      {item.routineId ? 0 : item.points}
                    </span>
                    {/* Schedule block badge */}
                    <span className="bg-[#1C202E] border border-[#2C3145] text-gray-400 text-[9px] font-mono px-2 py-0.5 rounded flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.timeOfDay || 'Anytime'}
                    </span>
                    {/* Repeat trigger */}
                    <span className="bg-[#1C202E] border border-[#2C3145] text-[#A2A4B0] text-[9px] font-mono px-1.5 py-0.5 rounded font-medium">
                      {item.repeat.toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between select-none p-0.5">
                  <h3 className="text-xl font-extrabold text-white tracking-tight font-sans">
                    {item.name}
                  </h3>
                  {isCompleted && (
                    <span className="bg-emerald-500/15 text-emerald-400 text-[8px] border border-emerald-500/30 px-1.5 py-0.5 rounded font-extrabold tracking-widest uppercase flex items-center">
                      <Check className="w-2.5 h-2.5 mr-0.5 stroke-[3px]" /> Complete
                    </span>
                  )}
                </div>

                {/* Micro Progress Bar styled according to percentage completed */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-[#1B1E29]/90 border border-gray-800/60 rounded-full overflow-hidden block">
                    <div
                      className={`h-full transition-all duration-300 rounded-full`}
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: itemStyles.color
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 mt-1 select-none">
                    <span className="font-bold" style={{ color: itemStyles.color }}>{percentage}%</span>
                    <span>
                      {isCompleted ? 'Target met' : `${remaining} ${item.unit} left`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logger interface actions - Matching Image 13 explicitly! */}
              <div className="mt-5 pt-3 border-t border-[#1C1F2B]">
                {/* Active Interactive Logging Shortcuts */}
                {!isCompleted ? (
                  <div className="space-y-3">
                    {item.type === 'Timer' ? (
                      /* Timer type details: quick buttons +10m, +15m, +30m with manual units and Log button */
                      <div className="grid grid-cols-3 gap-2">
                        {[10, 15, 30].map((tVal) => (
                          <button
                            key={tVal}
                            onClick={() => onLogHabit(item.id, tVal)}
                            className={`py-2 text-center text-xs font-mono font-bold border rounded-lg cursor-pointer transition ${itemStyles.buttonClass}`}
                          >
                            +{tVal}m
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* Count type details: quick button +1 or Custom + increments and Log action */
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onLogHabit(item.id, 1)}
                          className={`flex-1 py-2 text-center text-xs font-mono font-bold border rounded-lg cursor-pointer transition ${itemStyles.buttonClass}`}
                        >
                          +1
                        </button>
                        {item.target > 5 && (
                          <button
                            onClick={() => onLogHabit(item.id, Math.ceil(item.target / 5))}
                            className={`flex-1 py-2 text-center text-xs font-mono font-bold border rounded-lg cursor-pointer transition ${itemStyles.buttonClass}`}
                          >
                            +{Math.ceil(item.target / 5)}
                          </button>
                        )}
                        <button
                          onClick={() => onLogHabit(item.id, remaining)}
                          className={`flex-1 py-2 text-center text-xs font-mono font-bold bg-[#12B886]/10 hover:bg-[#12B886]/20 border border-[#12B886]/20 text-[#12B886] rounded-lg cursor-pointer transition`}
                        >
                          Finish
                        </button>
                      </div>
                    )}

                    {/* Manual Custom Logging Entry with Log and input field */}
                    <form
                      onSubmit={(e) => handleManualSubmit(e, item.id)}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="number"
                        placeholder={item.type === 'Timer' ? 'Min' : 'Count'}
                        value={inputVals[item.id] || ''}
                        onChange={(e) =>
                          setInputVals({ ...inputVals, [item.id]: e.target.value })
                        }
                        className={`flex-1 bg-[#181A22] border border-[#2B3041] px-3.5 py-1.5 rounded-lg text-xs text-white placeholder-gray-500 font-sans focus:outline-none focus:ring-1 focus:ring-opacity-40 transition-shadow ${itemStyles.inputFocusClass}`}
                      />
                      <button
                        type="submit"
                        className="bg-[#2B3041] hover:bg-gray-800 border border-[#3E455D]/80 text-xs font-bold text-gray-200 px-4 py-1.5 rounded-lg transition shrink-0"
                      >
                        Log
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Completed state */
                  <div className="bg-[#12B886]/5 border border-[#12B886]/20 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-400 select-none">
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-sans font-bold">Awesome! Dynamic restructuring multiplier points applied.</span>
                    </div>
                    <Check className="w-4 h-4 stroke-[3px]" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {categoryHabits.length === 0 && (
          <div className="col-span-full border border-dashed border-gray-800/80 p-12 rounded-2xl text-center bg-[#181A24]/40">
            <AlertCircle className="w-8 h-8 text-gray-600 mx-auto" />
            <h4 className="text-gray-400 text-sm font-bold font-sans mt-3">No Active habits in {category}</h4>
            <p className="text-[11px] text-gray-500 font-sans mt-1">
              Add some habits under this discipline using the Create dialog.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
