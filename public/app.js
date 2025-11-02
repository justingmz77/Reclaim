// Mood Tracker
const moodButtons = document.querySelectorAll('.mood-btn');
const moodMessage = document.getElementById('mood-message');

moodButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        moodButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Get mood value
        const mood = button.dataset.mood;

        // Display message based on mood
        const messages = {
            great: "That's wonderful! Keep up the positive energy!",
            good: "Great to hear! Remember to take care of yourself.",
            okay: "Every day is different. Consider doing something you enjoy today.",
            bad: "Sorry you're feeling down. Remember, support is available if you need it.",
            terrible: "We're here for you. Please consider reaching out to a counselor or using our crisis support."
        };

        moodMessage.textContent = messages[mood];

        // Store mood in localStorage (basic tracking)
        const today = new Date().toDateString();
        localStorage.setItem(`mood_${today}`, mood);
    });
});

// Load today's mood if already set
const today = new Date().toDateString();
const savedMood = localStorage.getItem(`mood_${today}`);
if (savedMood) {
    const savedButton = document.querySelector(`[data-mood="${savedMood}"]`);
    if (savedButton) {
        savedButton.classList.add('active');
    }
}

// Habit Checkboxes
const habitCheckboxes = document.querySelectorAll('.habit-item input[type="checkbox"]');

habitCheckboxes.forEach(checkbox => {
    // Load saved state
    const savedState = localStorage.getItem(`habit_${checkbox.id}_${today}`);
    if (savedState === 'true') {
        checkbox.checked = true;
    }

    // Save state on change
    checkbox.addEventListener('change', () => {
        localStorage.setItem(`habit_${checkbox.id}_${today}`, checkbox.checked);
    });
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
