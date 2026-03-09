document.addEventListener("DOMContentLoaded", async () => {
  // Auth check
  const user = await window.userDataManager?.requireAuth();
  if (!user) return;

  const guidedBtn = document.getElementById("guidedBtn");
  const freeBtn = document.getElementById("freeBtn");
  const promptsContainer = document.getElementById("guidedPrompts");
  const journalTextarea = document.getElementById("journalNotes");
  const journalTitleInput = document.getElementById("journalTitle");
  const saveBtn = document.getElementById("saveJournalBtn");
  const journalMessage = document.getElementById("journalMessage");
  const historyContainer = document.getElementById("journalHistory");

  const promptTitles = [
    "Prompt 1: Self-Reflection 🪞",
    "Prompt 2: Gratitude 🌤️",
    "Prompt 3: Growth or Challenge 💪",
    "Prompt 4: Intention for Tomorrow 🌱"
  ];

  const promptTexts = [
    "What's one emotion that stood out to you today? Why do you think you felt that way?", 
    "List one thing you’re grateful for today.",
    "What challenged you today, and what did you learn from it?",
    "What’s one thing you want to focus on or improve tomorrow?"
  ];

  // Load journal history
  async function updateJournalHistory() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
      historyContainer.innerHTML = '<div class="no-mood-history">Please log in to view your journal entries.</div>';
      return;
    }

    try {
      const response = await fetch('/api/journal-entries?limit=100');
      if (!response.ok) throw new Error('Failed to fetch journal entries');
      const data = await response.json();
      const entries = data.entries || [];
      historyContainer.innerHTML = "";

      if (entries.length === 0) {
        historyContainer.innerHTML = '<div class="no-mood-history">No journal entries yet. Start writing!</div>';
        return;
      }

      entries.forEach(entry => {
        const card = document.createElement("div");
        card.classList.add("journal-card");
        const displayDate = new Date(entry.createdAt).toLocaleString();
        card.innerHTML = `
          <h4>${entry.title}</h4>
          <p>${entry.content}</p>
          <small>${displayDate}</small>
        `;
        historyContainer.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading journal entries:', error);
      historyContainer.innerHTML = '<div class="no-mood-history">Error loading journal entries. Please try again.</div>';
    }
  }

  await updateJournalHistory();

  // Guided prompts
  guidedBtn.addEventListener("click", () => {
    promptsContainer.innerHTML = "";
    promptsContainer.style.display = "flex";
    promptsContainer.style.justifyContent = "space-between";
    promptsContainer.style.flexWrap = "wrap";
    promptsContainer.style.gap = "10px";
    promptsContainer.style.marginBottom = "20px";

    promptTexts.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.textContent = promptTitles[i];
      btn.classList.add("mood-btn");
      btn.style.flex = "1";
      btn.style.minWidth = "200px";

      btn.addEventListener("click", () => {
        journalTextarea.value = text;
        saveBtn.disabled = false;
      });

      promptsContainer.appendChild(btn);
    });
  });

  // Free journaling
  freeBtn.addEventListener("click", () => {
    promptsContainer.style.display = "none";
    journalTextarea.value = "";
    journalTitleInput.value = "";
    saveBtn.disabled = true;
  });

  // Enable save button on input
  journalTextarea.addEventListener("input", () => {
    saveBtn.disabled = journalTextarea.value.trim().length === 0;
  });

  // Save journal entry
  saveBtn.addEventListener("click", async () => {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) return;

    const title = journalTitleInput.value.trim() || "Untitled";
    const content = journalTextarea.value.trim();
    if (!content) return;

    try {
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (!response.ok) throw new Error('Failed to save journal entry');

      // Clear form
      journalTextarea.value = "";
      journalTitleInput.value = "";
      saveBtn.disabled = true;

      // Update history
      await updateJournalHistory();

      // Success message
      journalMessage.textContent = "Journal entry saved!";
      setTimeout(() => (journalMessage.textContent = ""), 3000);
    } catch (error) {
      console.error('Error saving journal entry:', error);
      journalMessage.textContent = "Failed to save journal entry. Please try again.";
      setTimeout(() => (journalMessage.textContent = ""), 3000);
    }
  });
});
