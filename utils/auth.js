const bcrypt = require('bcrypt');
const { Users } = require('./db');

// validate york email
function isValidYorkUEmail(email) {
  return email.toLowerCase().endsWith('@my.yorku.ca');
}

// create a new user (students only - admin accounts to be created by developers)
async function createUser(email, password) {
  if (!isValidYorkUEmail(email)) {
    throw new Error('Email must be a valid YorkU email (@my.yorku.ca)');
  }

  // see if user alrd exists
  const existingUser = Users.getByEmail(email);
  if (existingUser.success) {
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

  Users.add(user.id, user.email, user.password, user.role, user.createdAt);

  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}

// authenticate the user
async function authenticateUser(email, password) {
  const db_result = await Users.getByEmail(email);
  if (!db_result.success) {
    throw new Error('Invalid email or password');
  }

  const user = db_result.user;
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
  return Users.findById(userId);
}

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  isValidYorkUEmail
};