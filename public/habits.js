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

// Get habits from API
async function getHabits() {
    try {
        const response = await fetch('/api/habits');
        if (!response.ok) {
            if (response.status === 401) return [];
            throw new Error('Failed to fetch habits');
        }
        const data = await response.json();
        return data.habits || [];
    } catch (error) {
        console.error('Error fetching habits:', error);
        return [];
    }
}

// Get completed habits from API
async function getCompletedHabits() {
    try {
        const response = await fetch('/api/habits?includeCompleted=true');
        if (!response.ok) {
            if (response.status === 401) return [];
            throw new Error('Failed to fetch completed habits');
        }
        const data = await response.json();
        return (data.habits || []).filter(h => h.status === 'done');
    } catch (error) {
        console.error('Error fetching completed habits:', error);
        return [];
    }
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
    const today = new Date().toISOString().split('T')[0];

    try {
        const response = await fetch(`/api/habits/${habitId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today })
        });

        if (!response.ok) {
            const error = await response.json();
            if (error.error === 'Habit already completed on this date') {
                return; // Already completed, silently return
            }
            throw new Error(error.error || 'Failed to complete habit');
        }

        const data = await response.json();
        await logAction('HABIT_COMPLETED', { habitId, streak: data.streak });

        // Check for streak rewards (Use Case 8)
        const habits = await getHabits();
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            habit.streak = data.streak;
            checkStreakRewards(habit);
        }

        await renderHabits();
        await renderStreaks();
    } catch (error) {
        console.error('Error completing habit:', error);
        alert('Failed to mark habit as complete. Please try again.');
    }
}

// Check for streak rewards (Use Case 8: Focus Games/Rewards)
function checkStreakRewards(habit) {
    const milestones = [1, 7, 14, 30, 60, 90, 180, 365];

    if (milestones.includes(habit.streak)) {
        showRewardNotification(habit);
    }
}

// Show reward notification
function showRewardNotification(habit) {
    let message = '';
    if (habit.streak === 1){
        message = `🚀 Great start! You've completed the first day of "${habit.name}", keep it going!`;
    } else {
        message = `🎉 Congratulations! You've maintained "${habit.name}" for ${habit.streak} days straight!`;
    }

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
    try {
        const habits = await getHabits();
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        const response = await fetch(`/api/habits/${habitId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: habit.name,
                description: habit.description,
                reminderFrequency: habit.reminderFrequency,
                status: 'done',
                streak: habit.streak,
                lastCompletedDate: habit.lastCompletedDate
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update habit status');
        }

        await logAction('HABIT_STATUS_CHANGED', { habitId, habitName: habit.name, newStatus: 'done' });
        await renderHabits();
    } catch (error) {
        console.error('Error marking habit as done:', error);
        alert('Failed to mark habit as done. Please try again.');
    }
}

// Delete habit
async function deleteHabit(habitId, isCompleted = false) {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    try {
        const response = await fetch(`/api/habits/${habitId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete habit');
        }

        await logAction('HABIT_DELETED', { habitId, wasCompleted: isCompleted });
        await renderHabits();
        await renderStreaks();
    } catch (error) {
        console.error('Error deleting habit:', error);
        alert('Failed to delete habit. Please try again.');
    }
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
    
    const habits = await getHabits(); // <-- Await here!
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

            const allHabits = habits; // Use the already awaited habits
            const longestStreak = Math.max(...habit.completionHistory.map(d => {
                const h = allHabits.find(h2 => h2.id === habit.id);
                return h ? calculateStreak(h) : 0;
            }), currentStreak);

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
                            <span class="stat-number">${longestStreak}</span>
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

    try {
        const response = await fetch('/api/habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, reminderFrequency })
        });

        if (!response.ok) {
            throw new Error('Failed to create habit');
        }

        const data = await response.json();
        await logAction('HABIT_CREATED', { habitId: data.habit.id, habitName: name });

        // Reset form
        this.reset();

        // Render updated habits
        await renderHabits();
        await renderStreaks();

        // Show success message
        alert('Habit created successfully!');
    } catch (error) {
        console.error('Error creating habit:', error);
        alert('Failed to create habit. Please try again.');
    }
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
