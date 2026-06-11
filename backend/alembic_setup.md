# Alembic Database Migration Steps in Production

To set up and run databases migrations with Postgres using Alembic, follow these steps:

## 1. Install dependencies
Initialize your backend poetry/pip virtual environment:
```bash
pip install alembic psycopg2-binary
```

## 2. Initialize Alembic config
Run inside the `backend` root workspace:
```bash
alembic init alembic
```

## 3. Configure `alembic.ini`
Point your production connection string:
```ini
# alembic.ini
sqlalchemy.url = postgresql://postgres:secure_password@localhost:5432/habit_mountain
```

## 4. Edit `alembic/env.py`
To support autogenerate schemas from SQLAlchemy models, alter `alembic/env.py`:
```python
# alembic/env.py
from backend.database import Base
from backend.models import User, Habit, HabitLog, Routine, RoutineLog

# Set target metadata
target_metadata = Base.metadata
```

## 5. Generate Initial Migration revision
Autodetect differences between your models and database schema:
```bash
alembic revision --autogenerate -m "Initial schema setup representing users, habits, routines, logs"
```

## 6. Apply migrations in production
Promote schema modifications to your active Postgres platform:
```bash
alembic upgrade head
```
