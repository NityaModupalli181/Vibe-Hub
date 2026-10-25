// Deletes the database so the next start re-creates and re-seeds it.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'data');
['vibehub.db', 'vibehub.db-wal', 'vibehub.db-shm'].forEach((f) => {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('Removed', p);
  }
});
console.log('Database reset. Run "npm start" to create a fresh one.');
