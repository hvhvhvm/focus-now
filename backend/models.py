import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Date, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    total_points = Column(Integer, default=0)
    locked_in_days = Column(Integer, default=0)
    consecutive_locked_in_streak = Column(Integer, default=0)
    journey_start_date = Column(String, nullable=True) # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    habits = relationship("Habit", back_populates="owner", cascade="all, delete-orphan")
    routines = relationship("Routine", back_populates="owner", cascade="all, delete-orphan")
    habit_logs = relationship("HabitLog", back_populates="user", cascade="all, delete-orphan")
    routine_logs = relationship("RoutineLog", back_populates="user", cascade="all, delete-orphan")


class Habit(Base):
    __tablename__ = "habits"

    id = Column(String, primary_key=True, index=True) # client generated uuid
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # e.g. Fitness, Reading
    points = Column(Integer, default=10)
    type = Column(String, nullable=False) # Count | Timer
    target = Column(Integer, nullable=False)
    unit = Column(String, nullable=False) # reps, min, km
    repeat = Column(String, default="Daily") # Daily, Custom Days
    repeat_days = Column(String, nullable=True) # JSON Array as String e.g. "[1,2,3,4,5]"
    time_of_day = Column(String, nullable=True) # "HH:MM"
    enable_focus_timer = Column(Boolean, default=False)
    routine_id = Column(String, ForeignKey("routines.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(String, nullable=False) # YYYY-MM-DD

    owner = relationship("User", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")
    routine = relationship("Routine", back_populates="habits_rel")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    habit_id = Column(String, ForeignKey("habits.id", ondelete="CASCADE"), primary_key=True)
    date = Column(String, primary_key=True) # YYYY-MM-DD
    value = Column(Float, nullable=False) # value logged (incremental)

    user = relationship("User", back_populates="habit_logs")
    habit = relationship("Habit", back_populates="logs")

    __table_args__ = (
        UniqueConstraint("user_id", "habit_id", "date", name="uix_user_habit_date"),
    )


class Routine(Base):
    __tablename__ = "routines"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    points = Column(Integer, default=50)
    time_block = Column(String, nullable=False) # Morning | Evening | Night | Constant
    repeat = Column(String, default="Daily")
    repeat_days = Column(String, nullable=True) # JSON Array as String
    habit_ids = Column(String, nullable=False) # JSON encoded string of habit ID strings

    owner = relationship("User", back_populates="routines")
    habits_rel = relationship("Habit", back_populates="routine", foreign_keys=[Habit.routine_id])
    completed_logs = relationship("RoutineLog", back_populates="routine", cascade="all, delete-orphan")


class RoutineLog(Base):
    __tablename__ = "routine_logs"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    routine_id = Column(String, ForeignKey("routines.id", ondelete="CASCADE"), primary_key=True)
    date = Column(String, primary_key=True) # YYYY-MM-DD
    completed = Column(Boolean, default=False)

    user = relationship("User", back_populates="routine_logs")
    routine = relationship("Routine", back_populates="completed_logs")

    __table_args__ = (
        UniqueConstraint("user_id", "routine_id", "date", name="uix_user_routine_date"),
    )
