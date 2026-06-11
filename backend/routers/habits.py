from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
import datetime
from ..database import get_db
from ..models import Habit, HabitLog, User
from ..schemas import HabitCreate, HabitResponse, HabitLogRequest, HabitLogResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/habits", tags=["habits"])

@router.get("", response_model=List[HabitResponse])
def get_habits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
    
    response = []
    for h in habits:
        # Build history mapping: dict of logged dates -> total logged value
        logs = db.query(HabitLog).filter(HabitLog.user_id == current_user.id, HabitLog.habit_id == h.id).all()
        history_map = {log.date: log.value for log in logs}

        response.append(
            HabitResponse(
                id=h.id,
                name=h.name,
                category=h.category,
                points=h.points,
                type=h.type,
                target=h.target,
                unit=h.unit,
                repeat=h.repeat,
                repeatDays=json.loads(h.repeat_days) if h.repeat_days else None,
                timeOfDay=h.time_of_day,
                enableFocusTimer=h.enable_focus_timer,
                routineId=h.routine_id,
                createdAt=h.created_at,
                history=history_map
            )
        )
    return response


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
def create_habit(habit_data: HabitCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Generate ID if not specified by user Client ID builder
    h_id = habit_data.id if habit_data.id else f"habit-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    createdAtStr = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    new_habit = Habit(
        id=h_id,
        user_id=current_user.id,
        name=habit_data.name,
        category=habit_data.category,
        points=habit_data.points,
        type=habit_data.type,
        target=habit_data.target,
        unit=habit_data.unit,
        repeat=habit_data.repeat,
        repeat_days=json.dumps(habit_data.repeatDays) if habit_data.repeatDays else None,
        time_of_day=habit_data.timeOfDay,
        enable_focus_timer=habit_data.enableFocusTimer,
        routine_id=habit_data.routineId,
        created_at=createdAtStr
    )

    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)

    return HabitResponse(
        id=new_habit.id,
        name=new_habit.name,
        category=new_habit.category,
        points=new_habit.points,
        type=new_habit.type,
        target=new_habit.target,
        unit=new_habit.unit,
        repeat=new_habit.repeat,
        repeatDays=habit_data.repeatDays,
        timeOfDay=new_habit.time_of_day,
        enableFocusTimer=new_habit.enable_focus_timer,
        routineId=new_habit.routine_id,
        createdAt=new_habit.created_at,
        history={}
    )


@router.post("/{habit_id}/log", response_model=HabitLogResponse)
def log_habit_progress(
    habit_id: str,
    log_data: HabitLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify habit existence
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit profile not found in your catalog.")

    # Find or create a log entry and increment value
    log = db.query(HabitLog).filter(
        HabitLog.user_id == current_user.id,
        HabitLog.habit_id == habit_id,
        HabitLog.date == log_data.date
    ).first()

    if not log:
        log = HabitLog(
            user_id=current_user.id,
            habit_id=habit_id,
            date=log_data.date,
            value=log_data.value
        )
        db.add(log)
    else:
        log.value += log_data.value

    db.commit()
    db.refresh(log)

    return {
        "habitId": habit_id,
        "date": log.date,
        "value": log.value
    }


@router.post("/{habit_id}/log-absolute", response_model=HabitLogResponse)
def log_habit_absolute(
    habit_id: str,
    log_data: HabitLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify habit existence
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit profile not found in your catalog.")

    log = db.query(HabitLog).filter(
        HabitLog.user_id == current_user.id,
        HabitLog.habit_id == habit_id,
        HabitLog.date == log_data.date
    ).first()

    if not log:
        log = HabitLog(
            user_id=current_user.id,
            habit_id=habit_id,
            date=log_data.date,
            value=log_data.value
        )
        db.add(log)
    else:
        log.value = log_data.value

    db.commit()
    db.refresh(log)

    return {
        "habitId": habit_id,
        "date": log.date,
        "value": log.value
    }


@router.delete("/{habit_id}")
def delete_habit(habit_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit registry not found.")

    db.delete(habit)
    db.commit()
    return {"status": "success", "message": "Habit profile deleted and database purged."}
