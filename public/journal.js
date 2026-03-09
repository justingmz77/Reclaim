document.addEventListener("DOMContentLoaded", async () => {
  // Auth check
  const user = await window.userDataManager?.requireAuth();
  if (!user) return;

  const guidedJournalBtn = document.getElementById("guidedBtn");
  const freeJournalBtn = document.getElementById("freeBtn");
  const promptsContainer = document.getElementById("guidedPrompts");
  const journalTextarea = document.getElementById("journalContent");
  const journalTitleInput = document.getElementById("journalTitle");
  const saveBtn = document.getElementById("saveJournalBtn");
  const journalMessage = document.getElementById("journal-message");
  const historyContainer = document.getElementById("journalHistory");

  if (!guidedJournalBtn || !freeJournalBtn || !promptsContainer) return;

  const promptButtonTitles = [
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

  let activePromptButtonTitles = promptButtonTitles;
  let activePromptTexts = promptTexts;

  try {
    const res = await fetch('/api/content', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.prompts) && data.prompts.length > 0) {
        const managedTitles = [];
        const managedTexts = [];
        data.prompts.forEach((p) => {
          if (p && typeof p.title === 'string' && typeof p.text === 'string') {
            managedTitles.push(p.title);
            managedTexts.push(p.text);
          }
        });
        if (managedTitles.length > 0 && managedTexts.length > 0) {
          activePromptButtonTitles = managedTitles;
          activePromptTexts = managedTexts;
        }
      }
    }
  } catch (_) {
    // Keep defaults if managed prompts are unavailable.
  }

  // Load journal history
  async function updateJournalHistory() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
      historyContainer.innerHTML = '<div class="no-entry-history">Please log in to view your journal entries.</div>';
      return;
    }

    try {
      const response = await fetch('/api/journal-entries?limit=100');
      if (!response.ok) throw new Error('Failed to fetch journal entries');
      const data = await response.json();
      const entries = data.entries || [];
      historyContainer.innerHTML = "";

      if (entries.length === 0) {
        historyContainer.innerHTML = '<div class="no-entry-history">No journal entries yet. Start writing!</div>';
        return;
      }

      entries.forEach(entry => {
        const card = document.createElement("div");
        card.classList.add("tracker-history-item");
        // Format the ISO date to a more readable format
        const displayDate = new Date(entry.createdAt).toLocaleString();
        card.innerHTML = `
          <div class="tracker-history-date">${displayDate}</div>
          <div class="tracker-history-value">${entry.title}</div>
          <div class="tracker-history-note">${entry.content}</div>
        `;
        historyContainer.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading journal entries:', error);
      historyContainer.innerHTML = '<div class="no-entry-history">Error loading journal entries. Please try again.</div>';
    }
  }

  await updateJournalHistory();

  guidedJournalBtn.addEventListener("click", () => {
    promptsContainer.innerHTML = ""; 
    promptsContainer.classList.add("show");

    activePromptTexts.forEach((text, index) => {
      const promptBtn = document.createElement("button");
      promptBtn.textContent = activePromptButtonTitles[index] ?? `Prompt ${index + 1}`;
      promptBtn.classList.add("tracker-btn", "tracker-prompt-btn");
      promptBtn.addEventListener("click", () => {
        journalTextarea.value = text;
        saveBtn.disabled = false;
      });

      promptsContainer.appendChild(promptBtn);
    });
  });

  freeJournalBtn.addEventListener("click", () => {
    promptsContainer.classList.remove("show");
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

      // Show success message
      journalMessage.textContent = "Journal entry saved!";
      setTimeout(() => (journalMessage.textContent = ""), 3000);
    } catch (error) {
      console.error('Error saving journal entry:', error);
      journalMessage.textContent = "Failed to save journal entry. Please try again.";
      setTimeout(() => (journalMessage.textContent = ""), 3000);
    }
  });
});
