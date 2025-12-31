const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'back/database/server.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT id, username, microsoft_access_token FROM users", (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('Users in DB:');
    rows.forEach(row => {
      console.log(`User: ${row.username}, Has Token: ${!!row.microsoft_access_token}`);
      if (row.microsoft_access_token) {
          console.log(`Token length: ${row.microsoft_access_token.length}`);
          console.log(`Token start: ${row.microsoft_access_token.substring(0, 20)}...`);
      }
    });
  });
});

db.close();
