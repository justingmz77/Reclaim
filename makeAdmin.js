const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');
const email = process.argv[2];
if (!email) {
  console.error('Usage: node makeAdmin.js you@my.yorku.ca');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
if (!u) {
  console.error('User not found:', email);
  process.exit(1);
}
u.role = 'admin';
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
console.log('User promoted to admin:', email);
