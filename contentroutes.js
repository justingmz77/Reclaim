// Express router for admin content management.
// Plug into your server: app.use(require('./contentRoutes'));

const fs = require('fs');
const path = require('path');
const express = require('express');
const { getUserById } = require('./auth');

const router = express.Router();
const CONTENT_FILE = path.join(__dirname, 'content.json');

function loadContent() {
  try {
    return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  } catch {
    return { prompts: [], games: [], exercises: [] };
  }
}

function saveContent(data) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2));
}

// Simple session guard; assumes req.session.userId is set by your existing auth flow
function requireAdmin(req, res, next) {
  const uid = req.session?.userId;
  const user = uid ? getUserById(uid) : null;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Public: fetch all content (read-only for clients)
router.get('/api/content', (req, res) => {
  res.json(loadContent());
});

// Admin CRUD
router.post('/api/content/:type', requireAdmin, (req, res) => {
  const type = req.params.type; // prompts | games | exercises
  const item = req.body;
  const data = loadContent();
  if (!data[type]) return res.status(400).json({ error: 'Invalid type' });
  if (!item || !item.id) return res.status(400).json({ error: 'Missing item id' });
  data[type].unshift(item);
  saveContent(data);
  res.json({ ok: true });
});

router.put('/api/content/:type/:id', requireAdmin, (req, res) => {
  const { type, id } = req.params;
  const patch = req.body || {};
  const data = loadContent();
  if (!data[type]) return res.status(400).json({ error: 'Invalid type' });

  const idx = data[type].findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  data[type][idx] = { ...data[type][idx], ...patch, id };
  saveContent(data);
  res.json({ ok: true });
});

router.delete('/api/content/:type/:id', requireAdmin, (req, res) => {
  const { type, id } = req.params;
  const data = loadContent();
  if (!data[type]) return res.status(400).json({ error: 'Invalid type' });

  const before = data[type].length;
  data[type] = data[type].filter(i => i.id !== id);
  if (data[type].length === before) return res.status(404).json({ error: 'Not found' });

  saveContent(data);
  res.json({ ok: true });
});

module.exports = router;
