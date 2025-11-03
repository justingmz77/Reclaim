document.addEventListener("DOMContentLoaded", () => {
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

  function updateJournalHistory() {
    const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
    historyContainer.innerHTML = "";

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

    promptTexts.forEach((text, index) => {
      const promptBtn = document.createElement("button");
      promptBtn.textContent = promptButtonTitles[index];
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

  saveBtn.addEventListener("click", () => {
    const title = journalTitleInput.value.trim() || "Untitled";
    const content = journalTextarea.value.trim();
    if (!content) return;

    const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
    entries.unshift({ title, content, date: new Date().toLocaleString() });
    localStorage.setItem("journalEntries", JSON.stringify(entries));

    journalTextarea.value = "";
    journalTitleInput.value = "";
    saveBtn.disabled = true;

    updateJournalHistory();

    moodMessage.textContent = "Journal entry saved!";
    setTimeout(() => (moodMessage.textContent = ""), 3000);
  });
});
