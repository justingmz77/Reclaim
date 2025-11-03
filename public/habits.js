// Habit Tracker with localStorage
// Implements Use Case 5: Build and Track Habits
// Implements Use Case 8: Play Focus Games (Streaks & Rewards)

// Initialize localStorage keys
const STORAGE_KEYS = {
    HABITS: 'reclaim_habits',
    COMPLETED_HABITS: 'reclaim_completed_habits',
    HABIT_HISTORY: 'reclaim_habit_history',
    AUDIT_LOG: 'reclaim_audit_log'
};

// Audit logging for NFR-002 compliance
async function logAction(action, details) {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) return; // Don't log if not authenticated
    
    const storageKey = window.userDataManager.getUserStorageKey(STORAGE_KEYS.AUDIT_LOG, user.id);
    const logs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        userId: user.id
    };

    logs.push(logEntry);

    // Keep only last 180 days of logs (NFR-002 requirement)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    const filteredLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);

    localStorage.setItem(storageKey, JSON.stringify(filteredLogs));
}

// Habit class
class Habit {
    constructor(name, description, reminderFrequency) {
        this.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.description = description;
        this.reminderFrequency = reminderFrequency;
        this.status = 'in_progress';
        this.createdAt = new Date().toISOString();
        this.streak = 0;
        this.lastCompletedDate = null;
        this.completionHistory = [];
    }
}

// Get habits from localStorage (user-specific)
async function getHabits() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        return []; // Return empty if not logged in
    }
    const storageKey = window.userDataManager.getUserStorageKey(STORAGE_KEYS.HABITS, user.id);
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
}

// Save habits to localStorage (user-specific)
async function saveHabits(habits) {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        console.error('Cannot save habits: User not authenticated');
        return;
    }
    const storageKey = window.userDataManager.getUserStorageKey(STORAGE_KEYS.HABITS, user.id);
    localStorage.setItem(storageKey, JSON.stringify(habits));
    logAction('HABITS_UPDATED', { count: habits.length });
}

// Get completed habits from localStorage (user-specific)
async function getCompletedHabits() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        return {}; // Return empty if not logged in
    }
    const storageKey = window.userDataManager.getUserStorageKey(STORAGE_KEYS.COMPLETED_HABITS, user.id);
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
}

// Save completed habits to localStorage (user-specific)
async function saveCompletedHabits(habits) {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        console.error('Cannot save completed habits: User not authenticated');
        return;
    }
    const storageKey = window.userDataManager.getUserStorageKey(STORAGE_KEYS.COMPLETED_HABITS, user.id);
    localStorage.setItem(storageKey, JSON.stringify(habits));
}

// Calculate streak for a habit
function calculateStreak(habit) {
    if (!habit.completionHistory || habit.completionHistory.length === 0) {
        return 0;
    }

    const sortedDates = habit.completionHistory
        .map(date => new Date(date))
        .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
        const completionDate = new Date(sortedDates[i]);
        completionDate.setHours(0, 0, 0, 0);

        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (completionDate.getTime() === expectedDate.getTime()) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// Mark habit as completed for today
async function markHabitComplete(habitId) {
    const habits = await getHabits();
    const habit = habits.find(h => h.id === habitId);

    if (!habit) return;

    const today = new Date().toISOString().split('T')[0];

    if (!habit.completionHistory) {
        habit.completionHistory = [];
    }

    // Check if already completed today
    if (!habit.completionHistory.includes(today)) {
        habit.completionHistory.push(today);
        habit.lastCompletedDate = today;
        habit.streak = calculateStreak(habit);

        await saveHabits(habits);
        await logAction('HABIT_COMPLETED', { habitId, habitName: habit.name, streak: habit.streak });

        // Check for streak rewards (Use Case 8)
        checkStreakRewards(habit);

        await renderHabits();
        await renderStreaks();
    }
}

// Check for streak rewards (Use Case 8: Focus Games/Rewards)
function checkStreakRewards(habit) {
    const milestones = [7, 14, 30, 60, 90, 180, 365];

    if (milestones.includes(habit.streak)) {
        showRewardNotification(habit);
    }
}

// Show reward notification
function showRewardNotification(habit) {
    const message = `🎉 Congratulations! You've maintained "${habit.name}" for ${habit.streak} days straight!`;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'reward-notification';
    notification.innerHTML = `
        <div class="reward-content">
            <h3>New Streak Milestone!</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()">Awesome!</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Mark habit as done (status change)
async function markHabitDone(habitId) {
    const habits = await getHabits();
    const habitIndex = habits.findIndex(h => h.id === habitId);

    if (habitIndex === -1) return;

    const habit = habits[habitIndex];
    habit.status = 'done';

    // Move to completed habits
    const completedHabits = await getCompletedHabits();
    completedHabits.push(habit);
    await saveCompletedHabits(completedHabits);

    // Remove from current habits
    habits.splice(habitIndex, 1);
    await saveHabits(habits);

    await logAction('HABIT_STATUS_CHANGED', { habitId, habitName: habit.name, newStatus: 'done' });

    await renderHabits();
}

// Delete habit
async function deleteHabit(habitId, isCompleted = false) {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    if (isCompleted) {
        const completedHabits = await getCompletedHabits();
        const habit = completedHabits.find(h => h.id === habitId);
        const filtered = completedHabits.filter(h => h.id !== habitId);
        await saveCompletedHabits(filtered);

        if (habit) {
            await logAction('HABIT_DELETED', { habitId, habitName: habit.name, wasCompleted: true });
        }
    } else {
        const habits = await getHabits();
        const habit = habits.find(h => h.id === habitId);
        const filtered = habits.filter(h => h.id !== habitId);
        await saveHabits(filtered);

        if (habit) {
            await logAction('HABIT_DELETED', { habitId, habitName: habit.name, wasCompleted: false });
        }
    }

    await renderHabits();
    await renderStreaks();
}

// Check if habit was completed today
function isCompletedToday(habit) {
    const today = new Date().toISOString().split('T')[0];
    return habit.completionHistory && habit.completionHistory.includes(today);
}

// Render habits
async function renderHabits() {
    // Check authentication
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        // User not logged in - show message
        const currentContainer = document.getElementById('currentHabits');
        const completedContainer = document.getElementById('completedHabits');
        const noHabitsMsg = document.getElementById('noHabitsMessage');
        if (currentContainer) currentContainer.innerHTML = '<div class="no-data-message">Please <a href="login.html">log in</a> to view your habits.</div>';
        if (completedContainer) completedContainer.innerHTML = '';
        if (noHabitsMsg) noHabitsMsg.style.display = 'none';
        return;
    }
    
    const habits = await getHabits();
    const completedHabits = await getCompletedHabits();

    const currentContainer = document.getElementById('currentHabits');
    const completedContainer = document.getElementById('completedHabits');
    const noHabitsMsg = document.getElementById('noHabitsMessage');
    const noCompletedMsg = document.getElementById('noCompletedMessage');

    // Render current habits
    if (habits.length === 0) {
        noHabitsMsg.style.display = 'block';
        currentContainer.style.display = 'none';
    } else {
        noHabitsMsg.style.display = 'none';
        currentContainer.style.display = 'grid';
        currentContainer.innerHTML = habits.map(habit => `
            <div class="habit-card" data-habit-id="${habit.id}">
                <div class="habit-header">
                    <h3>${habit.name}</h3>
                    <span class="habit-frequency">${habit.reminderFrequency}</span>
                </div>
                ${habit.description ? `<p class="habit-description">${habit.description}</p>` : ''}
                <div class="habit-stats">
                    <div class="stat">
                        <span class="stat-label">Streak:</span>
                        <span class="stat-value">${habit.streak || 0} days</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Status:</span>
                        <span class="status-badge status-${habit.status}">${habit.status.replace('_', ' ')}</span>
                    </div>
                </div>
                <div class="habit-progress">
                    <span>Completed today: ${isCompletedToday(habit) ? '✅' : '⬜'}</span>
                </div>
                <div class="habit-actions">
                    <button class="btn btn-small btn-success" onclick="markHabitComplete('${habit.id}')" ${isCompletedToday(habit) ? 'disabled' : ''}>
                        ${isCompletedToday(habit) ? 'Completed!' : 'Mark Complete'}
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="markHabitDone('${habit.id}')">
                        Mark as Done
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteHabit('${habit.id}', false)">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render completed habits
    if (completedHabits.length === 0) {
        noCompletedMsg.style.display = 'block';
        completedContainer.style.display = 'none';
    } else {
        noCompletedMsg.style.display = 'none';
        completedContainer.style.display = 'grid';
        completedContainer.innerHTML = completedHabits.map(habit => `
            <div class="habit-card habit-completed">
                <div class="habit-header">
                    <h3>${habit.name}</h3>
                    <span class="habit-frequency">${habit.reminderFrequency}</span>
                </div>
                ${habit.description ? `<p class="habit-description">${habit.description}</p>` : ''}
                <div class="habit-stats">
                    <div class="stat">
                        <span class="stat-label">Final Streak:</span>
                        <span class="stat-value">${habit.streak || 0} days</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Status:</span>
                        <span class="status-badge status-done">Done</span>
                    </div>
                </div>
                <div class="habit-actions">
                    <button class="btn btn-small btn-danger" onclick="deleteHabit('${habit.id}', true)">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Generate contribution graph (git-style tracker)
function generateContributionGraph(habit) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 84); // Show last 12 weeks (84 days)

    const weeks = [];
    let currentWeek = [];

    for (let i = 0; i < 84; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateString = date.toISOString().split('T')[0];

        const isCompleted = habit.completionHistory && habit.completionHistory.includes(dateString);
        const isToday = dateString === today.toISOString().split('T')[0];

        currentWeek.push({
            date: dateString,
            completed: isCompleted,
            isToday: isToday,
            dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
        });

        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }

    return weeks;
}

// Render streaks and rewards
async function renderStreaks() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        const streaksContainer = document.getElementById('streaksContainer');
        if (streaksContainer) {
            streaksContainer.innerHTML = '<div class="no-streaks-message"><p>Please <a href="login.html">log in</a> to view your streaks.</p></div>';
        }
        return;
    }
    
    const habits = await getHabits();
    const streaksContainer = document.getElementById('streaksContainer');

    // Filter habits that have any completions (not just streaks > 0)
    const activeHabits = habits.filter(h => h.completionHistory && h.completionHistory.length > 0);

    if (activeHabits.length === 0) {
        streaksContainer.innerHTML = `
            <div class="no-streaks-message">
                <p>🎯 Start completing habits to build streaks and earn rewards!</p>
                <p class="streak-tip">Complete a habit every day to maintain your streak and unlock milestone badges.</p>
            </div>
        `;
        return;
    }

    streaksContainer.innerHTML = activeHabits
        .sort((a, b) => (b.streak || 0) - (a.streak || 0))
        .map(habit => {
            const currentStreak = habit.streak || 0;
            const milestones = [7, 14, 30, 60, 90, 180, 365];

            // Get earned badges
            const earnedBadges = milestones.filter(m => currentStreak >= m);
            const badgesHTML = earnedBadges.length > 0
                ? `<div class="earned-badges">
                    ${earnedBadges.map(m => `<span class="badge">🏆 ${m} days</span>`).join('')}
                   </div>`
                : '';

            // Streak status
            const isActiveToday = isCompletedToday(habit);
            const statusBadge = isActiveToday
                ? '<span class="streak-status active">✅ Active Today</span>'
                : '<span class="streak-status inactive">⚠️ Complete Today!</span>';

            // Generate contribution graph
            const weeks = generateContributionGraph(habit);
            const contributionHTML = `
                <div class="contribution-graph">
                    <div class="graph-label">Last 12 weeks</div>
                    <div class="graph-grid">
                        ${weeks.map(week => `
                            <div class="graph-week">
                                ${week.map(day => `
                                    <div class="graph-day ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''}"
                                         title="${day.date}${day.completed ? ' - Completed' : ' - Not completed'}"
                                         data-date="${day.date}">
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                    <div class="graph-legend">
                        <span>Less</span>
                        <div class="legend-box level-0"></div>
                        <div class="legend-box level-1"></div>
                        <div class="legend-box level-2"></div>
                        <div class="legend-box level-3"></div>
                        <div class="legend-box level-4"></div>
                        <span>More</span>
                    </div>
                </div>
            `;

            return `
                <div class="streak-card">
                    <div class="streak-card-header">
                        <h4>${habit.name}</h4>
                        ${statusBadge}
                    </div>
                    <div class="streak-stats-row">
                        <div class="stat-item">
                            <span class="stat-number">${currentStreak}</span>
                            <span class="stat-label">Current Streak</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${habit.completionHistory.length}</span>
                            <span class="stat-label">Total Completions</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${Math.max(...habit.completionHistory.map(d => {
                                const h = getHabits().find(h2 => h2.id === habit.id);
                                return h ? calculateStreak(h) : 0;
                            }), currentStreak)}</span>
                            <span class="stat-label">Longest Streak</span>
                        </div>
                    </div>
                    ${contributionHTML}
                    ${badgesHTML}
                </div>
            `;
        }).join('');
}

// Form submission handler
document.getElementById('addHabitForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Check authentication
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    const name = document.getElementById('habitName').value.trim();
    const description = document.getElementById('habitDescription').value.trim();
    const reminderFrequency = document.getElementById('reminderFrequency').value;

    if (!name) {
        alert('Please enter a habit name');
        return;
    }

    const habit = new Habit(name, description, reminderFrequency);
    const habits = await getHabits();
    habits.push(habit);
    await saveHabits(habits);

    await logAction('HABIT_CREATED', { habitId: habit.id, habitName: habit.name });

    // Reset form
    this.reset();

    // Render updated habits
    await renderHabits();
    await renderStreaks();

    // Show success message
    alert('Habit created successfully!');
});

// Initial render on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    const user = await window.userDataManager?.requireAuth();
    if (!user) return; // Will redirect to login if not authenticated
    
    await renderHabits();
    await renderStreaks();

    await logAction('PAGE_VIEW', { page: 'habits' });
});
