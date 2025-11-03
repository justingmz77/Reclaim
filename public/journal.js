// (no change) everything still runs on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication first
  const user = await window.userDataManager?.requireAuth();
  if (!user) return; // Will redirect to login if not authenticated

  const guidedJournalBtn = document.getElementById("guidedBtn");
  const freeJournalBtn = document.getElementById("freeBtn");
  const promptsContainer = document.getElementById("guidedPrompts");
  const journalTextarea = document.getElementById("moodNotes");
  const journalTitleInput = document.getElementById("journalTitle");
  const saveBtn = document.getElementById("saveMoodBtn");
  const moodMessage = document.getElementById("mood-message");
  const historyContainer = document.getElementById("moodHistory");

  if (!guidedJournalBtn || !freeJournalBtn || !promptsContainer) return;

  // -----------------------------
  // ORIGINAL DEFAULT PROMPTS (kept exactly as a fallback)
  // -----------------------------
  const DEFAULT_PROMPT_BUTTON_TITLES = [
    "Prompt 1: Self-Reflection 🪞",
    "Prompt 2: Gratitude 🌤️",
    "Prompt 3: Growth or Challenge 💪",
    "Prompt 4: Intention for Tomorrow 🌱"
  ];

  const DEFAULT_PROMPT_TEXTS = [
    "What's one emotion that stood out to you today? Why do you think you felt that way?",
    "List one thing you’re grateful for today.",
    "What challenged you today, and what did you learn from it?",
    "What’s one thing you want to focus on or improve tomorrow?"
  ];

  // -----------------------------
  // NEW: Try to load admin-managed prompts; fall back to defaults above
  // API shape expected from /api/content:
  // { prompts: [{ title: string, text: string }, ...] }
  // -----------------------------
  async function loadManagedPrompts() {
    try {
      const res = await fetch('/api/content', { credentials: 'include' });
      if (!res.ok) throw new Error('no content');
      const data = await res.json();

      // validate structure and map
      const managed = Array.isArray(data?.prompts)
        ? data.prompts
            .filter(p => p && typeof p.title === 'string' && typeof p.text === 'string')
            .map(p => ({ title: p.title, text: p.text }))
        : [];

      if (managed.length > 0) {
        return {
          titles: managed.map(p => p.title),
          texts: managed.map(p => p.text)
        };
      }
    } catch (e) {
      // silently fall back
    }

    // Fallback to your original hardcoded content
    return {
      titles: DEFAULT_PROMPT_BUTTON_TITLES,
      texts: DEFAULT_PROMPT_TEXTS
    };
  }

  const { titles: promptButtonTitles, texts: promptTexts } = await loadManagedPrompts();

  async function updateJournalHistory() {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
      historyContainer.innerHTML = '<div class="no-mood-history">Please log in to view your journal entries.</div>';
      return;
    }

    const storageKey = window.userDataManager.getUserStorageKey("journalEntries", user.id);
    const entries = JSON.parse(localStorage.getItem(storageKey) || "[]");
    historyContainer.innerHTML = "";

    if (entries.length === 0) {
      historyContainer.innerHTML = '<div class="no-mood-history">No journal entries yet. Start writing!</div>';
      return;
    }

    entries.forEach(entry => {
      const card = document.createElement("div");
      card.classList.add("journal-card");
      card.innerHTML = `
        <h4>${entry.title}</h4>
        <p>${entry.content}</p>
        <small>${entry.date}</small>
      `;
      historyContainer.appendChild(card);
    });
  }

  updateJournalHistory();

  // Guided journaling: render buttons from managed prompts, fallback kept above
  guidedJournalBtn.addEventListener("click", () => {
    promptsContainer.innerHTML = "";
    promptsContainer.style.display = "flex";
    promptsContainer.style.justifyContent = "space-between";
    promptsContainer.style.flexWrap = "wrap";
    promptsContainer.style.gap = "10px";
    promptsContainer.style.marginBottom = "20px";

    promptTexts.forEach((text, index) => {
      const promptBtn = document.createElement("button");
      promptBtn.textContent = promptButtonTitles[index] ?? `Prompt ${index + 1}`;
      promptBtn.classList.add("mood-btn");
      promptBtn.style.flex = "1";
      promptBtn.style.minWidth = "200px";

      promptBtn.addEventListener("click", () => {
        journalTextarea.value = text;
        saveBtn.disabled = false;
      });

      promptsContainer.appendChild(promptBtn);
    });
  });

  // Free journaling unchanged
  freeJournalBtn.addEventListener("click", () => {
    promptsContainer.style.display = "none";
    journalTextarea.value = "";
    journalTitleInput.value = "";
    saveBtn.disabled = true;
  });

  journalTextarea.addEventListener("input", () => {
    if (journalTextarea.value.trim().length > 0) {
      saveBtn.disabled = false;
    } else {
      saveBtn.disabled = true;
    }
  });

  // Save entry unchanged
  saveBtn.addEventListener("click", async () => {
    const user = await window.userDataManager?.getCurrentUser();
    if (!user) {
      window.location.href = '/login.html';
      return;
    }

    const title = journalTitleInput.value.trim() || "Untitled";
    const content = journalTextarea.value.trim();
    if (!content) return;

    const storageKey = window.userDataManager.getUserStorageKey("journalEntries", user.id);
    const entries = JSON.parse(localStorage.getItem(storageKey) || "[]");
    entries.unshift({ title, content, date: new Date().toLocaleString() });
    localStorage.setItem(storageKey, JSON.stringify(entries));

    journalTextarea.value = "";
    journalTitleInput.value = "";
    saveBtn.disabled = true;

    updateJournalHistory();

    moodMessage.textContent = "Journal entry saved!";
    setTimeout(() => (moodMessage.textContent = ""), 3000);
  });
});
