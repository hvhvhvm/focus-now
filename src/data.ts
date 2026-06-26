import { Habit, Routine, UserStats } from './types';

export const formatDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const todayObj = new Date();

const getOffsetDate = (offset: number): string => {
  const d = new Date(todayObj);
  d.setDate(todayObj.getDate() - offset);
  return formatDateString(d);
};

export const dateToday = getOffsetDate(0);
export const dateYesterday = getOffsetDate(1);
export const dateTwoDaysAgo = getOffsetDate(2);
export const dateThreeDaysAgo = getOffsetDate(3);
export const dateFourDaysAgo = getOffsetDate(4);
export const dateFiveDaysAgo = getOffsetDate(5);

export const getDateDayIndex = (dateStr: string): number => {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return new Date(dateStr).getDay();
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

export const isHabitScheduledForDate = (habit: Habit, dateStr: string): boolean => {
  if (habit.createdAt && new Date(habit.createdAt) > new Date(dateStr)) return false;
  if (habit.repeat === 'Today Only') return habit.createdAt === dateStr;
  if (habit.repeat === 'Custom Days') {
    return habit.repeatDays && habit.repeatDays.length > 0
      ? habit.repeatDays.includes(getDateDayIndex(dateStr))
      : true;
  }
  return true;
};

export const isRoutineScheduledForDate = (routine: Routine, dateStr: string): boolean => {
  if (routine.repeat === 'Today Only') return !Object.keys(routine.completedHistory || {}).some((date) => date !== dateStr);
  if (routine.repeat === 'Custom Days') {
    return routine.repeatDays && routine.repeatDays.length > 0
      ? routine.repeatDays.includes(getDateDayIndex(dateStr))
      : true;
  }
  return true;
};

export const getScheduledHabits = (habits: Habit[], dateStr: string): Habit[] => {
  return habits.filter((habit) => isHabitScheduledForDate(habit, dateStr));
};

export const isHabitInRoutine = (habit: Habit, routines: Routine[] = []): boolean => {
  return Boolean(habit.routineId) || routines.some((routine) => routine.habitIds.includes(habit.id));
};

export const getStandaloneHabits = (habits: Habit[], routines: Routine[] = []): Habit[] => {
  return habits.filter((habit) => !isHabitInRoutine(habit, routines));
};

export const getRoutineHabits = (routine: Routine, habits: Habit[], dateStr?: string): Habit[] => {
  const routineHabits = habits.filter((habit) => routine.habitIds.includes(habit.id));
  return dateStr ? getScheduledHabits(routineHabits, dateStr) : routineHabits;
};

export const isRoutineCompleteForDate = (routine: Routine, habits: Habit[], dateStr: string): boolean => {
  const routineHabits = getRoutineHabits(routine, habits, dateStr);
  return routineHabits.length > 0 && routineHabits.every((habit) => (habit.history[dateStr] || 0) >= habit.target);
};

export const getDailyTaskCounts = (
  habits: Habit[],
  routines: Routine[] = [],
  dateStr: string
): { done: number; total: number; progressPercent: number } => {
  const scheduledStandaloneHabits = getScheduledHabits(getStandaloneHabits(habits, routines), dateStr);
  const scheduledRoutines = routines.filter((routine) => {
    return isRoutineScheduledForDate(routine, dateStr) && getRoutineHabits(routine, habits, dateStr).length > 0;
  });

  const habitsDone = scheduledStandaloneHabits.filter((habit) => (habit.history[dateStr] || 0) >= habit.target).length;
  const routinesDone = scheduledRoutines.filter((routine) => isRoutineCompleteForDate(routine, habits, dateStr)).length;
  const done = habitsDone + routinesDone;
  const total = scheduledStandaloneHabits.length + scheduledRoutines.length;

  return {
    done,
    total,
    progressPercent: total > 0 ? Math.round((done / total) * 100) : 0
  };
};export const calculateHabitLogPoints = (habit: Habit, value: number): number => {
  if (habit.routineId) return 0;
  if (!Number.isFinite(value) || value <= 0 || habit.target <= 0) return 0;
  if (value >= habit.target) return habit.points + 5;
  return Math.min(habit.points, Math.max(1, Math.round((value / habit.target) * habit.points)));
};

export const calculateHabitPointsForDate = (habit: Habit, dateStr: string): number => {
  return calculateHabitLogPoints(habit, habit.history[dateStr] || 0);
};

export const calculateRoutinePointsForDate = (routine: Routine, dateStr: string): number => {
  return routine.completedHistory?.[dateStr] ? routine.points : 0;
};

export const calculateTotalEarnedPoints = (habits: Habit[], routines: Routine[] = []): number => {
  const habitPoints = habits.reduce((total, habit) => {
    return total + Object.entries(habit.history || {}).reduce((habitTotal, [, value]) => {
      return habitTotal + calculateHabitLogPoints(habit, Number(value));
    }, 0);
  }, 0);

  const routinePoints = routines.reduce((total, routine) => {
    return total + Object.entries(routine.completedHistory || {}).reduce((routineTotal, [dateStr, completed]) => {
      return routineTotal + (completed ? calculateRoutinePointsForDate(routine, dateStr) : 0);
    }, 0);
  }, 0);

  return habitPoints + routinePoints;
};
export const INITIAL_HABITS: Habit[] = [
  {
    id: 'habit-1',
    name: 'Jump',
    category: 'Fitness',
    points: 10,
    type: 'Count',
    target: 300,
    unit: 'reps',
    repeat: 'Daily',
    enableFocusTimer: false,
    createdAt: dateFiveDaysAgo,
    history: {
      [dateFiveDaysAgo]: 120, // 40% completed
      [dateFourDaysAgo]: 200, // 66% completed
      [dateThreeDaysAgo]: 300, // 100% completed
      [dateTwoDaysAgo]: 300, // 100% completed
      [dateYesterday]: 150, // 50% completed
      [dateToday]: 0, // start clean today
    }
  },
  {
    id: 'habit-2',
    name: 'Pull ups',
    category: 'Fitness',
    points: 10,
    type: 'Count',
    target: 60,
    unit: 'reps',
    repeat: 'Daily',
    enableFocusTimer: false,
    createdAt: dateFiveDaysAgo,
    history: {
      [dateFiveDaysAgo]: 0,
      [dateFourDaysAgo]: 20, // 33%
      [dateThreeDaysAgo]: 60, // 100%
      [dateTwoDaysAgo]: 60, // 100%
      [dateYesterday]: 30, // 50%
      [dateToday]: 0,
    }
  },
  {
    id: 'habit-3',
    name: 'Plank',
    category: 'Fitness',
    points: 10,
    type: 'Timer',
    target: 3,
    unit: 'min',
    repeat: 'Daily',
    enableFocusTimer: true,
    createdAt: dateFiveDaysAgo,
    history: {
      [dateFiveDaysAgo]: 1, // 33%
      [dateFourDaysAgo]: 1.5, // 50%
      [dateThreeDaysAgo]: 3, // 100%
      [dateTwoDaysAgo]: 3, // 100%
      [dateYesterday]: 0,
      [dateToday]: 0,
    }
  },
  {
    id: 'habit-4',
    name: 'Read Geopolitics',
    category: 'Reading',
    points: 10,
    type: 'Count',
    target: 10,
    unit: 'pages',
    repeat: 'Daily',
    enableFocusTimer: false,
    createdAt: dateFiveDaysAgo,
    history: {
      [dateFiveDaysAgo]: 5, // 50%
      [dateFourDaysAgo]: 0,
      [dateThreeDaysAgo]: 10, // 100%
      [dateTwoDaysAgo]: 10, // 100%
      [dateYesterday]: 0,
      [dateToday]: 0,
    }
  },
  {
    id: 'habit-5',
    name: 'Deep Practice',
    category: 'Productivity',
    points: 15,
    type: 'Timer',
    target: 45,
    unit: 'min',
    repeat: 'Daily',
    enableFocusTimer: true,
    createdAt: dateFiveDaysAgo,
    history: {
      [dateFiveDaysAgo]: 0,
      [dateFourDaysAgo]: 15, // 33%
      [dateThreeDaysAgo]: 45, // 100%
      [dateTwoDaysAgo]: 45, // 100%
      [dateYesterday]: 45, // 100%
      [dateToday]: 0,
    }
  },
  {
    id: 'habit-6',
    name: 'Inward Meditation',
    category: 'Mindfulness',
    points: 10,
    type: 'Timer',
    target: 10,
    unit: 'min',
    repeat: 'Daily',
    enableFocusTimer: true,
    createdAt: dateFiveDaysAgo,
    history: {
      [dateFiveDaysAgo]: 5, // 50%
      [dateFourDaysAgo]: 0,
      [dateThreeDaysAgo]: 10, // 100%
      [dateTwoDaysAgo]: 10, // 100%
      [dateYesterday]: 0,
      [dateToday]: 0,
    }
  }
];

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'routine-1',
    name: 'Fitness Routine',
    points: 25,
    timeBlock: 'Morning',
    repeat: 'Daily',
    habitIds: ['habit-1', 'habit-2', 'habit-3'],
    completedHistory: {
      [dateFiveDaysAgo]: false,
      [dateFourDaysAgo]: false,
      [dateThreeDaysAgo]: true, // Jump 100, Pullrups 100, Plank 100
      [dateTwoDaysAgo]: true,
      [dateYesterday]: false,
      [dateToday]: false,
    }
  },
  {
    id: 'routine-2',
    name: 'Evening Stretch',
    points: 15,
    timeBlock: 'Evening',
    repeat: 'Daily',
    habitIds: ['habit-3', 'habit-6'],
    completedHistory: {
      [dateFiveDaysAgo]: false,
      [dateFourDaysAgo]: false,
      [dateThreeDaysAgo]: true,
      [dateTwoDaysAgo]: true,
      [dateYesterday]: false,
      [dateToday]: false,
    }
  }
];

// Generates a mock stats profile showing inertia state today since they haven't completed anything yet,
// but they have positive prior performance trend
export const getInitialState = (): { habits: Habit[]; routines: Routine[]; totalPoints: number } => {
  // Let's verify we load from localStorage if available
  const cachedHabits = localStorage.getItem('focus_now_habits');
  const cachedRoutines = localStorage.getItem('focus_now_routines');
  const cachedPoints = localStorage.getItem('focus_now_points');

  let habits = INITIAL_HABITS;
  let routines = INITIAL_ROUTINES;
  let totalPoints = 370; // Pre-earned points from past successes

  if (cachedHabits) {
    try {
      habits = JSON.parse(cachedHabits);
    } catch (e) {
      console.error(e);
    }
  }
  if (cachedRoutines) {
    try {
      routines = JSON.parse(cachedRoutines);
    } catch (e) {
      console.error(e);
    }
  }
  if (cachedPoints) {
    totalPoints = parseInt(cachedPoints, 10) || 0;
  }

  return { habits, routines, totalPoints };
};

// Helper to compute progression and momentum mechanics
export const calculateCompletionRate = (habits: Habit[], dateStr: string, routines: Routine[] = []): number => {
  if (routines.length > 0) {
    return getDailyTaskCounts(habits, routines, dateStr).progressPercent;
  }

  const activeForDate = getScheduledHabits(habits, dateStr);

  if (activeForDate.length === 0) return 0;

  let totalCompletedRatio = 0;
  activeForDate.forEach(h => {
    const value = h.history[dateStr] || 0;
    const progressPercent = Math.min(100, (value / h.target) * 100);
    totalCompletedRatio += progressPercent / 100;
  });

  return Math.round((totalCompletedRatio / activeForDate.length) * 100);
};

export const getCompletionRateForDay = (habits: Habit[], dateStr: string, routines: Routine[] = []): number => {
  return calculateCompletionRate(habits, dateStr, routines);
};

// Day Signal Target calculation:
// Base Target = Day Completion % * 0.78
// Streak Alive Bonus: +6% if streak is active (meaning D and D-1 are both >= 45%)
// Recovery Bonus: +4% if D-1 was missed (< 45%) and D is active (>= 45%)
export const getDaySignalTarget = (habits: Habit[], dateStr: string, prevDateStr: string, routines: Routine[] = []): number => {
  const progressToday = getCompletionRateForDay(habits, dateStr, routines);
  const progressPrev = getCompletionRateForDay(habits, prevDateStr, routines);

  const baseTarget = progressToday * 0.78;
  const isStreakActive = (progressToday >= 45) && (progressPrev >= 45);
  const isRecovery = (progressPrev < 45) && (progressToday >= 45);

  const streakBonus = isStreakActive ? 6 : 0;
  const recoveryBonus = isRecovery ? 4 : 0;

  return Math.min(100, Math.max(0, baseTarget + streakBonus + recoveryBonus));
};

export const calculateMomentum = (habits: Habit[], routines: Routine[] = []): {
  todayProgress: number;
  score: number;
  threeDayAvg: number;
  yesterdayProgress: number;
  trajectory: number; // trend contrast vs yesterday
  stateName: 'INERTIA' | 'IGNITE' | 'FLOW' | 'LOCKED';
} => {
  const todayProgress = calculateCompletionRate(habits, dateToday, routines);
  const yesterdayProgress = calculateCompletionRate(habits, dateYesterday, routines);
  const twoDaysAgoProgress = calculateCompletionRate(habits, dateTwoDaysAgo, routines);

  // 3-day roll average: today, yesterday, 2 days ago
  const threeDayAvg = Math.round((todayProgress + yesterdayProgress + twoDaysAgoProgress) / 3);

  // Momentum Score = (Today's Progress * 0.5) + (Yesterday's Progress * 0.3) + (Two Days Ago Progress * 0.2)
  const score = Math.round((todayProgress * 0.50) + (yesterdayProgress * 0.30) + (twoDaysAgoProgress * 0.20));

  // Trajectory is today's progress vs yesterday's progress
  const trajectory = todayProgress - yesterdayProgress;

  // Derive Momentum state name based on exact score ranges
  // Flow State & Ultra Lock In >= 75% (Split between FLOW and LOCKED)
  // Ignition State >= 45% (IGNITE)
  // Inertia State < 45% (INERTIA)
  let stateName: 'INERTIA' | 'IGNITE' | 'FLOW' | 'LOCKED' = 'INERTIA';
  if (score >= 90) {
    stateName = 'LOCKED'; // represents Ultra Lock In
  } else if (score >= 75) {
    stateName = 'FLOW';   // represents Flow State
  } else if (score >= 45) {
    stateName = 'IGNITE'; // represents Ignition State
  } else {
    stateName = 'INERTIA'; // represents Inertia State
  }

  return {
    todayProgress,
    score,
    threeDayAvg,
    yesterdayProgress,
    trajectory,
    stateName
  };
};

// Computes 1% better signal rolling 5-day average
export const getOnePercentBetterHistory = (habits: Habit[], routines: Routine[] = []): {
  date: string;
  progress: number;
  signal: number;
  isMissed: boolean;
}[] => {
  const allDates: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() - i);
    allDates.push(formatDateString(d));
  }

  // First, compute Day Signal Target for all dates starting from index 1 (since index 0 has no preceding day)
  const targetsMap: { [date: string]: number } = {};
  for (let i = 1; i < allDates.length; i++) {
    const todayStr = allDates[i];
    const prevStr = allDates[i - 1];
    targetsMap[todayStr] = getDaySignalTarget(habits, todayStr, prevStr, routines);
  }
  // For index 0, duplicate index 1
  targetsMap[allDates[0]] = targetsMap[allDates[1]];

  // The 6 visible days are dateFiveDaysAgo to dateToday
  const visibleDates: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() - i);
    visibleDates.push(formatDateString(d));
  }

  return visibleDates.map((dateStr) => {
    const idxInAll = allDates.indexOf(dateStr);
    
    // Grab this day and 4 days preceding it (total 5 days)
    const rollingDays = allDates.slice(idxInAll - 4, idxInAll + 1);
    
    // Sum targets
    let sum = 0;
    rollingDays.forEach(d => {
      sum += targetsMap[d] || 50;
    });
    const signalVal = Math.round((sum / 5) * 10) / 10;
    
    const progress = getCompletionRateForDay(habits, dateStr, routines);

    return {
      date: dateStr,
      progress,
      signal: signalVal,
      isMissed: progress < 45
    };
  });
};



