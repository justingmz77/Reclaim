const express = require('express');
const path = require('path');
const session = require('express-session');
const auth = require('./utils/auth');
const fs = require('fs');
const database = require('./utils/db');
const Users = database.Users;
const GameScores = database.GameScores;
const MoodEntries = database.MoodEntries;
const JournalEntries = database.JournalEntries;
const Habits = database.Habits;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: 'reclaim-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Routes
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Password validation: 8+ chars, 1 upper, 1 number, 1 special
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character (!@#$%^&*)' });
    }

    // Create user
    const user = await auth.createUser(email, password);

    // Set session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    res.json({ 
      success: true, 
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate user
    const user = await auth.authenticateUser(email, password);

    // Set session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/user', (req, res) => {
  if (req.session.userId) {
    const result = auth.getUserById(req.session.userId);
    if (result.success && result.user) {
      res.json({
        id: result.user.id,
        email: result.user.email,
        role: result.user.role
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Protected route for dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/users', (req, res) => {
  const users = Users.all();
  res.json(users);
});

// Game Scores API endpoints

// Save a new score
app.post('/api/game-scores', requireAuth, (req, res) => {
  try {
    const { gameId, score, metadata } = req.body;

    // Validation
    if (!gameId || score === undefined || score === null) {
      return res.status(400).json({ error: 'gameId and score are required' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'score must be a non-negative number' });
    }

    // Generate ID and timestamp
    const id = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const completedAt = new Date().toISOString();
    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    // Add score to database
    const result = GameScores.add(id, req.session.userId, gameId, score, metadataStr, completedAt);

    if (result.success) {
      res.json({
        success: true,
        message: 'Score saved successfully',
        score: {
          id,
          userId: req.session.userId,
          gameId,
          score,
          metadata: metadataStr,
          completedAt
        }
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error saving game score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// Get current user's scores for a game
app.get('/api/game-scores/:gameId/user', requireAuth, (req, res) => {
  try {
    const { gameId } = req.params;

    const result = GameScores.getUserScores(req.session.userId, gameId);

    if (result.success) {
      // Parse metadata JSON strings back to objects
      const scores = result.scores.map(score => ({
        ...score,
        metadata: score.metadata ? JSON.parse(score.metadata) : null
      }));
      res.json({ success: true, scores });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting user scores:', error);
    res.status(500).json({ error: 'Failed to get scores' });
  }
});

// Get top 10 scores for a game (leaderboard)
app.get('/api/game-scores/:gameId/leaderboard', (req, res) => {
  try {
    const { gameId } = req.params;

    const result = GameScores.getTopScores(gameId, 10);

    if (result.success) {
      // Anonymize user emails and parse metadata
      const scores = result.scores.map(score => ({
        id: score.id,
        gameId: score.gameId,
        score: score.score,
        metadata: score.metadata ? JSON.parse(score.metadata) : null,
        completedAt: score.completedAt,
        userEmail: score.email ? score.email.charAt(0) + '***' : 'Anonymous'
      }));
      res.json({ success: true, scores });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get user's best score for a game
app.get('/api/game-scores/:gameId/personal-best', requireAuth, (req, res) => {
  try {
    const { gameId } = req.params;

    const result = GameScores.getUserBestScore(req.session.userId, gameId);

    if (result.success) {
      // Parse metadata JSON string back to object
      const score = {
        ...result.score,
        metadata: result.score.metadata ? JSON.parse(result.score.metadata) : null
      };
      res.json({ success: true, score });
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting personal best:', error);
    res.status(500).json({ error: 'Failed to get personal best' });
  }
});

// Mood Entries API endpoints

// Save or update a mood entry
app.post('/api/mood-entries', requireAuth, (req, res) => {
  try {
    const { date, mood, emoji, note } = req.body;

    // Validation
    if (!date || !mood || !emoji) {
      return res.status(400).json({ error: 'date, mood, and emoji are required' });
    }

    const validMoods = ['great', 'good', 'okay', 'bad', 'terrible'];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ error: 'Invalid mood value' });
    }

    const timestamp = new Date().toISOString();
    const userId = req.session.userId;

    // Check if entry already exists for this date
    const existingEntry = MoodEntries.getByUserAndDate(userId, date);

    if (existingEntry.success) {
      // Update existing entry
      const result = MoodEntries.update(userId, date, mood, emoji, note || '', timestamp);
      if (result.success) {
        res.json({
          success: true,
          message: 'Mood entry updated successfully',
          entry: { date, mood, emoji, note: note || '', timestamp }
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } else {
      // Create new entry
      const id = `mood_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = MoodEntries.add(id, userId, date, mood, emoji, note || '', timestamp);

      if (result.success) {
        res.json({
          success: true,
          message: 'Mood entry saved successfully',
          entry: { id, date, mood, emoji, note: note || '', timestamp }
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    }
  } catch (error) {
    console.error('Error saving mood entry:', error);
    res.status(500).json({ error: 'Failed to save mood entry' });
  }
});

// Get current user's mood entries
app.get('/api/mood-entries', requireAuth, (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 30;
    const result = MoodEntries.getUserEntries(req.session.userId, limit);

    if (result.success) {
      res.json({ success: true, entries: result.entries });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting mood entries:', error);
    res.status(500).json({ error: 'Failed to get mood entries' });
  }
});

// Get a specific mood entry by date
app.get('/api/mood-entries/:date', requireAuth, (req, res) => {
  try {
    const { date } = req.params;
    const result = MoodEntries.getByUserAndDate(req.session.userId, date);

    if (result.success) {
      res.json({ success: true, entry: result.entry });
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error) {
    console.error('Error getting mood entry:', error);
    res.status(500).json({ error: 'Failed to get mood entry' });
  }
});

// Delete a mood entry
app.delete('/api/mood-entries/:date', requireAuth, (req, res) => {
  try {
    const { date } = req.params;
    const result = MoodEntries.delete(req.session.userId, date);

    if (result.success && result.changes > 0) {
      res.json({ success: true, message: 'Mood entry deleted successfully' });
    } else if (result.changes === 0) {
      res.status(404).json({ error: 'Entry not found' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting mood entry:', error);
    res.status(500).json({ error: 'Failed to delete mood entry' });
  }
});

// Journal Entries API endpoints

// Save a new journal entry
app.post('/api/journal-entries', requireAuth, (req, res) => {
  try {
    const { title, content } = req.body;

    // Validation
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'content is required' });
    }

    const id = `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    const userId = req.session.userId;
    const entryTitle = title && title.trim() !== '' ? title.trim() : 'Untitled';

    const result = JournalEntries.add(id, userId, entryTitle, content.trim(), createdAt);

    if (result.success) {
      res.json({
        success: true,
        message: 'Journal entry saved successfully',
        entry: { id, title: entryTitle, content: content.trim(), createdAt }
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error saving journal entry:', error);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// Get current user's journal entries
app.get('/api/journal-entries', requireAuth, (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const result = JournalEntries.getUserEntries(req.session.userId, limit);

    if (result.success) {
      res.json({ success: true, entries: result.entries });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting journal entries:', error);
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

// Get a specific journal entry by ID
app.get('/api/journal-entries/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = JournalEntries.getById(id);

    if (result.success) {
      // Ensure user can only access their own entries
      if (result.entry.userId !== req.session.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json({ success: true, entry: result.entry });
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error) {
    console.error('Error getting journal entry:', error);
    res.status(500).json({ error: 'Failed to get journal entry' });
  }
});

// Update a journal entry
app.put('/api/journal-entries/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    // Validation
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'content is required' });
    }

    const entryTitle = title && title.trim() !== '' ? title.trim() : 'Untitled';
    const result = JournalEntries.update(id, req.session.userId, entryTitle, content.trim());

    if (result.success && result.changes > 0) {
      res.json({
        success: true,
        message: 'Journal entry updated successfully',
        entry: { id, title: entryTitle, content: content.trim() }
      });
    } else if (result.changes === 0) {
      res.status(404).json({ error: 'Entry not found or access denied' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({ error: 'Failed to update journal entry' });
  }
});

// Delete a journal entry
app.delete('/api/journal-entries/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = JournalEntries.delete(id, req.session.userId);

    if (result.success && result.changes > 0) {
      res.json({ success: true, message: 'Journal entry deleted successfully' });
    } else if (result.changes === 0) {
      res.status(404).json({ error: 'Entry not found or access denied' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

// Habits API endpoints

// Create a new habit
app.post('/api/habits', requireAuth, (req, res) => {
  try {
    const { name, description, reminderFrequency } = req.body;

    if (!name || !reminderFrequency) {
      return res.status(400).json({ error: 'name and reminderFrequency are required' });
    }

    const id = `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = req.session.userId;
    const createdAt = new Date().toISOString();

    const result = Habits.add(
      id,
      userId,
      name,
      description || '',
      reminderFrequency,
      'in_progress',
      createdAt,
      0,
      null
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Habit created successfully',
        habit: {
          id,
          name,
          description: description || '',
          reminderFrequency,
          status: 'in_progress',
          createdAt,
          streak: 0,
          lastCompletedDate: null,
          completionHistory: []
        }
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// Get user's habits
app.get('/api/habits', requireAuth, (req, res) => {
  try {
    const includeCompleted = req.query.includeCompleted === 'true';
    const result = Habits.getUserHabits(req.session.userId, includeCompleted);

    if (result.success) {
      // Get completion history for each habit
      const habitsWithCompletions = result.habits.map(habit => {
        const completionsResult = Habits.getCompletions(habit.id);
        return {
          ...habit,
          completionHistory: completionsResult.success
            ? completionsResult.completions.map(c => c.completedDate)
            : []
        };
      });

      res.json({ success: true, habits: habitsWithCompletions });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting habits:', error);
    res.status(500).json({ error: 'Failed to get habits' });
  }
});

// Get a specific habit by ID
app.get('/api/habits/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = Habits.getById(id);

    if (result.success) {
      // Ensure user owns this habit
      if (result.habit.userId !== req.session.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get completion history
      const completionsResult = Habits.getCompletions(id);
      const habit = {
        ...result.habit,
        completionHistory: completionsResult.success
          ? completionsResult.completions.map(c => c.completedDate)
          : []
      };

      res.json({ success: true, habit });
    } else {
      res.status(404).json({ error: 'Habit not found' });
    }
  } catch (error) {
    console.error('Error getting habit:', error);
    res.status(500).json({ error: 'Failed to get habit' });
  }
});

// Update a habit
app.put('/api/habits/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, reminderFrequency, status, streak, lastCompletedDate } = req.body;

    if (!name || !reminderFrequency) {
      return res.status(400).json({ error: 'name and reminderFrequency are required' });
    }

    const result = Habits.update(
      id,
      req.session.userId,
      name,
      description || '',
      reminderFrequency,
      status || 'in_progress',
      streak || 0,
      lastCompletedDate || null
    );

    if (result.success && result.changes > 0) {
      res.json({
        success: true,
        message: 'Habit updated successfully'
      });
    } else if (result.changes === 0) {
      res.status(404).json({ error: 'Habit not found or access denied' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error updating habit:', error);
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

// Delete a habit
app.delete('/api/habits/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = Habits.delete(id, req.session.userId);

    if (result.success && result.changes > 0) {
      res.json({ success: true, message: 'Habit deleted successfully' });
    } else if (result.changes === 0) {
      res.status(404).json({ error: 'Habit not found or access denied' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting habit:', error);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

// Mark habit as completed for a specific date
app.post('/api/habits/:id/complete', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    // Verify habit ownership
    const habitResult = Habits.getById(id);
    if (!habitResult.success || habitResult.habit.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already completed on this date
    const existingCompletion = Habits.getCompletionByDate(id, date);
    if (existingCompletion.success) {
      return res.status(400).json({ error: 'Habit already completed on this date' });
    }

    // Add completion
    const completionId = `completion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const addResult = Habits.addCompletion(completionId, id, req.session.userId, date);

    if (!addResult.success) {
      return res.status(500).json({ error: addResult.error });
    }

    // Calculate new streak
    const completionsResult = Habits.getCompletions(id);
    const completionDates = completionsResult.success
      ? completionsResult.completions.map(c => c.completedDate).sort().reverse()
      : [];

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < completionDates.length; i++) {
      const completionDate = new Date(completionDates[i]);
      completionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (completionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    // Update habit streak
    const updateResult = Habits.update(
      id,
      req.session.userId,
      habitResult.habit.name,
      habitResult.habit.description,
      habitResult.habit.reminderFrequency,
      habitResult.habit.status,
      streak,
      date
    );

    if (updateResult.success) {
      res.json({
        success: true,
        message: 'Habit marked as complete',
        streak
      });
    } else {
      res.status(500).json({ error: updateResult.error });
    }
  } catch (error) {
    console.error('Error completing habit:', error);
    res.status(500).json({ error: 'Failed to complete habit' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Reclaim server running on http://localhost:${PORT}`);
});
