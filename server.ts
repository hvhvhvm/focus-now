import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "mountain-summit-secret-token";
const JSON_DB_PATH = path.join(process.cwd(), "mountain_habit_tracker_db.json");

// Pure JS in-memory state that persists to JSON
interface DBState {
  users: any[];
  habits: any[];
  habit_logs: any[];
  routines: any[];
  routine_logs: any[];
}

let dbState: DBState = {
  users: [],
  habits: [],
  habit_logs: [],
  routines: [],
  routine_logs: []
};

// Sync memory to file
function saveDb() {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to JSON db file:", err);
  }
}

// Initial check & load
function initDb() {
  if (fs.existsSync(JSON_DB_PATH)) {
    try {
      const data = fs.readFileSync(JSON_DB_PATH, "utf-8");
      const parsed = JSON.parse(data);
      dbState = {
        users: parsed.users || [],
        habits: parsed.habits || [],
        habit_logs: parsed.habit_logs || [],
        routines: parsed.routines || [],
        routine_logs: parsed.routine_logs || []
      };
      console.log("JSON Database loaded successfully with state counts:", {
        users: dbState.users.length,
        habits: dbState.habits.length,
        habit_logs: dbState.habit_logs.length,
        routines: dbState.routines.length,
        routine_logs: dbState.routine_logs.length
      });
    } catch (err) {
      console.error("Failed to parse JSON db, initiating clean template:", err);
      saveDb();
    }
  } else {
    console.log("JSON Db file did not exist. Seeding blank database state.");
    saveDb();
  }
}

// Authentication Middleware
interface AuthRequest extends express.Request {
  user?: {
    id: number;
    email: string;
  };
}

function authenticateToken(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token missing. Please sign in." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Session expired or invalid token. Please sign in again." });
    }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Init JSON db structure
  initDb();

  // --- REST ENDPOINTS ---

  // 1. Authentication

  // Register
  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required fields." });
    }

    try {
      const emailLower = email.toLowerCase().trim();
      const existingUser = dbState.users.find(u => u.email === emailLower);
      if (existingUser) {
        return res.status(400).json({ error: "A user with this email address already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      const newUserId = dbState.users.length > 0 
        ? Math.max(...dbState.users.map(u => u.id)) + 1 
        : 1;

      const newUser = {
        id: newUserId,
        email: emailLower,
        password_hash: passwordHash,
        total_points: 0,
        locked_in_days: 0,
        consecutive_locked_in_streak: 0,
        journey_start_date: null,
        created_at: new Date().toISOString()
      };

      dbState.users.push(newUser);

      // Seed initial dummy habits for new user so they have full experience right away!
      const initialSeedHabits = [
        { id: `fit-gym-${newUserId}`, name: "Power Workout", category: "Fitness", points: 30, type: "Count", target: 1, unit: "workout", repeat: "Daily", enable_focus_timer: 0 },
        { id: `read-book-${newUserId}`, name: "Technical Reading", category: "Reading", points: 15, type: "Timer", target: 30, unit: "min", repeat: "Daily", enable_focus_timer: 1 },
        { id: `mind-med-${newUserId}`, name: "Mindfulness Breathing", category: "Mindfulness", points: 10, type: "Timer", target: 10, unit: "min", repeat: "Daily", enable_focus_timer: 1 }
      ];

      for (const h of initialSeedHabits) {
        dbState.habits.push({
          id: h.id,
          user_id: newUserId,
          name: h.name,
          category: h.category,
          points: h.points,
          type: h.type,
          target: h.target,
          unit: h.unit,
          repeat: h.repeat,
          repeat_days: null,
          time_of_day: null,
          enable_focus_timer: h.enable_focus_timer,
          routine_id: null,
          created_at: new Date().toISOString().split('T')[0]
        });
      }

      saveDb();

      const token = jwt.sign({ id: newUserId, email: emailLower }, JWT_SECRET, { expiresIn: "7d" });

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          total_points: newUser.total_points,
          locked_in_days: newUser.locked_in_days,
          consecutive_locked_in_streak: newUser.consecutive_locked_in_streak,
          journey_start_date: newUser.journey_start_date
        }
      });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Failed to register new account. " + err.message });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required fields." });
    }

    try {
      const emailLower = email.toLowerCase().trim();
      const user = dbState.users.find(u => u.email === emailLower);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          total_points: user.total_points,
          locked_in_days: user.locked_in_days,
          consecutive_locked_in_streak: user.consecutive_locked_in_streak,
          journey_start_date: user.journey_start_date
        }
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "An unexpected error occurred during login." });
    }
  });

  // Get User Profile
  app.get("/api/user/me", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const user = dbState.users.find(u => u.id === req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User profile not found." });
      }
      res.json({
        id: user.id,
        email: user.email,
        total_points: user.total_points,
        locked_in_days: user.locked_in_days,
        consecutive_locked_in_streak: user.consecutive_locked_in_streak,
        journey_start_date: user.journey_start_date
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user profile." });
    }
  });

  // Sync user stats
  app.post("/api/user/sync-journey", authenticateToken as any, async (req: AuthRequest, res) => {
    const { journey_start_date, total_points, locked_in_days, consecutive_locked_in_streak } = req.body;
    try {
      const user = dbState.users.find(u => u.id === req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User session not found." });
      }

      if (journey_start_date !== undefined) user.journey_start_date = journey_start_date;
      if (total_points !== undefined) user.total_points = total_points;
      if (locked_in_days !== undefined) user.locked_in_days = locked_in_days;
      if (consecutive_locked_in_streak !== undefined) user.consecutive_locked_in_streak = consecutive_locked_in_streak;

      saveDb();

      res.json({
        id: user.id,
        email: user.email,
        total_points: user.total_points,
        locked_in_days: user.locked_in_days,
        consecutive_locked_in_streak: user.consecutive_locked_in_streak,
        journey_start_date: user.journey_start_date
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to sync user statistics. " + err.message });
    }
  });

  // Reset user data
  app.post("/api/user/reset", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = dbState.users.find(u => u.id === userId);
      if (user) {
        user.total_points = 0;
        user.locked_in_days = 0;
        user.consecutive_locked_in_streak = 0;
        user.journey_start_date = null;
      }

      // Purge logs and records matching user
      dbState.habit_logs = dbState.habit_logs.filter(log => log.user_id !== userId);
      dbState.routine_logs = dbState.routine_logs.filter(log => log.user_id !== userId);
      dbState.habits = dbState.habits.filter(h => h.user_id !== userId);
      dbState.routines = dbState.routines.filter(r => r.user_id !== userId);

      // Seed baseline habits again so dashboard isn't completely empty after reset
      const initialSeedHabits = [
        { id: `fit-gym-${userId}`, name: "Power Workout", category: "Fitness", points: 30, type: "Count", target: 1, unit: "workout", repeat: "Daily", enable_focus_timer: 0 },
        { id: `read-book-${userId}`, name: "Technical Reading", category: "Reading", points: 15, type: "Timer", target: 30, unit: "min", repeat: "Daily", enable_focus_timer: 1 },
        { id: `mind-med-${userId}`, name: "Mindfulness Breathing", category: "Mindfulness", points: 10, type: "Timer", target: 10, unit: "min", repeat: "Daily", enable_focus_timer: 1 }
      ];

      for (const h of initialSeedHabits) {
        dbState.habits.push({
          id: h.id,
          user_id: userId,
          name: h.name,
          category: h.category,
          points: h.points,
          type: h.type,
          target: h.target,
          unit: h.unit,
          repeat: h.repeat,
          repeat_days: null,
          time_of_day: null,
          enable_focus_timer: h.enable_focus_timer,
          routine_id: null,
          created_at: new Date().toISOString().split('T')[0]
        });
      }

      saveDb();

      res.json({ message: "Successfully reset all data to template conditions." });
    } catch (err: any) {
      res.status(500).json({ error: "Reset failed: " + err.message });
    }
  });


  // 2. Habits Endpoints

  // Get habits
  app.get("/api/habits", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const userHabits = dbState.habits.filter(h => h.user_id === req.user!.id);
      
      const habitsWithHistory = userHabits.map((habit) => {
        const logs = dbState.habit_logs.filter(log => log.user_id === req.user!.id && log.habit_id === habit.id);
        const historyMap: { [date: string]: number } = {};
        logs.forEach((log) => {
          historyMap[log.date] = log.value;
        });

        return {
          id: habit.id,
          name: habit.name,
          category: habit.category,
          points: habit.points,
          type: habit.type,
          target: habit.target,
          unit: habit.unit,
          repeat: habit.repeat,
          repeatDays: habit.repeat_days ? JSON.parse(habit.repeat_days) : undefined,
          timeOfDay: habit.time_of_day,
          enableFocusTimer: habit.enable_focus_timer === 1,
          routineId: habit.routine_id,
          createdAt: habit.created_at,
          history: historyMap,
        };
      });

      res.json(habitsWithHistory);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch habits lists." });
    }
  });

  // Create habit
  app.post("/api/habits", authenticateToken as any, async (req: AuthRequest, res) => {
    const { id, name, category, points, type, target, unit, repeat, repeatDays, timeOfDay, enableFocusTimer, routineId } = req.body;
    if (!name || !category || target === undefined) {
      return res.status(400).json({ error: "Missing required habit parameters." });
    }

    const newId = id || `habit-${Date.now()}`;
    const createdAtStr = new Date().toISOString().split("T")[0];

    try {
      const newHabit = {
        id: newId,
        user_id: req.user!.id,
        name,
        category,
        points: points || 10,
        type: type || "Count",
        target,
        unit: unit || "reps",
        repeat: repeat || "Daily",
        repeat_days: repeatDays ? JSON.stringify(repeatDays) : null,
        time_of_day: timeOfDay || null,
        enable_focus_timer: enableFocusTimer ? 1 : 0,
        routine_id: routineId || null,
        created_at: createdAtStr
      };

      dbState.habits.push(newHabit);
      saveDb();

      res.status(201).json({
        id: newId,
        name,
        category,
        points: points || 10,
        type: type || "Count",
        target,
        unit: unit || "reps",
        repeatOn: repeat || "Daily",
        repeatDays,
        timeOfDay,
        enableFocusTimer: !!enableFocusTimer,
        routineId,
        createdAt: createdAtStr,
        history: {},
      });
    } catch (err: any) {
      console.error("Create habit error:", err);
      res.status(500).json({ error: "Database error setting up habit schema. " + err.message });
    }
  });

  // Log habit implementation
  app.post("/api/habits/:id/log", authenticateToken as any, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { date, value } = req.body;

    if (!date || value === undefined) {
      return res.status(400).json({ error: "Params 'date' and 'value' are required." });
    }

    try {
      // Find or insert
      let log = dbState.habit_logs.find(l => l.user_id === req.user!.id && l.habit_id === id && l.date === date);
      if (!log) {
        log = {
          user_id: req.user!.id,
          habit_id: id,
          date,
          value: parseFloat(value)
        };
        dbState.habit_logs.push(log);
      } else {
        log.value += parseFloat(value);
      }

      saveDb();

      res.json({ habitId: id, date, value: log.value });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to record habit completion. " + err.message });
    }
  });

  // Set absolute habit log value
  app.post("/api/habits/:id/log-absolute", authenticateToken as any, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { date, value } = req.body;

    if (!date || value === undefined) {
      return res.status(400).json({ error: "Params 'date' and 'value' are required." });
    }

    try {
      let log = dbState.habit_logs.find(l => l.user_id === req.user!.id && l.habit_id === id && l.date === date);
      if (!log) {
        log = {
          user_id: req.user!.id,
          habit_id: id,
          date,
          value: parseFloat(value)
        };
        dbState.habit_logs.push(log);
      } else {
        log.value = parseFloat(value);
      }

      saveDb();

      res.json({ habitId: id, date, value: log.value });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to log absolute habit capacity." });
    }
  });

  // Delete habit
  app.delete("/api/habits/:id", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const habitIdToDelete = req.params.id;
      const uId = req.user!.id;
      const habitExists = dbState.habits.some(
        h => h.id === habitIdToDelete && h.user_id === uId
      );

      if (!habitExists) {
        return res.status(404).json({ error: "Habit not found." });
      }

      dbState.habits = dbState.habits.filter(h => !(h.id === habitIdToDelete && h.user_id === uId));
      dbState.habit_logs = dbState.habit_logs.filter(l => !(l.habit_id === habitIdToDelete && l.user_id === uId));
      
      // Clean up reference in any of the user's routines
      dbState.routines.forEach(rt => {
        if (rt.user_id === uId) {
          try {
            const hIds = JSON.parse(rt.habit_ids);
            if (Array.isArray(hIds) && hIds.includes(habitIdToDelete)) {
              rt.habit_ids = JSON.stringify(hIds.filter((id: string) => id !== habitIdToDelete));
            }
          } catch (e) {
            console.error("Failed to update routine habit_ids during habit deletion:", e);
          }
        }
      });

      saveDb();

      res.json({ status: "success", message: "Habit destroyed securely and removed from routines." });
    } catch (err: any) {
      res.status(500).json({ error: "Failure while purging habit database records." });
    }
  });


  // 3. Routines Endpoints

  // Get routines
  app.get("/api/routines", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const userRoutines = dbState.routines.filter(r => r.user_id === req.user!.id);
      
      const routinesWithCompletedHistory = userRoutines.map((rt) => {
        const logs = dbState.routine_logs.filter(log => log.user_id === req.user!.id && log.routine_id === rt.id);
        const completedMap: { [date: string]: boolean } = {};
        logs.forEach((log) => {
          completedMap[log.date] = log.completed === 1;
        });

        return {
          id: rt.id,
          name: rt.name,
          points: rt.points,
          timeBlock: rt.time_block,
          repeat: rt.repeat,
          repeatDays: rt.repeat_days ? JSON.parse(rt.repeat_days) : undefined,
          habitIds: JSON.parse(rt.habit_ids),
          completedHistory: completedMap,
        };
      });

      res.json(routinesWithCompletedHistory);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve active routines roster." });
    }
  });

  // Create routine
  app.post("/api/routines", authenticateToken as any, async (req: AuthRequest, res) => {
    const { id, name, points, timeBlock, repeat, repeatDays, habitIds } = req.body;
    if (!name || !timeBlock || !habitIds || !Array.isArray(habitIds)) {
      return res.status(400).json({ error: "Missing required routine properties." });
    }

    const newId = id || `rt-${Date.now()}`;

    try {
      const newRoutine = {
        id: newId,
        user_id: req.user!.id,
        name,
        points: points || 50,
        time_block: timeBlock,
        repeat: repeat || "Daily",
        repeat_days: repeatDays ? JSON.stringify(repeatDays) : null,
        habit_ids: JSON.stringify(habitIds)
      };

      dbState.routines.push(newRoutine);

      // Link any newly created habits to this routine id
      for (const hId of habitIds) {
        const h = dbState.habits.find(habit => habit.id === hId && habit.user_id === req.user!.id);
        if (h) {
          h.routine_id = newId;
        }
      }

      saveDb();

      res.status(201).json({
        id: newId,
        name,
        points: points || 50,
        timeBlock,
        repeat,
        repeatDays,
        habitIds,
        completedHistory: {},
      });
    } catch (err: any) {
      res.status(500).json({ error: "Routine creation sequence failed. " + err.message });
    }
  });

  // Toggle/log routine completion status on specific date
  app.post("/api/routines/:id/status", authenticateToken as any, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { date, completed } = req.body;

    if (!date || completed === undefined) {
      return res.status(400).json({ error: "Params 'date' and 'completed' parameter of boolean typified is required." });
    }

    try {
      let log = dbState.routine_logs.find(l => l.user_id === req.user!.id && l.routine_id === id && l.date === date);
      if (!log) {
        log = {
          user_id: req.user!.id,
          routine_id: id,
          date,
          completed: completed ? 1 : 0
        };
        dbState.routine_logs.push(log);
      } else {
        log.completed = completed ? 1 : 0;
      }

      saveDb();

      res.json({ routineId: id, date, completed });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to record routine logging threshold. " + err.message });
    }
  });

  // Delete Routine
  app.delete("/api/routines/:id", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      // Unlink habits linked to this routine
      dbState.habits.forEach(h => {
        if (h.routine_id === req.params.id && h.user_id === req.user!.id) {
          h.routine_id = null;
        }
      });

      dbState.routines = dbState.routines.filter(r => !(r.id === req.params.id && r.user_id === req.user!.id));
      dbState.routine_logs = dbState.routine_logs.filter(l => !(l.routine_id === req.params.id && l.user_id === req.user!.id));

      saveDb();

      res.json({ status: "success", message: "Routine disassembled safely. Linked habits preserved." });
    } catch (err: any) {
      res.status(500).json({ error: "Purging routines record registry failed." });
    }
  });

  // Vite middleware setup for dev vs prod asset delivery
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Full-stack server compiled and running live on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Express failed on startup crash:", err);
});
