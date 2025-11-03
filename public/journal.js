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

  // Load prompts from server-managed content; fallback to previous defaults
  async function fetchPrompts() {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error('no content');
      const data = await res.json();
      const prompts = (data.prompts || []).map(p => ({ title: p.title, text: p.text }));
      if (prompts.length) return prompts;
    } catch (e) {
      // ignore, fallback below
    }
    return [
      "Prompt 1: Self-Reflection 🪞|What's one emotion that stood out to you today? Why do you think you felt that way?",
      "Prompt 2: Gratitude 🌤️|List one thing you’re grateful for today.",
      "Prompt 3: Growth or Challenge 💪|What challenged you today, and what did you learn from it?",
      "Prompt 4: Intention for Tomorrow 🌱|What’s one thing you want to focus on or improve tomorrow?"
    ].map(s => {
      const [title, text] = s.split('|');
      return { title, text };
    });
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
        <h4>${escapeHTML(entry.title)}</h4>
        <p>${escapeHTML(entry.content)}</p>
        <small>${escapeHTML(entry.date)}</small>
      `;
      historyContainer.appendChild(card);
    });
  }

  function escapeHTML(str) {
    return (str || "").replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  updateJournalHistory();

  // Buttons to choose journal type
  guidedJournalBtn.addEventListener("click", async () => {
    const prompts = await fetchPrompts();

    // Container for guided prompt buttons (JS variable: promptsContainer)
    promptsContainer.innerHTML = ""; 
    promptsContainer.style.display = "flex";
    promptsContainer.style.justifyContent = "space-between";
    promptsContainer.style.flexWrap = "wrap";
    promptsContainer.style.gap = "10px";
    promptsContainer.style.marginBottom = "20px";

    prompts.forEach(({ title, text }) => {
      const promptBtn = document.createElement("button");
      promptBtn.textContent = title;
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

  // JS variable: freeJournalBtn
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

  // Save Button (JS uses: saveMoodBtn)
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