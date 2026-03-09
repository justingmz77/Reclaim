// User Data Manager - Ensures user data isolation and privacy
// All user data is stored with user ID prefix to prevent cross-user data access

// Get current user from session
async function getCurrentUser() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Get user-specific storage key
function getUserStorageKey(baseKey, userId) {
    return userId ? `${baseKey}_${userId}` : baseKey;
}

// Clear all user data from localStorage
function clearUserData(userId) {
    const keysToRemove = [
        'reclaim_mood_entries',
        'journalEntries',
        'reclaim_habits',
        'reclaim_completed_habits',
        'reclaim_habit_history',
        'reclaim_audit_log'
    ];

    // Remove keys for specific user if userId provided
    if (userId) {
        keysToRemove.forEach(baseKey => {
            localStorage.removeItem(getUserStorageKey(baseKey, userId));
        });
    }

    // Also remove any non-user-specific keys (cleanup)
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
}

// Clear all reclaim-related data (called on logout)
function clearAllReclaimData() {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
        if (key.startsWith('reclaim_') || key === 'journalEntries') {
            localStorage.removeItem(key);
        }
    });
}

// Check if user is authenticated before accessing data
async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        // Not logged in - clear any existing data and redirect
        clearAllReclaimData();
        window.location.href = '/login.html';
        return null;
    }
    return user;
}

// Simple helper to check admin role on client (UI only; server enforces routes)
function isAdmin(user) {
    return !!user && user.role === 'admin';
}

// Export functions
window.userDataManager = {
    getCurrentUser,
    getUserStorageKey,
    clearUserData,
    clearAllReclaimData,
    requireAuth,
    isAdmin
};
