// Analytics Dashboard JavaScript

// Date helpers
function getDateRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
    };
}

// State
let currentHabitMonth = new Date().getMonth() + 1;
let currentHabitYear = new Date().getFullYear();
let currentMoodMonth = new Date().getMonth() + 1;
let currentMoodYear = new Date().getFullYear();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadQuickStats();
    loadHabitAnalytics();
    loadMoodAnalytics();
    loadCorrelation();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('habitPrevMonth').addEventListener('click', () => {
        currentHabitMonth--;
        if (currentHabitMonth < 1) {
            currentHabitMonth = 12;
            currentHabitYear--;
        }
        loadHabitCalendar();
    });

    document.getElementById('habitNextMonth').addEventListener('click', () => {
        currentHabitMonth++;
        if (currentHabitMonth > 12) {
            currentHabitMonth = 1;
            currentHabitYear++;
        }
        loadHabitCalendar();
    });

    document.getElementById('moodPrevMonth').addEventListener('click', () => {
        currentMoodMonth--;
        if (currentMoodMonth < 1) {
            currentMoodMonth = 12;
            currentMoodYear--;
        }
        loadMoodCalendar();
    });

    document.getElementById('moodNextMonth').addEventListener('click', () => {
        currentMoodMonth++;
        if (currentMoodMonth > 12) {
            currentMoodMonth = 1;
            currentMoodYear++;
        }
        loadMoodCalendar();
    });
}

// Load Quick Stats
async function loadQuickStats() {
    try {
        const response = await fetch('/api/analytics/habits/statistics');
        const data = await response.json();

        if (data.success) {
            const stats = data.statistics;
            const grid = document.getElementById('quickStatsGrid');
            grid.innerHTML = `
                <div class="stat-card">
                    <h3>Active Habits</h3>
                    <div class="stat-value">${stats.activeHabits}</div>
                    <div class="stat-subtitle">of ${stats.totalHabits} total</div>
                </div>
                <div class="stat-card">
                    <h3>Completed Today</h3>
                    <div class="stat-value">${stats.completedToday}</div>
                    <div class="stat-subtitle">${stats.completionRateToday}% completion rate</div>
                </div>
                <div class="stat-card">
                    <h3>Active Streaks</h3>
                    <div class="stat-value">${stats.activeStreaks}</div>
                    <div class="stat-subtitle">habits on fire 🔥</div>
                </div>
                <div class="stat-card">
                    <h3>Longest Streak</h3>
                    <div class="stat-value">${stats.longestStreak.days}</div>
                    <div class="stat-subtitle">${stats.longestStreak.name || 'Keep going!'}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading quick stats:', error);
    }
}

// Load Habit Analytics
async function loadHabitAnalytics() {
    const { startDate, endDate } = getDateRange(30);

    try {
        const response = await fetch(`/api/analytics/habits/completion-rates?startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();

        if (data.success) {
            renderHabitCompletionChart(data.rates);
        }
    } catch (error) {
        console.error('Error loading habit analytics:', error);
    }

    loadHabitCalendar();
}

function renderHabitCompletionChart(rates) {
    const chart = document.getElementById('habitCompletionChart');

    if (rates.length === 0) {
        chart.innerHTML = '<p style="text-align:center;color:#666;">No habits to display</p>';
        return;
    }

    const maxRate = Math.max(...rates.map(r => parseFloat(r.rate)));

    chart.innerHTML = rates.map(habit => {
        const height = maxRate > 0 ? (parseFloat(habit.rate) / maxRate * 100) : 0;
        return `
            <div class="bar-wrapper">
                <div class="bar" style="height: ${height}%">
                    <span class="bar-value">${habit.rate}%</span>
                </div>
                <div class="bar-label">${habit.name}</div>
            </div>
        `;
    }).join('');
}

async function loadHabitCalendar() {
    try {
        const response = await fetch(`/api/analytics/habits/calendar?month=${currentHabitMonth}&year=${currentHabitYear}`);
        const data = await response.json();

        if (data.success) {
            renderHabitCalendar(data.calendarData);
        }
    } catch (error) {
        console.error('Error loading habit calendar:', error);
    }
}

function renderHabitCalendar(calendarData) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('habitCurrentMonth').textContent = `${monthNames[currentHabitMonth - 1]} ${currentHabitYear}`;

    const calendar = document.getElementById('habitCalendar');
    const firstDay = new Date(currentHabitYear, currentHabitMonth - 1, 1).getDay();

    let html = '';

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of month
    calendarData.forEach(day => {
        const date = new Date(day.date);
        const dayNum = date.getDate();
        const rate = parseFloat(day.rate);

        let rateClass = 'habit-rate-none';
        if (rate >= 75) rateClass = 'habit-rate-high';
        else if (rate >= 50) rateClass = 'habit-rate-medium';
        else if (rate > 0) rateClass = 'habit-rate-low';

        const habitList = day.habits.map(h => h.name).join(', ') || 'No habits completed';

        html += `
            <div class="calendar-day ${rateClass}" title="${day.date}: ${habitList}">
                <span class="day-number">${dayNum}</span>
                <span class="day-emoji">${day.completed}/${day.total}</span>
            </div>
        `;
    });

    calendar.innerHTML = html;
}

// Load Mood Analytics
async function loadMoodAnalytics() {
    const { startDate, endDate } = getDateRange(30);

    try {
        // Load trends
        const trendsResponse = await fetch(`/api/analytics/mood/trends?startDate=${startDate}&endDate=${endDate}`);
        const trendsData = await trendsResponse.json();

        if (trendsData.success) {
            renderMoodTrendChart(trendsData.trends, trendsData.average);
        }

        // Load distribution
        const distResponse = await fetch(`/api/analytics/mood/distribution?startDate=${startDate}&endDate=${endDate}`);
        const distData = await distResponse.json();

        if (distData.success) {
            renderMoodDistributionChart(distData.distribution);
        }
    } catch (error) {
        console.error('Error loading mood analytics:', error);
    }

    loadMoodCalendar();
}

function renderMoodTrendChart(trends, average) {
    const chart = document.getElementById('moodTrendChart');

    if (trends.length === 0) {
        chart.innerHTML = '<p style="text-align:center;color:#666;">No mood data to display</p>';
        return;
    }

    // Simple SVG line chart
    const width = chart.clientWidth || 800;
    const height = 200;
    const padding = 40;

    const moodColors = {
        5: '#4CAF50',
        4: '#8BC34A',
        3: '#FFC107',
        2: '#FF9800',
        1: '#F44336'
    };

    // Calculate points
    const xScale = (width - padding * 2) / (trends.length - 1 || 1);
    const yScale = (height - padding * 2) / 4; // 5 mood levels (1-5)

    let pathData = '';
    let circles = '';

    trends.forEach((entry, index) => {
        const x = padding + (index * xScale);
        const y = height - padding - ((entry.score - 1) * yScale);

        if (index === 0) {
            pathData += `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
        }

        circles += `<circle cx="${x}" cy="${y}" r="4" fill="${moodColors[entry.score]}" />`;
    });

    chart.innerHTML = `
        <svg class="line-chart-svg" viewBox="0 0 ${width} ${height}">
            <path d="${pathData}" stroke="var(--primary-color)" stroke-width="2" fill="none" />
            ${circles}
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1" />
            <text x="${width/2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#666">Average: ${average}</text>
        </svg>
    `;
}

function renderMoodDistributionChart(distribution) {
    const chart = document.getElementById('moodDistributionChart');

    const moods = [
        { key: 'great', label: 'Great 😊', color: '#4CAF50' },
        { key: 'good', label: 'Good 🙂', color: '#8BC34A' },
        { key: 'okay', label: 'Okay 😐', color: '#FFC107' },
        { key: 'bad', label: 'Not Good 😟', color: '#FF9800' },
        { key: 'terrible', label: 'Terrible 😢', color: '#F44336' }
    ];

    const maxCount = Math.max(...moods.map(m => distribution[m.key]));

    chart.innerHTML = moods.map(mood => {
        const count = distribution[mood.key] || 0;
        const height = maxCount > 0 ? (count / maxCount * 100) : 0;
        return `
            <div class="bar-wrapper">
                <div class="bar" style="height: ${height}%; background: ${mood.color};">
                    <span class="bar-value">${count}</span>
                </div>
                <div class="bar-label">${mood.label}</div>
            </div>
        `;
    }).join('');
}

async function loadMoodCalendar() {
    try {
        const response = await fetch(`/api/analytics/mood/calendar?month=${currentMoodMonth}&year=${currentMoodYear}`);
        const data = await response.json();

        if (data.success) {
            renderMoodCalendar(data.entries);
        }
    } catch (error) {
        console.error('Error loading mood calendar:', error);
    }
}

function renderMoodCalendar(entries) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('moodCurrentMonth').textContent = `${monthNames[currentMoodMonth - 1]} ${currentMoodYear}`;

    const calendar = document.getElementById('moodCalendar');
    const firstDay = new Date(currentMoodYear, currentMoodMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentMoodYear, currentMoodMonth, 0).getDate();

    let html = '';

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Create a map of entries by date
    const entryMap = {};
    entries.forEach(entry => {
        entryMap[entry.date] = entry;
    });

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentMoodYear}-${String(currentMoodMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entry = entryMap[dateStr];

        if (entry) {
            const moodClass = `mood-${entry.mood}`;
            html += `
                <div class="calendar-day ${moodClass}" title="${entry.date}: ${entry.mood}">
                    <span class="day-number">${day}</span>
                    <span class="day-emoji">${entry.emoji}</span>
                </div>
            `;
        } else {
            html += `
                <div class="calendar-day no-data" title="${dateStr}: No mood recorded">
                    <span class="day-number">${day}</span>
                </div>
            `;
        }
    }

    calendar.innerHTML = html;
}

// Load Correlation
async function loadCorrelation() {
    const { startDate, endDate } = getDateRange(30);

    try {
        const response = await fetch(`/api/analytics/correlation?startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();

        if (data.success) {
            const insight = document.querySelector('#correlationInsight .insight-text');
            insight.innerHTML = `
                ${data.insight}<br><br>
                <strong>Average mood with habits:</strong> ${data.averageMoodWithHabits}/5<br>
                <strong>Average mood without habits:</strong> ${data.averageMoodWithoutHabits}/5
            `;
            insight.classList.remove('loading');
        }
    } catch (error) {
        console.error('Error loading correlation:', error);
    }
}
