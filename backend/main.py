from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, habits, routines, stats

# Create SQLAlchemy Database tables (if not utilizing Alembic manual migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mountain Habit Tracker - Advanced API Engine",
    description="Scalable FastAPI backend backed by PostgreSQL / SQLite mapping schema matrices.",
    version="1.0.0"
)

# Set CORS origins for frontend cross-origin requests
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route attachment
app.include_router(auth.router)
app.include_router(habits.router)
app.include_router(routines.router)
app.include_router(stats.router)

@app.get("/api/health")
def health_endpoint():
    return {
        "status": "healthy",
        "service": "Mountain Habit Tracker Backend",
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    # In production, FastAPI usually binds to port 8000 when proxian proxies route through Express or Nginx
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
