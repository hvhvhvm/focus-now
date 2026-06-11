import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import HabitsPage from './components/HabitsPage';
import MomentumPage from './components/MomentumPage';
import OnePercentBetterPage from './components/OnePercentBetterPage';
import InsightsPage from './components/InsightsPage';
import AuthPage from './components/AuthPage';
import { CreateHabitModal, CreateRoutineModal } from './components/Modals';
import { Habit, Category, Routine } from './types';
import { getInitialState, calculateMomentum, dateToday } from './data';
import { api, ApiError } from './api';
import { Sparkles, Trophy, Zap, RefreshCw, LogOut, Terminal, Layers } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('habit_mountain_token'));
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const [currentTab, setTab] = useState<string>('dashboard');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // States for routine timeline details
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<Category | null>(null);

  // State for Create dialogue modals
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

  // Fetch all user details, habits, routines on mounting/authentication
  const loadAllData = async () => {
    if (!token) {
      setAppLoading(false);
      return;
    }
    setAppLoading(true);
    try {
      // 1. Fetch profiles
      const profile = await api.getProfile();
      setCurrentUser(profile);
      setUserPoints(profile.total_points || 0);

      // 2. Fetch habits
      const hData = await api.getHabits();
      setHabits(hData);

      // 3. Fetch routines
      const rData = await api.getRoutines();
      setRoutines(rData);

    } catch (err: any) {
      console.error('Error loading full-stack assets:', err);
      // If unauthorized token, force session clear
      if (
        (err instanceof ApiError && (err.status === 401 || err.status === 403)) ||
        err.message?.toLowerCase().includes('expired')
      ) {
        handleLogout();
      }
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [token]);

  // Auth helper success callback
  const handleAuthSuccess = (newToken: string, user: any) => {
    localStorage.setItem('habit_mountain_token', newToken);
    setToken(newToken);
    setCurrentUser(user);
    setUserPoints(user.total_points || 0);
  };

  // Sign out handle
  const handleLogout = () => {
    localStorage.removeItem('habit_mountain_token');
    setToken(null);
    setCurrentUser(null);
    setHabits([]);
    setRoutines([]);
    setUserPoints(0);
  };

  // Automated Routine Completion Handler Check
  useEffect(() => {
    if (!token || habits.length === 0 || routines.length === 0) return;

    let pointsBonus = 0;
    let routinesToUpdate: { id: string; completed: boolean }[] = [];

    routines.forEach((rt) => {
      // Find all habits associated with this routine
      const routineHabits = habits.filter((h) => rt.habitIds.includes(h.id));
      
      // Calculate if they were all fully completed today
      const allDoneToday =
        routineHabits.length > 0 &&
        routineHabits.every((h) => (h.history[dateToday] || 0) >= h.target);
      
      const wasDoneEarlierToday = rt.completedHistory[dateToday] || false;

      if (allDoneToday && !wasDoneEarlierToday) {
        pointsBonus += rt.points;
        routinesToUpdate.push({ id: rt.id, completed: true });
      }
    });

    if (routinesToUpdate.length > 0) {
      // Execute database syncs for routine completion status
      const syncRoutinesCompletions = async () => {
        try {
          const nextPoints = userPoints + pointsBonus;
          setUserPoints(nextPoints);

          // Update user points in database
          await api.syncJourney({ total_points: nextPoints });

          // Update routine logger rows
          for (const item of routinesToUpdate) {
            await api.setRoutineStatus(item.id, dateToday, true);
          }

          // Reload fresh data to keep structures integrated perfectly
          const updatedRoutines = await api.getRoutines();
          setRoutines(updatedRoutines);

          // Trigger clean congrats banner feedback
          setTimeout(() => {
            alert(`⚡ SUMMIT CHAIN MASTERED!\nYou completed all tasks for routine and gained +${pointsBonus} bonus points!`);
          }, 100);

        } catch (err) {
          console.error('Error synchronizing routine chains:', err);
        }
      };

      syncRoutinesCompletions();
    }
  }, [habits, routines, token]);

  // Handler: Log count/timer progress against a specific habit
  const handleLogHabit = async (id: string, value: number) => {
    try {
      const targetHabit = habits.find((h) => h.id === id);
      if (!targetHabit) return;

      const curToday = targetHabit.history[dateToday] || 0;
      const newToday = curToday + value;

      const wasCompleted = curToday >= targetHabit.target;
      const nowCompleted = newToday >= targetHabit.target;

      let ptsAdd = 0;
      if (nowCompleted && !wasCompleted) {
        // Double completions bonus!
        ptsAdd = targetHabit.points + 5;
      } else if (!nowCompleted) {
        // Simple increment points addition
        ptsAdd = Math.min(targetHabit.points, 2);
      }

      const nextPoints = userPoints + ptsAdd;
      
      // Sync to database
      await api.logHabit(id, dateToday, value);
      
      if (ptsAdd > 0) {
        await api.syncJourney({ total_points: nextPoints });
        setUserPoints(nextPoints);
      }

      // Re-fetch all dynamic logs cleanly
      const updatedHabits = await api.getHabits();
      setHabits(updatedHabits);

    } catch (err: any) {
      console.error('Failed to sync logged progression:', err);
      alert('Network logging failure: ' + err.message);
    }
  };

  // Handler: Save newly created habit
  const handleCreateHabitSubmit = async (habitData: Partial<Habit>) => {
    try {
      const payload: Partial<Habit> = {
        name: habitData.name || 'Untitled Habit',
        category: habitData.category || 'Fitness',
        points: habitData.points || 10,
        type: habitData.type || 'Count',
        target: habitData.target || 1,
        unit: habitData.type === 'Timer' ? 'min' : habitData.unit || 'reps',
        repeat: habitData.repeat || 'Daily',
        timeOfDay: habitData.timeOfDay,
        enableFocusTimer: habitData.enableFocusTimer || false,
        routineId: habitData.routineId
      };

      await api.createHabit(payload);
      
      // Reload lists
      const nextHabits = await api.getHabits();
      setHabits(nextHabits);

      // If linked to routine, update local arrays representation too
      if (habitData.routineId) {
        const nextRoutines = await api.getRoutines();
        setRoutines(nextRoutines);
      }

      setIsHabitModalOpen(false);
    } catch (err: any) {
      alert('Error creating habit index: ' + err.message);
    }
  };

  // Handler: Save newly created routine and auto-create corresponding template habits
  const handleCreateRoutineSubmit = async (rtData: {
    name: string;
    points: number;
    timeBlock: 'Morning' | 'Evening' | 'Night' | 'Constant';
    repeat: 'Daily' | 'Custom Days' | 'Today Only';
    habitNames: string[];
  }) => {
    try {
      const generatedHabitIds: string[] = [];

      // Create each listed habit sequentially in backend SQLite DB
      for (let i = 0; i < rtData.habitNames.length; i++) {
        const name = rtData.habitNames[i];
        const hRes = await api.createHabit({
          name,
          category: rtData.timeBlock === 'Morning' ? 'Health' : 'Custom',
          points: 10,
          type: 'Count',
          target: 10,
          unit: 'reps',
          repeat: rtData.repeat
        });
        generatedHabitIds.push(hRes.id);
      }

      // Create Routine representing the linked chain
      await api.createRoutine({
        name: rtData.name,
        points: rtData.points,
        timeBlock: rtData.timeBlock,
        repeat: rtData.repeat,
        habitIds: generatedHabitIds
      });

      // Reload fresh database structures
      const nextHabits = await api.getHabits();
      const nextRoutines = await api.getRoutines();
      setHabits(nextHabits);
      setRoutines(nextRoutines);

      setIsRoutineModalOpen(false);
    } catch (err: any) {
      alert('Error building full routine chain: ' + err.message);
    }
  };

  // Navigate straight to routine
  const handleNavigateToRoutine = (routineId: string) => {
    setSelectedRoutineId(routineId);
    setTab('habits');
  };

  // Handler: Delete habit permanently
  const handleDeleteHabit = async (id: string) => {
    const habitToDelete = habits.find((habit) => habit.id === id);
    if (!habitToDelete || deletingHabitId) return;

    const shouldDelete = confirm(
      `Delete "${habitToDelete.name}" permanently? Its progress history will also be removed.`
    );
    if (!shouldDelete) return;

    setDeletingHabitId(id);
    try {
      await api.deleteHabit(id);

      // Update every local view immediately after the server confirms deletion.
      setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
      setRoutines((currentRoutines) =>
        currentRoutines.map((routine) => ({
          ...routine,
          habitIds: routine.habitIds.filter((habitId) => habitId !== id)
        }))
      );
    } catch (err: any) {
      alert('Failed to delete habit: ' + err.message);
    } finally {
      setDeletingHabitId(null);
    }
  };

  // Reset database state completely
  const handleResetApp = async () => {
    if (confirm('Are you sure you want to reset all tracked points and database logs to start fresh? This drops your sqlite metrics safely.')) {
      setAppLoading(true);
      try {
        await api.resetAllData();
        await loadAllData();
        setTab('dashboard');
        alert('All database tables successfully wiped & re-seeded to baseline values!');
      } catch (err: any) {
        alert('Failure processing reset: ' + err.message);
      } finally {
        setAppLoading(false);
      }
    }
  };

  // Render Login/Register Overlay if not authenticated
  if (!token) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Loading buffer
  if (appLoading) {
    return (
      <div className="flex flex-col font-sans items-center justify-center min-h-screen bg-[#06070a] text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Zap className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
        </div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-mono">
          Assembling Summit Environment...
        </p>
      </div>
    );
  }

  // Compute momentum live score
  const { score: currentLiveMomentumScore } = calculateMomentum(habits);

  return (
    <div className="flex bg-[#0A0B0E] min-h-screen text-gray-100 font-sans antialiased overflow-x-hidden">
      
      {/* 1. Sidebar Left */}
      <Sidebar
        currentTab={currentTab}
        setTab={(t) => {
          setTab(t);
          setSelectedRoutineId(null);
          setSelectedCategoryId(null);
        }}
        userPoints={userPoints}
        momentumScore={currentLiveMomentumScore}
        onReset={handleResetApp}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Body */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto relative">
        
        {/* Database backend active system flag */}
        <div className="absolute top-4 right-10 flex items-center gap-1.5 bg-[#0F111A] border border-green-900/30 px-3 py-1 rounded-full text-[10px] text-green-400 font-mono select-none z-50">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
          <span>FULLSTACK DATABASE_SECURE</span>
        </div>

        {/* Tab Routing orchestrations */}
        {currentTab === 'dashboard' && (
          <Dashboard
            habits={habits}
            routines={routines}
            userPoints={userPoints}
            onLogHabit={handleLogHabit}
            setTab={setTab}
            onNavigateToRoutine={handleNavigateToRoutine}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
          />
        )}

        {currentTab === 'habits' && (
          <HabitsPage
            habits={habits}
            routines={routines}
            onLogHabit={handleLogHabit}
            onDeleteHabit={handleDeleteHabit}
            deletingHabitId={deletingHabitId}
            openCreateHabit={() => setIsHabitModalOpen(true)}
            openCreateRoutine={() => setIsRoutineModalOpen(true)}
            selectedRoutineId={selectedRoutineId}
            setSelectedRoutineId={setSelectedRoutineId}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
          />
        )}

        {currentTab === 'momentum' && (
          <MomentumPage
            habits={habits}
            routines={routines}
          />
        )}

        {currentTab === '1%better' && (
          <OnePercentBetterPage
            habits={habits}
          />
        )}

        {currentTab === 'insights' && (
          <InsightsPage
            habits={habits}
            userPoints={userPoints}
          />
        )}
      </main>

      {/* 3. Global Control Modals */}
      <CreateHabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        routines={routines}
        onCreate={handleCreateHabitSubmit}
      />

      <CreateRoutineModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        onCreate={handleCreateRoutineSubmit}
      />
    </div>
  );
}
