const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_FILE = path.join(__dirname, 'users.json');

// load users from file
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// save users to file
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// validate york email
function isValidYorkUEmail(email) {
  return email.toLowerCase().endsWith('@my.yorku.ca');
}

// create a new user (students only - admin accounts to be created by developers)
async function createUser(email, password) {
  if (!isValidYorkUEmail(email)) {
    throw new Error('Email must be a valid YorkU email (@my.yorku.ca)');
  }

  const users = loadUsers();
  
  // see if user alrd exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('User with this email already exists');
  }

  // hash password using bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);

  // creating a user object
  const user = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'student', // Admin accounts are created separately by developers
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}

// authenticate the user
async function authenticateUser(email, password) {
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}

// Get user by their id
function getUserById(userId) {
  const users = loadUsers();
  return users.find(u => u.id === userId);
}

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  isValidYorkUEmail
};

