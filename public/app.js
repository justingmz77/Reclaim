// Mood Tracker with localStorage
const MOOD_STORAGE_KEY = 'reclaim_mood_entries';

// Get all mood entries from localStorage (user-specific)
async function getMoodEntries() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        return []; // Return empty if not logged in
    }
    const storageKey = window.userDataManager.getUserStorageKey(MOOD_STORAGE_KEY, user.id);
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
}

// Save mood entries to localStorage (user-specific)
async function saveMoodEntries(entries) {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        console.error('Cannot save mood entries: User not authenticated');
        return;
    }
    const storageKey = window.userDataManager.getUserStorageKey(MOOD_STORAGE_KEY, user.id);
    localStorage.setItem(storageKey, JSON.stringify(entries));
}

// Get today's date string
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Mood Tracker functionality
const moodButtons = document.querySelectorAll('.mood-btn');
const moodMessage = document.getElementById('mood-message');
const moodNotesInput = document.getElementById('moodNotes');
const saveMoodBtn = document.getElementById('saveMoodBtn');
let selectedMood = null;

// Enable/disable save button based on mood selection
moodButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        moodButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Store selected mood
        selectedMood = button.dataset.mood;

        // Enable save button
        saveMoodBtn.disabled = false;

        // Clear any previous message
        moodMessage.classList.remove('show');
    });
});

// Save mood entry
saveMoodBtn.addEventListener('click', async () => {
    if (!selectedMood) return;

    // Check authentication
    const user = await window.userDataManager?.requireAuth();
    if (!user) return;

    const today = getTodayDateString();
    const emoji = document.querySelector(`.mood-btn[data-mood="${selectedMood}"]`).dataset.emoji;
    const note = moodNotesInput.value.trim();

    // Get existing entries
    const entries = await getMoodEntries();

    // Check if there's already an entry for today
    const existingIndex = entries.findIndex(entry => entry.date === today);

    const newEntry = {
        date: today,
        mood: selectedMood,
        emoji: emoji,
        note: note,
        timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        // Update existing entry
        entries[existingIndex] = newEntry;
    } else {
        // Add new entry
        entries.unshift(newEntry);
    }

    // Keep only last 30 entries
    if (entries.length > 30) {
        entries.splice(30);
    }

    // Save to localStorage
    await saveMoodEntries(entries);

    // Show success message
    const moodLabels = {
        great: 'Great',
        good: 'Good',
        okay: 'Okay',
        bad: 'Not Good',
        terrible: 'Terrible'
    };

    moodMessage.textContent = `✅ Mood saved: ${emoji} ${moodLabels[selectedMood]}`;
    moodMessage.classList.add('show');

    // Reset form
    setTimeout(() => {
        moodMessage.classList.remove('show');
    }, 3000);

    // Render updated history
    await renderMoodHistory();
});

// Render mood history
async function renderMoodHistory() {
    const historyContainer = document.getElementById('moodHistory');
    if (!historyContainer) return;
    
    // Check authentication
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
        historyContainer.innerHTML = '<div class="no-mood-history">Please log in to view your mood entries.</div>';
        return;
    }
    
    const entries = await getMoodEntries();

    if (entries.length === 0) {
        historyContainer.innerHTML = '<div class="no-mood-history">No mood entries yet. Start tracking your mood today!</div>';
        return;
    }

    // Show last 6 entries
    const recentEntries = entries.slice(0, 6);

    historyContainer.innerHTML = recentEntries.map(entry => {
        const moodLabels = {
            great: 'Great',
            good: 'Good',
            okay: 'Okay',
            bad: 'Not Good',
            terrible: 'Terrible'
        };

        return `
            <div class="mood-history-item">
                <div class="mood-history-date">${formatDate(entry.date)}</div>
                <div class="mood-history-mood">
                    <span class="mood-history-mood-emoji">${entry.emoji}</span>
                    <span>${moodLabels[entry.mood]}</span>
                </div>
                ${entry.note ? `<div class="mood-history-note">"${entry.note}"</div>` : ''}
            </div>
        `;
    }).join('');
}

// Load today's mood if already set
async function loadTodaysMood() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) return; // Don't load if not logged in
    
    const today = getTodayDateString();
    const entries = await getMoodEntries();
    const todayEntry = entries.find(entry => entry.date === today);

    if (todayEntry) {
        const savedButton = document.querySelector(`[data-mood="${todayEntry.mood}"]`);
        if (savedButton) {
            savedButton.classList.add('active');
            selectedMood = todayEntry.mood;
            saveMoodBtn.disabled = false;
        }

        if (todayEntry.note && moodNotesInput) {
            moodNotesInput.value = todayEntry.note;
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in before loading data
    const user = await window.userDataManager?.getCurrentUser();
    if (user) {
        await loadTodaysMood();
        await renderMoodHistory();
    } else {
        // Show message that user needs to log in
        const historyContainer = document.getElementById('moodHistory');
        if (historyContainer) {
            historyContainer.innerHTML = '<div class="no-mood-history">Please <a href="login.html">log in</a> to track your mood.</div>';
        }
    }
});

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
