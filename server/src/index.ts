import { createApp } from './app.js';
import { openDatabase, resetAll } from './db.js';

const db = openDatabase();
resetAll(db);
const port = Number(process.env.PORT ?? 3001);
createApp(db).listen(port, '0.0.0.0', () => console.log(`NovaCommerce QA Lab API escuchando en http://0.0.0.0:${port}`));
