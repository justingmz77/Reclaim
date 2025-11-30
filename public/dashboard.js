// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = '/login.html';
            return null;
        }
        const user = await response.json();
        return user;
    } catch (error) {
        window.location.href = '/login.html';
        return null;
    }
}

// Logout handler
document.getElementById('logoutLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        // Clear all user data before logging out
        if (window.userDataManager) {
            window.userDataManager.clearAllReclaimData();
        }
        
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login.html';
        } else {
            // Still redirect and clear data even if logout fails
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Clear data and redirect even if logout fails
        if (window.userDataManager) {
            window.userDataManager.clearAllReclaimData();
        }
        window.location.href = '/login.html';
    }
});

// Load dashboard data
async function loadDashboard() {
    const user = await checkAuth();
    
    if (!user) return;
    
    // Display user email
    document.getElementById('userEmail').textContent = user.email;

    // Admin-only: reveal Manage Content card
    if (window.userDataManager?.isAdmin(user)) {
        const adminCard = document.getElementById('adminManageCard');
        if (adminCard) adminCard.style.display = 'flex';
    }
    
    // Load mood entries count (user-specific)
    const moodStorageKey = window.userDataManager.getUserStorageKey('reclaim_mood_entries', user.id);
    const moodEntries = JSON.parse(localStorage.getItem(moodStorageKey) || '[]');
    document.getElementById('moodEntriesCount').textContent = moodEntries.length;
    
    // Load habits count (user-specific)
    const habitsStorageKey = window.userDataManager.getUserStorageKey('reclaim_habits', user.id);
    const habits = JSON.parse(localStorage.getItem(habitsStorageKey) || '[]');
    document.getElementById('habitsCount').textContent = habits.length;
    
    // Load completed habits for today (user-specific)
    const today = new Date().toISOString().split('T')[0];
    const completedStorageKey = window.userDataManager.getUserStorageKey('reclaim_completed_habits', user.id);
    const completedHabits = JSON.parse(localStorage.getItem(completedStorageKey) || '{}');
    const todayCompleted = completedHabits[today] || [];
    document.getElementById('completedHabitsCount').textContent = todayCompleted.length;
}

// Initialize dashboard
window.addEventListener('DOMContentLoaded', loadDashboard);
