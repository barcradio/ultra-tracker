import Database from 'better-sqlite3';
import global from '../shared/global';

let { dbFullPath } = global.shared.dbFullPath;

const db = new Database(dbFullPath);

// db.run(`
//     CREATE TABLE IF NOT EXISTS users (
//         id INTEGER PRIMARY KEY,
//         name TEXT,
//         email TEXT
//     );
// `);