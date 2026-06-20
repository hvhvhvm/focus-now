import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import HabitsPage from './components/HabitsPage';
import MomentumPage from './components/MomentumPage';
import OnePercentBetterPage from './components/OnePercentBetterPage';
import InsightsPage from './components/InsightsPage';
import ProfilePage from './components/ProfilePage';
import AuthPage from './components/AuthPage';
import { CreateHabitModal, CreateRoutineModal } from './components/Modals';
import { ToastProvider, useToast, ConfirmDialog } from './components/Toast';
import { Habit, Category, Routine } from './types';
import { calculateMomentum, dateToday, calculateTotalEarnedPoints, getScheduledHabits } from './data';
import { api, ApiError } from './api';
import { Zap } from 'lucide-react';

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const toast = useToast();

  const [token, setToken] = useState<string | null>(localStorage.getItem('habit_mountain_token'));
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const [currentTab, setTab] = useState<string>('dashboard');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const openConfirm = (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => setConfirmDialog({ isOpen: true, ...opts });

  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));


  // States for routine timeline details
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<Category | null>(null);

  // State for Create dialogue modals
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
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
      // 2. Fetch habits
      const hData = await api.getHabits();
      setHabits(hData);

      // 3. Fetch routines
      const rData = await api.getRoutines();
      setRoutines(rData);

      const computedPoints = calculateTotalEarnedPoints(hData, rData);
      setUserPoints(computedPoints);
      if ((profile.total_points || 0) !== computedPoints) {
        await api.syncJourney({ total_points: computedPoints });
      }

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
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
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
    const routinesToUpdate: { id: string; completed: boolean }[] = [];

    routines.forEach((rt) => {
      const routineHabits = getScheduledHabits(
        habits.filter((h) => rt.habitIds.includes(h.id)),
        dateToday
      );
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
      const syncRoutinesCompletions = async () => {
        try {
          for (const item of routinesToUpdate) {
            await api.setRoutineStatus(item.id, dateToday, true);
          }

          const updatedRoutines = await api.getRoutines();
          setRoutines(updatedRoutines);

          const nextPoints = calculateTotalEarnedPoints(habits, updatedRoutines);
          setUserPoints(nextPoints);
          await api.syncJourney({ total_points: nextPoints });

          toast.success(`Routine mastered! +${pointsBonus} bonus points earned!`);
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

      if (newToday < 0 || (wasCompleted && nowCompleted)) return;

      await api.logHabit(id, dateToday, value);

      const updatedHabits = await api.getHabits();
      setHabits(updatedHabits);
      const nextPoints = calculateTotalEarnedPoints(updatedHabits, routines);
      setUserPoints(nextPoints);
      await api.syncJourney({ total_points: nextPoints });

    } catch (err: any) {
      console.error('Failed to sync logged progression:', err);
      toast.error('Network logging failure: ' + err.message);
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
        target: Math.max(1, Number(habitData.target) || 1),
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

      closeHabitModal();
      toast.success('Habit created successfully!');
    } catch (err: any) {
      toast.error('Error creating habit: ' + err.message);
    }
  };


  const closeHabitModal = () => {
    setIsHabitModalOpen(false);
    setHabitToEdit(null);
  };

  const openCreateHabit = () => {
    setHabitToEdit(null);
    setIsHabitModalOpen(true);
  };

  const openEditHabit = (habit: Habit) => {
    setHabitToEdit(habit);
    setIsHabitModalOpen(true);
  };

  const handleUpdateHabitSubmit = async (id: string, habitData: Partial<Habit>) => {
    try {
      const payload: Partial<Habit> = {
        name: habitData.name || 'Untitled Habit',
        category: habitData.category || 'Fitness',
        points: habitData.points || 10,
        type: habitData.type || 'Count',
        target: Math.max(1, Number(habitData.target) || 1),
        unit: habitData.type === 'Timer' ? 'min' : habitData.unit || 'reps',
        repeat: habitData.repeat || 'Daily',
        timeOfDay: habitData.timeOfDay,
        enableFocusTimer: habitData.enableFocusTimer || false,
        routineId: habitData.routineId,
      };

      await api.updateHabit(id, payload);

      const nextHabits = await api.getHabits();
      setHabits(nextHabits);

      if (habitData.routineId) {
        const nextRoutines = await api.getRoutines();
        setRoutines(nextRoutines);
      }

      closeHabitModal();
      toast.success('Habit updated!');
    } catch (err: any) {
      toast.error('Error updating habit: ' + err.message);
    }
  };


  const handleRevertHabit = async (id: string) => {
    try {
      await api.logHabitAbsolute(id, dateToday, 0);

      const updatedHabits = await api.getHabits();
      setHabits(updatedHabits);
      const nextPoints = calculateTotalEarnedPoints(updatedHabits, routines);
      setUserPoints(nextPoints);
      await api.syncJourney({ total_points: nextPoints });
      toast.info('Habit reverted to active.');
    } catch (err: any) {
      toast.error('Failed to revert habit: ' + err.message);
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
      toast.success(`Routine "${rtData.name}" created!`);
    } catch (err: any) {
      toast.error('Error building routine: ' + err.message);
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

    openConfirm({
      title: 'Delete Habit',
      message: `Delete "${habitToDelete.name}" permanently? Its progress history will also be removed.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        setDeletingHabitId(id);
        try {
          await api.deleteHabit(id);
          setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
          setRoutines((currentRoutines) =>
            currentRoutines.map((routine) => ({
              ...routine,
              habitIds: routine.habitIds.filter((habitId) => habitId !== id)
            }))
          );
          toast.success(`"${habitToDelete.name}" deleted.`);
        } catch (err: any) {
          toast.error('Failed to delete habit: ' + err.message);
        } finally {
          setDeletingHabitId(null);
        }
      },
    });
  };


  // Reset database state completely
  const handleResetApp = async () => {
    openConfirm({
      title: 'Reset All Data',
      message: 'Reset all tracked points and habit logs to start fresh? This cannot be undone.',
      confirmLabel: 'Reset Everything',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirm();
        setAppLoading(true);
        try {
          await api.resetAllData();
          await loadAllData();
          setTab('dashboard');
          toast.success('All data reset to baseline!');
        } catch (err: any) {
          toast.error('Failure processing reset: ' + err.message);
        } finally {
          setAppLoading(false);
        }
      },
    });
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
    <div className="flex flex-col md:flex-row bg-[#0A0B0E] min-h-screen text-gray-100 font-sans antialiased overflow-x-hidden">
      
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
      />

      {/* 2. Main Content Body */}
      <main className="flex-1 p-4 md:p-10 pb-24 md:pb-10 max-h-screen overflow-y-auto relative">
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
            openCreateHabit={openCreateHabit}
            openCreateRoutine={() => setIsRoutineModalOpen(true)}
            onEditHabit={openEditHabit}
            onRevertHabit={handleRevertHabit}
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

        {currentTab === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            userPoints={userPoints}
            habits={habits}
            momentumScore={currentLiveMomentumScore}
            onLogout={handleLogout}
            onReset={handleResetApp}
            setTab={setTab}
          />
        )}
      </main>

      {/* Fixed bottom navigation for mobile viewports */}
      <BottomNav
        currentTab={currentTab}
        setTab={(t) => {
          setTab(t);
          setSelectedRoutineId(null);
          setSelectedCategoryId(null);
        }}
      />

      {/* 3. Global Control Modals */}
      <CreateHabitModal
        isOpen={isHabitModalOpen}
        onClose={closeHabitModal}
        routines={routines}
        onCreate={handleCreateHabitSubmit}
        onSave={handleUpdateHabitSubmit}
        habitToEdit={habitToEdit}
      />

      <CreateRoutineModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        onCreate={handleCreateRoutineSubmit}
      />

      {/* Polished confirm dialog — replaces browser confirm() */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
