import { Habit, Routine } from './types';
import { supabase } from './supabase';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function isRateLimitError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return error?.status === 429 || message.includes('rate limit') || message.includes('too many requests');
}

function hasDemoCredentials(): boolean {
  return Boolean(import.meta.env.VITE_DEMO_EMAIL && import.meta.env.VITE_DEMO_PASSWORD);
}

export const api = {
  // Authentication & Profile
  async login(emailStr: string, passwordStr: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailStr, password: passwordStr });
    if (error) throw new ApiError(error.message, error.status || 400);
    if (!data.session) throw new ApiError('Login failed. Please check your credentials and try again.', 401);
    const profile = await this.getProfile();
    return { token: data.session.access_token, user: profile };
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async register(emailStr: string, passwordStr: string) {
    const { data, error } = await supabase.auth.signUp({
      email: emailStr,
      password: passwordStr,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      if (isRateLimitError(error)) {
        throw new ApiError('Signup is temporarily rate limited by Supabase. Please sign in if you already have an account, or try again after the cooldown.', 429);
      }
      throw new ApiError(error.message, error.status || 400);
    }
    if (!data.session) throw new ApiError('Registration successful. Please check your email to verify your account, then sign in.', 202);
    const profile = await this.getProfile();
    return { token: data.session.access_token, user: profile };
  },

  async loginDemoAccount() {
    if (!hasDemoCredentials()) {
      throw new ApiError('Demo login is not configured yet. Add VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD, or enable Anonymous Sign-Ins in Supabase.', 503);
    }
    return this.login(import.meta.env.VITE_DEMO_EMAIL, import.meta.env.VITE_DEMO_PASSWORD);
  },

  async startGuestSession() {
    const { data: existing } = await supabase.auth.getSession();
    if (existing.session) {
      const profile = await this.getProfile();
      return { token: existing.session.access_token, user: profile };
    }

    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: { display_name: 'Guest User' },
      },
    });

    if (error) {
      if (hasDemoCredentials()) {
        return this.loginDemoAccount();
      }
      if (isRateLimitError(error)) {
        throw new ApiError('Guest mode is temporarily rate limited by Supabase. Enable a demo account fallback or wait for the rate limit to reset.', 429);
      }
      throw new ApiError(`${error.message}. Enable Anonymous Sign-Ins in Supabase Auth, or configure VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD.`, error.status || 400);
    }
    if (!data.session) throw new ApiError('Guest session could not be started.', 400);
    const profile = await this.getProfile();
    return { token: data.session.access_token, user: profile };
  },

  async getProfile() {
    const { data: userAuth, error: authError } = await supabase.auth.getUser();
    if (authError || !userAuth.user) throw new ApiError('Not authenticated', 401);

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userAuth.user.id).maybeSingle();
    if (error) throw new ApiError(error.message, 500);
    if (data) return data;

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userAuth.user.id,
        email: userAuth.user.email || 'Guest User',
        total_points: 0,
        locked_in_days: 0,
        consecutive_locked_in_streak: 0,
      })
      .select()
      .single();
    if (createError) throw new ApiError(createError.message, 500);
    return created;
  },

  async syncJourney(stats: {
    journey_start_date?: string | null;
    total_points?: number;
    locked_in_days?: number;
    consecutive_locked_in_streak?: number;
  }) {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    const { data, error } = await supabase
      .from('profiles')
      .update(stats)
      .eq('id', userAuth.user.id)
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return data;
  },

  async resetAllData() {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);
    const uid = userAuth.user.id;

    // Reset profile stats
    await supabase.from('profiles').update({
      total_points: 0,
      locked_in_days: 0,
      consecutive_locked_in_streak: 0,
      journey_start_date: null
    }).eq('id', uid);

    // Delete habits and routines (cascades logs)
    await supabase.from('habits').delete().eq('user_id', uid);
    await supabase.from('routines').delete().eq('user_id', uid);

    // Add baseline habits
    const baselineHabits = [
      { name: "Power Workout", category: "Fitness", points: 30, type: "Count", target: 1, unit: "workout", repeat: "Daily", enable_focus_timer: false, user_id: uid },
      { name: "Technical Reading", category: "Reading", points: 15, type: "Timer", target: 30, unit: "min", repeat: "Daily", enable_focus_timer: true, user_id: uid },
      { name: "Mindfulness Breathing", category: "Mindfulness", points: 10, type: "Timer", target: 10, unit: "min", repeat: "Daily", enable_focus_timer: true, user_id: uid }
    ];
    await supabase.from('habits').insert(baselineHabits);
  },

  // Habits
  async getHabits(): Promise<Habit[]> {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    const { data: habits, error: hErr } = await supabase.from('habits').select('*').eq('user_id', userAuth.user.id);
    if (hErr) throw new ApiError(hErr.message, 500);

    const { data: logs, error: lErr } = await supabase.from('habit_logs').select('*').eq('user_id', userAuth.user.id);
    if (lErr) throw new ApiError(lErr.message, 500);

    return habits.map((h: any) => {
      const hLogs = logs.filter((l: any) => l.habit_id === h.id);
      const historyMap: { [date: string]: number } = {};
      hLogs.forEach((l: any) => {
        historyMap[l.date] = Number(l.value);
      });
      return {
        id: h.id,
        name: h.name,
        category: h.category,
        points: h.points,
        type: h.type,
        target: h.target,
        unit: h.unit,
        repeat: h.repeat,
        repeatDays: h.repeat_days,
        timeOfDay: h.time_of_day,
        enableFocusTimer: h.enable_focus_timer,
        routineId: h.routine_id,
        createdAt: h.created_at,
        history: historyMap,
      };
    });
  },

  async createHabit(habitData: Partial<Habit>): Promise<Habit> {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    const payload = {
      user_id: userAuth.user.id,
      name: habitData.name,
      category: habitData.category,
      points: habitData.points || 10,
      type: habitData.type || 'Count',
      target: habitData.target || 1,
      unit: habitData.unit || 'reps',
      repeat: habitData.repeat || 'Daily',
      repeat_days: habitData.repeatDays || null,
      time_of_day: habitData.timeOfDay || null,
      enable_focus_timer: habitData.enableFocusTimer || false,
      routine_id: habitData.routineId || null
    };

    const { data, error } = await supabase.from('habits').insert([payload]).select().single();
    if (error) throw new ApiError(error.message, 500);
    return {
        id: data.id,
        name: data.name,
        category: data.category,
        points: data.points,
        type: data.type,
        target: data.target,
        unit: data.unit,
        repeat: data.repeat,
        repeatDays: data.repeat_days,
        timeOfDay: data.time_of_day,
        enableFocusTimer: data.enable_focus_timer,
        routineId: data.routine_id,
        createdAt: data.created_at,
        history: {},
    };
  },

  async logHabit(habitId: string, date: string, value: number) {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    // Fetch current value so we can add to it atomically
    const { data: current } = await supabase
      .from('habit_logs')
      .select('value')
      .eq('habit_id', habitId)
      .eq('date', date)
      .maybeSingle();

    const newValue = current ? Number(current.value) + value : value;

    // Upsert on (habit_id, date) — atomic, race-safe
    const { error } = await supabase
      .from('habit_logs')
      .upsert(
        { habit_id: habitId, user_id: userAuth.user.id, date, value: newValue },
        { onConflict: 'habit_id,date' }
      );
    if (error) throw new ApiError(error.message, 500);
    return { habitId, date, value: newValue };
  },

  async logHabitAbsolute(habitId: string, date: string, value: number) {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    // Upsert absolute value — race-safe
    const { error } = await supabase
      .from('habit_logs')
      .upsert(
        { habit_id: habitId, user_id: userAuth.user.id, date, value },
        { onConflict: 'habit_id,date' }
      );
    if (error) throw new ApiError(error.message, 500);
    return { habitId, date, value };
  },

  async updateHabit(habitId: string, habitData: Partial<Habit>): Promise<Habit> {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    const payload: any = {};
    if (habitData.name !== undefined) payload.name = habitData.name;
    if (habitData.category !== undefined) payload.category = habitData.category;
    if (habitData.points !== undefined) payload.points = habitData.points;
    if (habitData.type !== undefined) payload.type = habitData.type;
    if (habitData.target !== undefined) payload.target = habitData.target;
    if (habitData.unit !== undefined) payload.unit = habitData.unit;
    if (habitData.repeat !== undefined) payload.repeat = habitData.repeat;
    if (habitData.repeatDays !== undefined) payload.repeat_days = habitData.repeatDays;
    if (habitData.timeOfDay !== undefined) payload.time_of_day = habitData.timeOfDay;
    if (habitData.enableFocusTimer !== undefined) payload.enable_focus_timer = habitData.enableFocusTimer;
    if (habitData.routineId !== undefined) payload.routine_id = habitData.routineId;

    const { data, error } = await supabase.from('habits').update(payload).eq('id', habitId).select().single();
    if (error) throw new ApiError(error.message, 500);

    return {
        id: data.id,
        name: data.name,
        category: data.category,
        points: data.points,
        type: data.type,
        target: data.target,
        unit: data.unit,
        repeat: data.repeat,
        repeatDays: data.repeat_days,
        timeOfDay: data.time_of_day,
        enableFocusTimer: data.enable_focus_timer,
        routineId: data.routine_id,
        createdAt: data.created_at,
        history: {}, // We don't fetch full history on update return
    };
  },

  async deleteHabit(habitId: string) {
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (error) throw new ApiError(error.message, 500);

    // If routines use this habitId in their array, remove it.
    // JSONB array removal is complex, simplest is fetching routines containing it and updating.
    const { data: routines } = await supabase.from('routines').select('id, habit_ids').contains('habit_ids', `["${habitId}"]`);
    if (routines) {
        for (const rt of routines) {
            const nextIds = rt.habit_ids.filter((id: string) => id !== habitId);
            await supabase.from('routines').update({ habit_ids: nextIds }).eq('id', rt.id);
        }
    }
  },

  // Routines
  async getRoutines(): Promise<Routine[]> {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    const { data: routines, error: rErr } = await supabase.from('routines').select('*').eq('user_id', userAuth.user.id);
    if (rErr) throw new ApiError(rErr.message, 500);

    const { data: logs, error: lErr } = await supabase.from('routine_logs').select('*').eq('user_id', userAuth.user.id);
    if (lErr) throw new ApiError(lErr.message, 500);

    return routines.map((rt: any) => {
      const rLogs = logs.filter((l: any) => l.routine_id === rt.id);
      const completedMap: { [date: string]: boolean } = {};
      rLogs.forEach((l: any) => {
        completedMap[l.date] = l.completed;
      });

      return {
        id: rt.id,
        name: rt.name,
        points: rt.points,
        timeBlock: rt.time_block,
        repeat: rt.repeat,
        repeatDays: rt.repeat_days,
        habitIds: rt.habit_ids || [],
        completedHistory: completedMap,
      };
    });
  },

  async createRoutine(rtData: {
    name: string;
    points: number;
    timeBlock: 'Morning' | 'Evening' | 'Night' | 'Constant';
    repeat: 'Daily' | 'Custom Days' | 'Today Only';
    habitIds: string[];
  }): Promise<Routine> {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    const payload = {
        user_id: userAuth.user.id,
        name: rtData.name,
        points: rtData.points || 50,
        time_block: rtData.timeBlock,
        repeat: rtData.repeat || 'Daily',
        habit_ids: rtData.habitIds,
    };

    const { data, error } = await supabase.from('routines').insert([payload]).select().single();
    if (error) throw new ApiError(error.message, 500);

    // Link routines back to habits
    if (rtData.habitIds && rtData.habitIds.length > 0) {
        await supabase.from('habits').update({ routine_id: data.id }).in('id', rtData.habitIds);
    }

    return {
        id: data.id,
        name: data.name,
        points: data.points,
        timeBlock: data.time_block as any,
        repeat: data.repeat as any,
        repeatDays: data.repeat_days,
        habitIds: data.habit_ids || [],
        completedHistory: {},
    };
  },

  async setRoutineStatus(routineId: string, date: string, completed: boolean) {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) throw new ApiError('Not authenticated', 401);

    // Upsert on (routine_id, date) — race-safe
    const { error } = await supabase
      .from('routine_logs')
      .upsert(
        { routine_id: routineId, user_id: userAuth.user.id, date, completed },
        { onConflict: 'routine_id,date' }
      );
    if (error) throw new ApiError(error.message, 500);
  },

  async deleteRoutine(routineId: string) {
    const { error } = await supabase.from('routines').delete().eq('id', routineId);
    if (error) throw new ApiError(error.message, 500);

    await supabase.from('habits').update({ routine_id: null }).eq('routine_id', routineId);
  },
};
