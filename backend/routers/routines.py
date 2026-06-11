from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
import datetime
from ..database import get_db
from ..models import Routine, RoutineLog, Habit, User
from ..schemas import RoutineCreate, RoutineResponse, RoutineLogRequest, RoutineLogResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/routines", tags=["routines"])

@router.get("", response_model=List[RoutineResponse])
def get_routines(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    routines = db.query(Routine).filter(Routine.user_id == current_user.id).all()
    
    response = []
    for rt in routines:
        # Build completion mapping: dict of logged dates -> completion state (boolean)
        logs = db.query(RoutineLog).filter(RoutineLog.user_id == current_user.id, RoutineLog.routine_id == rt.id).all()
        completed_map = {log.date: log.completed for log in logs}

        response.append(
            RoutineResponse(
                id=rt.id,
                name=rt.name,
                points=rt.points,
                timeBlock=rt.time_block,
                repeat=rt.repeat,
                repeatDays=json.loads(rt.repeat_days) if rt.repeat_days else None,
                habitIds=json.loads(rt.habit_ids),
                completedHistory=completed_map
            )
        )
    return response


@router.post("", response_model=RoutineResponse, status_code=status.HTTP_201_CREATED)
def create_routine(rt_data: RoutineCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rt_id = rt_data.id if rt_data.id else f"rt-{int(datetime.datetime.utcnow().timestamp() * 1000)}"

    new_routine = Routine(
        id=rt_id,
        user_id=current_user.id,
        name=rt_data.name,
        points=rt_data.points,
        time_block=rt_data.timeBlock,
        repeat=rt_data.repeat,
        repeat_days=json.dumps(rt_data.repeatDays) if rt_data.repeatDays else None,
        habit_ids=json.dumps(rt_data.habitIds)
    )

    db.add(new_routine)
    db.commit()

    # Link habits to this routine id
    for h_id in rt_data.habitIds:
        habit = db.query(Habit).filter(Habit.id == h_id, Habit.user_id == current_user.id).first()
        if habit:
            habit.routine_id = rt_id
            db.add(habit)
    db.commit()
    db.refresh(new_routine)

    return RoutineResponse(
        id=new_routine.id,
        name=new_routine.name,
        points=new_routine.points,
        timeBlock=new_routine.time_block,
        repeat=new_routine.repeat,
        repeatDays=rt_data.repeatDays,
        habitIds=rt_data.habitIds,
        completedHistory={}
    )


@router.post("/{routine_id}/status", response_model=RoutineLogResponse)
def set_routine_status(
    routine_id: str,
    log_data: RoutineLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify routine existence
    rt = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == current_user.id).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Routine definition not found in your tracker.")

    # Find or upsert a routine completion log
    log = db.query(RoutineLog).filter(
        RoutineLog.user_id == current_user.id,
        RoutineLog.routine_id == routine_id,
        RoutineLog.date == log_data.date
    ).first()

    if not log:
        log = RoutineLog(
            user_id=current_user.id,
            routine_id=routine_id,
            date=log_data.date,
            completed=log_data.completed
        )
        db.add(log)
    else:
        log.completed = log_data.completed

    db.commit()
    db.refresh(log)

    return {
        "routineId": routine_id,
        "date": log.date,
        "completed": log.completed
    }


@router.delete("/{routine_id}")
def delete_routine(routine_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rt = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == current_user.id).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Routine registry entry not found.")

    # Unlink habits from this removed routine
    db.query(Habit).filter(Habit.routine_id == routine_id, Habit.user_id == current_user.id).update({Habit.routine_id: None})
    db.delete(rt)
    db.commit()

    return {"status": "success", "message": "Routine deleted. Active habits remain in catalog."}
