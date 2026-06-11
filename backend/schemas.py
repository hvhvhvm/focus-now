from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict

# --- AUTH/USER SCHEMAS ---

class UserBase(BaseModel):
    email: EmailStr = Field(..., examples=["champion@habitmountain.com"])

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Minimum 6 character secure password", examples=["securePass123!"])

class UserLogin(UserBase):
    password: str = Field(..., examples=["securePass123!"])

class UserStatsResponse(UserBase):
    id: int
    total_points: int = 0
    locked_in_days: int = 0
    consecutive_locked_in_streak: int = 0
    journey_start_date: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    token: str
    user: UserStatsResponse

class JourneySyncRequest(BaseModel):
    journey_start_date: Optional[str] = None
    total_points: Optional[int] = None
    locked_in_days: Optional[int] = None
    consecutive_locked_in_streak: Optional[int] = None


# --- HABIT SCHEMAS ---

class HabitBase(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., examples=["Daily Pushups"])
    category: str = Field(..., examples=["Fitness"])
    points: int = Field(10, examples=[15])
    type: str = Field("Count", description="Count or Timer", examples=["Count"])
    target: int = Field(..., examples=[100])
    unit: str = Field("reps", examples=["reps"])
    repeat: str = Field("Daily", description="Daily | Custom Days | Today Only", examples=["Daily"])
    repeatDays: Optional[List[int]] = Field(None, examples=[[1, 3, 5]])
    timeOfDay: Optional[str] = Field(None, examples=["08:30"])
    enableFocusTimer: bool = Field(False, examples=[True])
    routineId: Optional[str] = None

class HabitCreate(HabitBase):
    pass

class HabitResponse(HabitBase):
    id: str
    createdAt: str
    history: Dict[str, float] = {} # Date (YYYY-MM-DD) -> progress logged value

    class Config:
        from_attributes = True


class HabitLogRequest(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD", examples=["2026-05-29"])
    value: float = Field(..., description="Amount of units to log", examples=[20.0])

class HabitLogResponse(BaseModel):
    habitId: str
    date: str
    value: float


# --- ROUTINE SCHEMAS ---

class RoutineBase(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., examples=["Morning Windup Grid"])
    points: int = Field(50, examples=[75])
    timeBlock: str = Field("Morning", description="Morning | Evening | Night | Constant", examples=["Morning"])
    repeat: str = Field("Daily", examples=["Daily"])
    repeatDays: Optional[List[int]] = Field(None, examples=[[1, 2, 3, 4, 5]])
    habitIds: List[str] = Field(..., examples=[["fit-gym-123", "read-book-123"]])

class RoutineCreate(RoutineBase):
    pass

class RoutineResponse(RoutineBase):
    id: str
    completedHistory: Dict[str, bool] = {} # Date (YYYY-MM-DD) -> fully completed status

    class Config:
        from_attributes = True


class RoutineLogRequest(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD", examples=["2026-05-29"])
    completed: bool = Field(..., description="Complete or incomplete state", examples=[True])

class RoutineLogResponse(BaseModel):
    routineId: str
    date: str
    completed: bool


# --- STATS SUMMARY SCHEMAS ---

class MetricTrajectory(BaseModel):
    score: float = Field(..., description="Current Rolling Momentum Score [0-100]")
    stateName: str = Field(..., description="INERTIA | IGNITE | FLOW | LOCKED")
    todayProgressCount: int
    totalCount: int
    streak: int
