import React from 'react';
import { Sparkles, Award, Flame, Zap } from 'lucide-react';

import { Habit } from '../types';
import { dateToday, dateYesterday, dateTwoDaysAgo, dateThreeDaysAgo, dateFourDaysAgo, dateFiveDaysAgo, formatDateString, calculateHabitLogPoints } from '../data';


interface InsightsPageProps {
  habits: Habit[];
  userPoints: number;
}

export default function InsightsPage({ habits, userPoints }: InsightsPageProps) {
  // Identity level configuration
  const levels = [
    { lvl: 1, name: 'Initiate Builder', requirement: 0, desc: 'Starting your routines and understanding momentum.' },
    { lvl: 2, name: 'Atomic Compounder', requirement: 150, desc: 'Showing consistent daily efforts. Habit loops are locking in.' },
    { lvl: 3, name: 'Focused Legend', requirement: 400, desc: 'High-level consistency. The identity shift is nearly complete.' },
    { lvl: 4, name: 'Relentless Executor', requirement: 800, desc: 'Neurological mastery. Habits are automatic, momentum is self-sustaining.' }
  ];

  const currentLevel = levels.filter(lvl => userPoints >= lvl.requirement).pop() || levels[0];
  const nextLevel = levels.find(lvl => lvl.lvl === currentLevel.lvl + 1);

  // Calculate points needed in percentage metric
  const pointsRange = nextLevel ? nextLevel.requirement - currentLevel.requirement : 100;
  const currentLevelPointsProgress = nextLevel ? userPoints - currentLevel.requirement : pointsRange;
  const percentageToNext = nextLevel
    ? Math.min(100, Math.round((currentLevelPointsProgress / pointsRange) * 100))
    : 100;

  // Gamified Leaderboard with Iconic productivity personas
  const leaderBoard = [
    { name: 'David Goggins', points: 1200, badge: '🔥 UNBREAKABLE', avatar: '🏃' },
    { name: 'Nikola Tesla', points: 950, badge: '⚡ FOCUS GOD', avatar: '📐' },
    { name: 'Marcus Aurelius', points: 750, badge: '🏛️ STOIC MASTER', avatar: '📜' },
    { name: 'You (Live Match)', points: userPoints, isUser: true, badge: currentLevel.name.toUpperCase(), avatar: '🎯' },
    { name: 'Elon Musk', points: 280, badge: '🚀 CONSTANT ITERATOR', avatar: '📦' }
  ].sort((a,b) => b.points - a.points);

  const doneCount = habits.filter(h => (h.history[dateToday] || 0) >= h.target).length;

  // --- Dynamic Live Weekly Points Calculation ---
  const currentWeekDays = [dateFiveDaysAgo, dateFourDaysAgo, dateThreeDaysAgo, dateTwoDaysAgo, dateYesterday, dateToday];
  let computedLiveWeekPoints = 0;
  habits.forEach((h) => {
    currentWeekDays.forEach((dateStr) => {
      computedLiveWeekPoints += calculateHabitLogPoints(h, h.history[dateStr] || 0);
    });
  });

  // --- Dynamic 4-week history buckets ---
  // Compute points earned in a given date range (inclusive)
  const getPointsInRange = (startDate: Date, endDate: Date): number => {
    let total = 0;
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = formatDateString(cur);
      habits.forEach(h => {
        total += calculateHabitLogPoints(h, h.history[dateStr] || 0);
      });
      cur.setDate(cur.getDate() + 1);
    }
    return total;
  };

  // Generate last 4 rolling 7-day buckets ending today
  const todayDate = new Date(dateToday);
  const weeklyData = Array.from({ length: 4 }, (_, idx) => {
    const endDate = new Date(todayDate);
    endDate.setDate(todayDate.getDate() - idx * 7);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    const pts = idx === 0 ? computedLiveWeekPoints : getPointsInRange(startDate, endDate);
    const label = idx === 0
      ? `This Week (${formatDateString(startDate)} – ${dateToday})`
      : `${idx === 1 ? 'Last' : idx + ' Weeks Ago'} Week (${formatDateString(startDate)} – ${formatDateString(endDate)})`;

    const colors = [
      'from-[#12B886] to-[#087F5B]',
      'from-[#845EF7] to-[#5C7CFA]',
      'from-[#FF922B] to-[#E64980]',
      'from-[#15AABF] to-[#228BE6]',
    ];
    const descs = [
      'Current Active Sprint Focus',
      'Previous Week Activity',
      'Two Weeks Ago Activity',
      'Three Weeks Ago Activity',
    ];

    return {
      label,
      points: pts,
      max: 400,
      desc: descs[idx],
      isCurrent: idx === 0,
      color: colors[idx],
    };
  });


  // --- Category Progress Breakdown ---
  const categoriesToAnalyzeState = [
    { 
      name: 'Fitness', 
      icon: '💪', 
      theme: 'text-[#12B886] bg-[#12B886]/10 border-[#12B886]/20', 
      barColor: 'bg-[#12B886]',
      quote: 'Excellent conditioning loops logged this week.' 
    },
    { 
      name: 'Reading', 
      icon: '📚', 
      theme: 'text-[#845EF7] bg-[#845EF7]/10 border-[#845EF7]/20', 
      barColor: 'bg-[#845EF7]',
      quote: 'Absorption rate of focus frameworks continues to steady.' 
    },
    { 
      name: 'Productivity', 
      icon: '⚡', 
      theme: 'text-[#FF922B] bg-[#FF922B]/10 border-[#FF922B]/20', 
      barColor: 'bg-[#FF922B]',
      quote: 'Focused work sessions are shaping automatic neural rituals.' 
    },
    { 
      name: 'Mindfulness', 
      icon: '🧘', 
      theme: 'text-[#15AABF] bg-[#15AABF]/10 border-[#15AABF]/20', 
      barColor: 'bg-[#15AABF]',
      quote: 'Autonomic recovery loops checked. Mental stamina is high!' 
    },
  ];

  const categoryProgressScores = categoriesToAnalyzeState.map(catSpec => {
    const catHabits = habits.filter(h => h.category === catSpec.name);
    if (catHabits.length === 0) {
      return { ...catSpec, score: 0, grade: 'NOT SCHEDULED', count: 0, doneCount: 0 };
    }

    let completedEntries = 0;
    let totalScheduledDays = 0;

    catHabits.forEach(h => {
      currentWeekDays.forEach(d => {
        totalScheduledDays++;
        if ((h.history[d] || 0) >= h.target) {
          completedEntries++;
        }
      });
    });

    const completionRate = Math.round((completedEntries / totalScheduledDays) * 100);

    let grade = 'INERTIA';
    if (completionRate >= 75) grade = 'ELITE';
    else if (completionRate >= 50) grade = 'STRONG';
    else if (completionRate >= 25) grade = 'BUILDING';

    return {
      ...catSpec,
      score: completionRate,
      grade,
      count: catHabits.length,
      doneCount: catHabits.filter(h => (h.history[dateToday] || 0) >= h.target).length
    };
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Section */}
      <header className="space-y-1">
        <span className="text-[10px] uppercase font-mono font-bold text-[#845EF7] tracking-wider block">
          COGNITIVE ANALYTICS
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold font-sans text-white tracking-tight">
          Productivity Identity Insights
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm">
          Inspect your neural restructuring progress, historic points accumulation, and category discipline.
        </p>
      </header>

      {/* 2. Identity Level Progress Widget */}
      <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full blur-xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-mono tracking-widest text-[#12B886] font-black bg-[#12B886]/10 border border-[#12B886]/20 px-2 py-0.5 rounded uppercase">
              Current Identity Tier
            </span>
            <div className="flex items-center space-x-2.5 mt-2">
              <div className="bg-purple-500/10 border border-purple-500/25 text-[#845EF7] p-2.5 rounded-xl">
                <Award className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-bold font-sans text-white">{currentLevel.name}</h3>
                <p className="text-xs text-gray-400 font-sans mt-0.5">{currentLevel.desc}</p>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs text-gray-500 font-mono block uppercase">YOUR SCORE</span>
            <span className="text-3xl font-black font-mono text-white flex items-center justify-end mt-1">
              {userPoints} <span className="text-xs text-[#FCC419] font-normal ml-1.5 animate-pulse flex items-center gap-0.5"><Zap className="w-3 h-3 fill-[#FCC419] inline" /> PTS</span>

            </span>
          </div>
        </div>

        {/* Level Progression Progressbar */}
        {nextLevel && (
          <div className="mt-8 pt-4 border-t border-[#1C1F2B]">
            <div className="flex justify-between items-baseline text-xs mb-1.5 font-sans font-semibold">
              <span className="text-gray-300">Progression to Level {nextLevel.lvl}: {nextLevel.name}</span>
              <span className="text-[#845EF7] font-mono">{nextLevel.requirement - userPoints} pts remaining</span>
            </div>
            <div className="w-full h-2 bg-[#181A24] border border-[#2B3041] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300" style={{ width: `${percentageToNext}%` }} />
            </div>
            <p className="text-[10px] text-gray-500 mt-2 font-mono flex items-center uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#FCC419]" />
              Completion of habits &amp; routines awards points live
            </p>
          </div>
        )}
      </div>

      {/* 3. POINTS ACCUMULATED BY WEEK MODULE */}
      <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl space-y-5">
        <div>
          <span className="text-[10px] font-mono text-[#12B886] uppercase tracking-widest font-black block">HISTORIC TRAJECTORY</span>
          <h3 className="text-xl font-bold font-sans text-white mt-1">Points Accumulated By Week</h3>
          <p className="text-xs text-gray-400 mt-1">
            Weekly compound statistics. Live current week outputs recalculate instantly as tasks are logged.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {weeklyData.map((wk, idx) => {
            const pct = Math.min(100, Math.round((wk.points / wk.max) * 100));
            return (
              <div key={idx} className={`p-4 rounded-xl border transition-all duration-150 ${wk.isCurrent ? 'bg-[#0E1613] border-[#12B886]/20' : 'bg-[#151720]/50 border-gray-800'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white font-sans">{wk.label}</h4>
                      {wk.isCurrent && (
                        <span className="text-[8px] bg-[#12B886]/10 border border-[#12B886]/30 px-1.5 py-0.2 rounded font-mono text-[#12B886] font-bold uppercase tracking-wider">
                          LIVE VALUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{wk.desc}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-base font-black font-mono text-white">{wk.points}</span>
                    <span className="text-[10px] font-mono text-gray-500"> / {wk.max} PTS</span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-[#181A24] border border-[#222532] rounded-full overflow-hidden relative">
                  <div className={`h-full bg-gradient-to-r ${wk.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DYNAMIC CATEGORIES DISCIPLINE BREAKDOWN */}
      <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl space-y-5">
        <div>
          <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black block">DISCIPLINE SEGMENTATION</span>
          <h3 className="text-xl font-bold font-sans text-white mt-1">Category Consistency Progress</h3>
          <p className="text-xs text-gray-400 mt-1">
            How effective you were in each separate neural focus category. Measured dynamically across active week inputs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {categoryProgressScores.map((cat, idx) => {
            return (
              <div key={idx} className="bg-[#161720]/80 border border-[#232635] p-4.5 rounded-2xl space-y-3 shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl select-none">{cat.icon}</span>
                      <h4 className="text-sm font-extrabold text-white font-sans">{cat.name}</h4>
                      <span className="text-[10px] font-mono text-gray-400 font-bold">({cat.count} {cat.count === 1 ? 'task' : 'tasks'})</span>
                    </div>

                    <span className={`text-[9px] font-mono font-black border px-2 py-0.5 rounded tracking-widest ${
                      cat.grade === 'ELITE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      cat.grade === 'STRONG' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                      cat.grade === 'BUILDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      {cat.grade}
                    </span>
                  </div>

                  <div className="mt-3.5 flex items-baseline justify-between select-none">
                    <span className="text-gray-400 text-xs font-sans">Weekly Consistency Grade:</span>
                    <span className="text-lg font-black font-mono text-white">{cat.score}%</span>
                  </div>

                  {/* Standard customized progress slider */}
                  <div className="w-full h-2 bg-[#1C1F2B] rounded-full overflow-hidden mt-2 relative">
                    <div className={`h-full ${cat.barColor} transition-all duration-300`} style={{ width: `${cat.score}%` }} />
                  </div>
                </div>

                <div className="border-t border-gray-800/40 pt-2.5 mt-2 bg-gradient-to-r from-gray-900/40 to-transparent p-2 rounded-lg">
                  <span className="text-[10px] text-gray-500 font-mono tracking-wide block uppercase">INSIGHT SUGGESTION:</span>
                  <p className="text-[11px] text-gray-300 italic font-sans mt-1 leading-relaxed">
                    &ldquo;{cat.quote}&rdquo;
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-px">

        {/* 5. Leaderboard list / Point matches */}
        <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">LEADERBOARD</span>
            <h3 className="text-lg font-bold font-sans text-white mt-1">Productivity Masters</h3>
            <p className="text-xs text-gray-500 mt-0.5">Stack up against legendary executors.</p>
          </div>

          <div className="space-y-2.5 pt-2">
            {leaderBoard.map((person, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl border transition duration-100 ${
                  person.isUser
                    ? 'bg-purple-950/10 border-purple-500/30 text-white shadow-md shadow-purple-950/10'
                    : 'bg-[#181A22] border-[#252834] text-gray-300 hover:border-[#383C4F]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl select-none">{person.avatar}</span>
                  <div>
                    <h4 className="text-sm font-bold font-sans flex items-center">
                      {person.name}
                      {person.isUser && (
                        <span className="ml-1.5 text-[8px] bg-[#12B886]/10 text-[#12B886] border border-[#12B886]/20 px-1.5 py-0.2 rounded font-mono font-extrabold uppercase">
                          MATCH
                        </span>
                      )}
                    </h4>
                    <span className="text-[9px] font-mono text-gray-400 mt-0.5 block font-bold uppercase">{person.badge}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white">{person.points} pts</span>
                  <span className="text-[9px] text-gray-500 block font-bold">RANK #{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Neurological Milestones */}
        <div className="bg-[#12141A] border border-[#222631] rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-black block">MILESTONES</span>
            <h3 className="text-lg font-bold font-sans text-white mt-1">Neurological Goals</h3>
            <p className="text-xs text-gray-500 mt-0.5">Unlock rewards for compound daily habits.</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              {
                title: 'Neuroplasticity Spark',
                desc: 'Unlocked upon complete loop of any Routine.',
                unlocked: doneCount > 1,
                bonus: '+25 pts',
                icon: '🧠'
              },
              {
                title: 'High-Velocity Focus',
                desc: 'Unlocked upon running a focus Pomodoro timer.',
                unlocked: habits.some(h => (h.history[dateToday] || 0) > 0 && h.enableFocusTimer),
                bonus: '+15 pts',
                icon: '⚡'
              },
              {
                title: 'Discipline Master',
                desc: 'Log a fitness habit with target over 300 reps.',
                unlocked: habits.some(h => h.category === 'Fitness' && h.target >= 300 && (h.history[dateToday] || 0) > 0),
                bonus: '+50 pts',
                icon: '💪'
              }
            ].map((milestone, idx) => (
              <div
                key={idx}
                className={`p-3.5 border rounded-xl flex items-start space-x-3 transition duration-150 ${
                  milestone.unlocked
                    ? 'border-emerald-500/20 bg-emerald-950/5 text-emerald-400'
                    : 'border-[#222631] bg-[#15171D] text-gray-500 opacity-60'
                }`}
              >
                <div className="text-2xl mt-0.5 select-none">{milestone.icon}</div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold font-sans text-white flex items-center justify-between">
                    <span>{milestone.title}</span>
                    {milestone.unlocked && (
                      <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-black uppercase">
                        UNLOCKED
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-450 mt-1 leading-relaxed font-sans">{milestone.desc}</p>
                  <p className="text-[9px] font-mono mt-1 text-[#845EF7] font-black uppercase">{milestone.bonus} reward</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
