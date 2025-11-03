# How to Start the Reclaim Server

## ⚠️ IMPORTANT: You MUST start the server before using the app!

The "Network error" you see happens because the server isn't running. The frontend (HTML/JavaScript) needs to communicate with the backend server to login/register.

---

## Step-by-Step Instructions

### Option 1: PowerShell (Recommended)

**First time setup:**
1. Open PowerShell (Right-click Start → Windows PowerShell or search "PowerShell")
2. Navigate to your project folder:
   ```powershell
   cd C:\Users\ruqay\Reclaim
   ```
3. Install dependencies (only needed once, or when package.json changes):
   ```powershell
   npm install
   ```
   - If you get an execution policy error, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` (then try npm install again)

**Starting the server:**
4. Start the server:
   ```powershell
   npm start
   ```
   OR directly:
   ```powershell
   node server.js
   ```
5. You should see: `Reclaim server running on http://localhost:3000`
6. **Keep this window open** - closing it stops the server

---

### Option 2: Command Prompt (CMD)

1. Open Command Prompt (Press Windows + R, type `cmd`, press Enter)
2. Navigate to your project folder:
   ```cmd
   cd C:\Users\ruqay\Reclaim
   ```
3. Install dependencies (first time only):
   ```cmd
   npm install
   ```
4. Start the server:
   ```cmd
   npm start
   ```
5. Keep the window open!

---

### Option 3: Git Bash

1. Open Git Bash
2. Navigate to your project folder:
   ```bash
   cd /c/Users/ruqay/Reclaim
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

---

## ✅ Testing It Works

1. **Start the server** (follow steps above)
2. Open your browser
3. Go to: `http://localhost:3000`
4. You should now be able to:
   - ✅ Click "Sign Up" to create an account (no network error!)
   - ✅ Click "Login" to sign in
   - ✅ See the navigation update based on login status

---

## 🔧 Troubleshooting

### If `npm install` fails:
- **Check Node.js is installed:**
  ```powershell
  node --version
  ```
  If it says "not recognized", download Node.js from [nodejs.org](https://nodejs.org/)

- **Try with legacy peer deps:**
  ```powershell
  npm install --legacy-peer-deps
  ```

### If port 3000 is already in use:
You can use a different port:
- **PowerShell:** 
  ```powershell
  $env:PORT=3001; npm start
  ```
- **CMD:**
  ```cmd
  set PORT=3001 && npm start
  ```
- **Git Bash:**
  ```bash
  PORT=3001 npm start
  ```
Then access at `http://localhost:3001`

### To stop the server:
- Press `Ctrl + C` in the terminal window

### If you see "Cannot find module" errors:
- Run `npm install` again to install missing dependencies

---

## 📝 Navigation Features

After the server is running, the navigation will:
- **When logged out:** Show "Login" and "Sign Up" buttons
- **When logged in:** Show "Dashboard" and "Logout" buttons
- **All pages:** Have consistent navigation across the site

The navbar automatically updates based on your login status!

---

## 🎯 Quick Start Checklist

- [ ] Open terminal (PowerShell/CMD/Git Bash)
- [ ] Navigate to project: `cd C:\Users\ruqay\Reclaim`
- [ ] Install dependencies: `npm install` (first time only)
- [ ] Start server: `npm start`
- [ ] See message: "Reclaim server running on http://localhost:3000"
- [ ] Open browser: `http://localhost:3000`
- [ ] Try signing up with a `@my.yorku.ca` email!

