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

  // NEW: Try to load admin-managed prompts; fall back to originals above.
  // Does not modify or remove your original constants; we use separate "active" vars.
  let activePromptButtonTitles = promptButtonTitles;
  let activePromptTexts = promptTexts;

  try {
    const res = await fetch('/api/content', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.prompts) && data.prompts.length > 0) {
        const managedTitles = [];
        const managedTexts = [];
        data.prompts.forEach(p => {
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
    // silently ignore failures and keep defaults
  } catch (_) {
    // no-op, keep defaults
  }

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

  guidedJournalBtn.addEventListener("click", () => {
    promptsContainer.innerHTML = ""; 
    promptsContainer.style.display = "flex";
    promptsContainer.style.justifyContent = "space-between";
    promptsContainer.style.flexWrap = "wrap";
    promptsContainer.style.gap = "10px";
    promptsContainer.style.marginBottom = "20px";

    activePromptTexts.forEach((text, index) => {
      const promptBtn = document.createElement("button");
      promptBtn.textContent = activePromptButtonTitles[index] ?? `Prompt ${index + 1}`;
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