import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`UPDATE members SET name = 'Cháu Nội' WHERE name LIKE '%CHAU NOI%' OR name LIKE '%Chau Noi%'`);
  db.run(`UPDATE members SET name = 'Con Việt' WHERE name LIKE '%Con Viêt%'`);
  db.run(`UPDATE members SET name = 'Chắt Trai' WHERE name LIKE '%CHÁU T TRAI%' OR name LIKE '%CHẮT TRAI%'`);
});

db.close(() => console.log('Fixed DB text'));
