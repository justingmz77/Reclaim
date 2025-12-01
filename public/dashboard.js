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

/**
 * Habit reminder helpers
 */

// Fire a reminder once per day near the configured time
function triggerHabitReminderIfNeeded(user, reminderKey, existingConfig) {
    if (!window.userDataManager) return;

    let config = existingConfig;
    if (!config) {
        try {
            config = JSON.parse(localStorage.getItem(reminderKey) || 'null');
        } catch {
            config = null;
        }
    }

    if (!config || !config.time) return;

    const now = new Date();
    const [hours, minutes] = config.time.split(':').map(Number);

    const reminderDate = new Date();
    reminderDate.setHours(hours || 0, minutes || 0, 0, 0);

    const diffMinutes = Math.abs(now.getTime() - reminderDate.getTime()) / 60000;
    const todayStr = now.toISOString().split('T')[0];

    // Only remind if within 30 minutes of the time, and not already notified today
    if (diffMinutes > 30 || config.lastNotifiedDate === todayStr) return;

    const habitsKey = window.userDataManager.getUserStorageKey('reclaim_habits', user.id);
    const habits = JSON.parse(localStorage.getItem(habitsKey) || '[]');
    const activeCount = Array.isArray(habits) ? habits.length : 0;

    const message = activeCount > 0
        ? `You have ${activeCount} active habit${activeCount === 1 ? '' : 's'} today. Take a minute to check in.`
        : 'You have no active habits yet. You can add one on the Habits page.';

    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification('Habit reminder', { body: message });
        } catch (err) {
            console.error('Notification error:', err);
            alert(message);
        }
    } else {
        alert(message);
    }

    const updatedConfig = { ...config, lastNotifiedDate: todayStr };
    localStorage.setItem(reminderKey, JSON.stringify(updatedConfig));
}

// Wire up the Habit Reminders card UI
function setupHabitReminderCard(user) {
    if (!window.userDataManager) return;

    const timeInput = document.getElementById('habitReminderTime');
    const saveBtn = document.getElementById('saveHabitReminderBtn');
    const statusEl = document.getElementById('habitReminderStatus');

    // If card isn't present, nothing to do
    if (!timeInput || !saveBtn || !statusEl) return;

    const reminderKey = window.userDataManager.getUserStorageKey(
        'reclaim_habit_reminder',
        user.id
    );

    let reminderConfig = null;

    // Load saved config
    try {
        reminderConfig = JSON.parse(localStorage.getItem(reminderKey) || 'null');
    } catch {
        reminderConfig = null;
    }

    // If there is a saved time, show it in the input
    if (reminderConfig && reminderConfig.time) {
        // This only runs once during setup, so the user can still change it
        timeInput.value = reminderConfig.time;
        statusEl.textContent = `Reminder set for ${reminderConfig.time} each day.`;
    }

    // Save handler
    saveBtn.addEventListener('click', () => {
        const value = timeInput.value;

        if (!value) {
            statusEl.textContent = 'Pick a time to save a reminder.';
            return;
        }

        const newConfig = {
            time: value,
            lastNotifiedDate: reminderConfig?.lastNotifiedDate || null
        };

        localStorage.setItem(reminderKey, JSON.stringify(newConfig));
        statusEl.textContent = `Reminder set for ${value} each day.`;

        // Ask for notification permission once when user actively saves a reminder
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(err => {
                console.error('Notification permission error:', err);
            });
        }

        reminderConfig = newConfig;
    });

    // After wiring up, optionally trigger a reminder
    triggerHabitReminderIfNeeded(user, reminderKey, reminderConfig);
}

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
    
    // Load mood entries count from API
    try {
        const moodResponse = await fetch('/api/mood-entries?limit=30');
        if (moodResponse.ok) {
            const moodData = await moodResponse.json();
            document.getElementById('moodEntriesCount').textContent = (moodData.entries || []).length;
        } else {
            document.getElementById('moodEntriesCount').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading mood entries count:', error);
        document.getElementById('moodEntriesCount').textContent = '0';
    }
    
    // Load habits count from API
    try {
        const habitsResponse = await fetch('/api/habits');
        if (habitsResponse.ok) {
            const habitsData = await habitsResponse.json();
            const habits = habitsData.habits || [];
            document.getElementById('habitsCount').textContent = habits.length;

            // Count habits completed today
            const today = new Date().toISOString().split('T')[0];
            const completedToday = habits.filter(h =>
                h.completionHistory && h.completionHistory.includes(today)
            ).length;
            document.getElementById('completedHabitsCount').textContent = completedToday;
        } else {
            document.getElementById('habitsCount').textContent = '0';
            document.getElementById('completedHabitsCount').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading habits count:', error);
        document.getElementById('habitsCount').textContent = '0';
        document.getElementById('completedHabitsCount').textContent = '0';
    }

    // Habit Reminders card setup
    setupHabitReminderCard(user);
}

// Initialize dashboard
window.addEventListener('DOMContentLoaded', loadDashboard);