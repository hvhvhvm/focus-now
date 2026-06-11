from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Habit, HabitLog, Routine, RoutineLog
from ..schemas import UserStatsResponse, JourneySyncRequest
from ..auth import get_current_user
import uuid

router = APIRouter(prefix="/api/user", tags=["user"])

@router.get("/me", response_model=UserStatsResponse)
def get_user_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/sync-journey", response_model=UserStatsResponse)
def sync_journey(
    sync_data: JourneySyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if sync_data.journey_start_date is not None:
        current_user.journey_start_date = sync_data.journey_start_date
    if sync_data.total_points is not None:
        current_user.total_points = sync_data.total_points
    if sync_data.locked_in_days is not None:
        current_user.locked_in_days = sync_data.locked_in_days
    if sync_data.consecutive_locked_in_streak is not None:
        current_user.consecutive_locked_in_streak = sync_data.consecutive_locked_in_streak

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/reset")
def reset_user_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    userId = current_user.id
    
    # Update stats
    current_user.total_points = 0
    current_user.locked_in_days = 0
    current_user.consecutive_locked_in_streak = 0
    current_user.journey_start_date = None
    
    # Delete dependent tracker rows
    db.query(HabitLog).filter(HabitLog.user_id == userId).delete()
    db.query(RoutineLog).filter(RoutineLog.user_id == userId).delete()
    db.query(Habit).filter(Habit.user_id == userId).delete()
    db.query(Routine).filter(Routine.user_id == userId).delete()
    
    # Re-seed basic starting habits
    seeded_habits = [
        Habit(
            id=f"fit-gym-{userId}",
            user_id=userId,
            name="Power Workout",
            category="Fitness",
            points=30,
            type="Count",
            target=1,
            unit="workout",
            repeat="Daily",
            created_at=uuid.uuid4().hex[:10]
        ),
        Habit(
            id=f"read-book-{userId}",
            user_id=userId,
            name="Technical Reading",
            category="Reading",
            points=15,
            type="Timer",
            target=30,
            unit="min",
            repeat="Daily",
            enable_focus_timer=True,
            created_at=uuid.uuid4().hex[:10]
        ),
        Habit(
            id=f"mind-med-{userId}",
            user_id=userId,
            name="Mindfulness Breathing",
            category="Mindfulness",
            points=10,
            type="Timer",
            target=10,
            unit="min",
            repeat="Daily",
            enable_focus_timer=True,
            created_at=uuid.uuid4().hex[:10]
        )
    ]
    db.add_all(seeded_habits)
    db.commit()

    return {"status": "success", "message": "All database profiles reset to initial template configuration."}
