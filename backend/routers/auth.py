from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Habit
from ..schemas import UserCreate, UserLogin, TokenResponse, UserStatsResponse, JourneySyncRequest
from ..auth import get_password_hash, verify_password, create_access_token, get_current_user
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if duplicate email
    email_clean = user_data.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Hash user credentials and save
    hashed = get_password_hash(user_data.password)
    new_user = User(
        email=email_clean,
        password_hash=hashed,
        total_points=0,
        locked_in_days=0,
        consecutive_locked_in_streak=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Seed 3 default baseline habits automatically for a premium first-time onboarding experience
    seeded_habits = [
        Habit(
            id=f"fit-gym-{new_user.id}",
            user_id=new_user.id,
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
            id=f"read-book-{new_user.id}",
            user_id=new_user.id,
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
            id=f"mind-med-{new_user.id}",
            user_id=new_user.id,
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

    # Generate token
    token = create_access_token(data={"id": new_user.id, "email": new_user.email})

    return {
        "token": token,
        "user": new_user
    }


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email_clean = login_data.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    token = create_access_token(data={"id": user.id, "email": user.email})
    return {
        "token": token,
        "user": user
    }
