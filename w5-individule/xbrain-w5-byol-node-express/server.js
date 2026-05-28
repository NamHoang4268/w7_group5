// server.js — local dev. `node server.js` → http://localhost:3000.
// Lambda does NOT import this file. It exists so the app remains runnable
// the "normal" way after we add Lambda support.

const app = require('./app');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on http://localhost:${port}`));
