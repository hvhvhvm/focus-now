import { Habit, Routine, UserStats } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getHeaders() {
  const token = localStorage.getItem('habit_mountain_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = getHeaders();
  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${url}`, config);
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const errData = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {};
    const message =
      errData.error ||
      errData.detail ||
      errData.message ||
      (response.status === 404
        ? 'The API endpoint was not found. Check VITE_API_BASE_URL in your deployment settings.'
        : `Request failed (${response.status} ${response.statusText}).`);

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Authentication & Profile
  async login(emailStr: string, passwordStr: string) {
    return fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailStr, password: passwordStr }),
    });
  },

  async register(emailStr: string, passwordStr: string) {
    return fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: emailStr, password: passwordStr }),
    });
  },

  async getProfile() {
    return fetchWithAuth('/user/me', { method: 'GET' });
  },

  async syncJourney(stats: {
    journey_start_date?: string | null;
    total_points?: number;
    locked_in_days?: number;
    consecutive_locked_in_streak?: number;
  }) {
    return fetchWithAuth('/user/sync-journey', {
      method: 'POST',
      body: JSON.stringify(stats),
    });
  },

  async resetAllData() {
    return fetchWithAuth('/user/reset', { method: 'POST' });
  },

  // Habits
  async getHabits(): Promise<Habit[]> {
    return fetchWithAuth('/habits', { method: 'GET' });
  },

  async createHabit(habitData: Partial<Habit>): Promise<Habit> {
    return fetchWithAuth('/habits', {
      method: 'POST',
      body: JSON.stringify(habitData),
    });
  },

  async logHabit(habitId: string, date: string, value: number) {
    return fetchWithAuth(`/habits/${habitId}/log`, {
      method: 'POST',
      body: JSON.stringify({ date, value }),
    });
  },

  async logHabitAbsolute(habitId: string, date: string, value: number) {
    return fetchWithAuth(`/habits/${habitId}/log-absolute`, {
      method: 'POST',
      body: JSON.stringify({ date, value }),
    });
  },

  async deleteHabit(habitId: string) {
    return fetchWithAuth(`/habits/${habitId}`, { method: 'DELETE' });
  },

  // Routines
  async getRoutines(): Promise<Routine[]> {
    return fetchWithAuth('/routines', { method: 'GET' });
  },

  async createRoutine(rtData: {
    name: string;
    points: number;
    timeBlock: 'Morning' | 'Evening' | 'Night' | 'Constant';
    repeat: 'Daily' | 'Custom Days' | 'Today Only';
    habitIds: string[];
  }): Promise<Routine> {
    return fetchWithAuth('/routines', {
      method: 'POST',
      body: JSON.stringify(rtData),
    });
  },

  async setRoutineStatus(routineId: string, date: string, completed: boolean) {
    return fetchWithAuth(`/routines/${routineId}/status`, {
      method: 'POST',
      body: JSON.stringify({ date, completed }),
    });
  },

  async deleteRoutine(routineId: string) {
    return fetchWithAuth(`/routines/${routineId}`, { method: 'DELETE' });
  },
};
