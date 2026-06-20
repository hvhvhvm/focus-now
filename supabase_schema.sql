-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  total_points integer default 0,
  locked_in_days integer default 0,
  consecutive_locked_in_streak integer default 0,
  journey_start_date date
);

-- 2. Habits Table
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  category text not null,
  points integer default 10,
  type text default 'Count',
  target integer not null,
  unit text default 'reps',
  repeat text default 'Daily',
  repeat_days jsonb,
  time_of_day text,
  enable_focus_timer boolean default false,
  routine_id uuid, -- Links to routines(id)
  created_at date default CURRENT_DATE
);

-- 3. Habit Logs Table
create table public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  value numeric not null,
  unique(habit_id, date)
);

-- 4. Routines Table
create table public.routines (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  points integer default 50,
  time_block text not null,
  repeat text default 'Daily',
  repeat_days jsonb,
  habit_ids jsonb
);

-- 5. Routine Logs Table
create table public.routine_logs (
  id uuid default uuid_generate_v4() primary key,
  routine_id uuid references public.routines(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  completed boolean default false,
  unique(routine_id, date)
);

-- 6. Indexes for Performance and Scalability
create index idx_habits_user_id on public.habits(user_id);
create index idx_habit_logs_user_id on public.habit_logs(user_id);
create index idx_habit_logs_habit_id on public.habit_logs(habit_id);
create index idx_routines_user_id on public.routines(user_id);
create index idx_routine_logs_user_id on public.routine_logs(user_id);
create index idx_routine_logs_routine_id on public.routine_logs(routine_id);

-- 7. Trigger to create a profile automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, total_points, locked_in_days, consecutive_locked_in_streak)
  values (new.id, new.email, 0, 0, 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.routines enable row level security;
alter table public.routine_logs enable row level security;

-- Policies (Users can only read/write their own data)
create policy "Users can manage their own profile" on public.profiles 
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage their own habits" on public.habits 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own habit logs" on public.habit_logs 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own routines" on public.routines 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own routine logs" on public.routine_logs 
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
