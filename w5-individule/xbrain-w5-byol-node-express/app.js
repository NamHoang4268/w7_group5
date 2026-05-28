// app.js — pretend this is your group's existing Express service.
// It runs locally with `node server.js` (see server.js).
// Lambda doesn't enter the picture here — keep it framework-pure.

const express = require('express');

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, runtime: 'express', message: 'hello from your existing app' });
});

app.get('/api/hello/:name', (req, res) => {
  res.json({
    greeting: `Hello, ${req.params.name}!`,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/echo', (req, res) => {
  res.status(201).json({ echo: req.body });
});

app.use((_req, res) => res.status(404).json({ error: 'not found' }));

module.exports = app;
