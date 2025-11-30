const express = require('express');
const path = require('path');
const session = require('express-session');
const auth = require('./utils/auth');
const fs = require('fs');
const database = require('./utils/database');
const Users = database.Users;
const GameScores = database.GameScores;

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

// Start server
app.listen(PORT, () => {
  console.log(`Reclaim server running on http://localhost:${PORT}`);
});
