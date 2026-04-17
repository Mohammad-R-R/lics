const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));
app.get('/favicon.ico', (_req, res) => res.status(204).end());

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ apps: [] }, null, 2), 'utf8');
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  if (!Array.isArray(parsed.apps)) parsed.apps = [];
  return parsed;
}

async function writeDb(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/apps', async (_req, res) => {
  try {
    const db = await readDb();
    res.json(db.apps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications', detail: String(err.message || err) });
  }
});

app.post('/api/apps', async (req, res) => {
  try {
    const appRecord = req.body;
    if (!appRecord || !appRecord.id) {
      return res.status(400).json({ error: 'Missing app payload or id' });
    }

    const db = await readDb();
    db.apps = db.apps.filter(a => a.id !== appRecord.id);
    db.apps.unshift(appRecord);
    await writeDb(db);
    return res.status(201).json(appRecord);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save application', detail: String(err.message || err) });
  }
});

app.patch('/api/apps/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'Missing status' });
    }

    const db = await readDb();
    const i = db.apps.findIndex(a => a.id === id);
    if (i < 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    db.apps[i].status = status;
    await writeDb(db);
    return res.json(db.apps[i]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status', detail: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
