document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".wellness-tools-grid");
  if (!container) return;

  const user = await window.userDataManager?.getCurrentUser();
  const storageKey = window.userDataManager?.getUserStorageKey
    ? window.userDataManager.getUserStorageKey("reclaim_wellness_tools_progress", user?.id)
    : "reclaim_wellness_tools_progress";

  function getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  function getYesterdayDateString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== "object") return { tools: {} };
      if (!parsed.tools || typeof parsed.tools !== "object") {
        return { tools: {} };
      }
      return parsed;
    } catch {
      return { tools: {} };
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  }

  function ensureStreakElement(card) {
    let streakEl = card.querySelector(".wellness-tool-streak");
    if (!streakEl) {
      streakEl = document.createElement("div");
      streakEl.className = "wellness-tool-streak";
      const button = card.querySelector(".btn-success");
      if (button) {
        button.insertAdjacentElement("beforebegin", streakEl);
      } else {
        card.appendChild(streakEl);
      }
    }
    return streakEl;
  }

  function renderCardState(card, toolProgress) {
    const button = card.querySelector(".btn-success");
    if (!button) return;

    const today = getTodayDateString();
    const streak = Number(toolProgress?.streak || 0);
    const totalCompletions = Number(toolProgress?.totalCompletions || 0);
    const completedToday = toolProgress?.lastCompletedDate === today;

    button.textContent = completedToday ? "Completed Today" : "Mark Complete";
    button.disabled = completedToday;
    button.classList.toggle("completed", completedToday);

    const streakEl = ensureStreakElement(card);
    streakEl.textContent = `Streak: ${streak} day${streak === 1 ? "" : "s"} • Total: ${totalCompletions}`;
  }

  function launchConfetti() {
    const colors = ["#667eea", "#764ba2", "#28a745", "#ffcc00", "#ff6b6b"];
    const count = 36;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.3}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(piece);

      setTimeout(() => {
        piece.remove();
      }, 1800);
    }
  }

  function getToolIndex(card) {
    return Array.from(container.children).indexOf(card);
  }

  let progress = loadProgress();

  Array.from(container.children).forEach((card, index) => {
    const toolProgress = progress.tools[String(index)] || {};
    renderCardState(card, toolProgress);
  });

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-success");
    if (!btn) return;

    const card = btn.closest(".dashboard-card");
    if (!card) return;

    const toolIndex = getToolIndex(card);
    if (toolIndex < 0) return;

    const key = String(toolIndex);
    const existing = progress.tools[key] || {};
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    if (existing.lastCompletedDate === today) {
      return;
    }

    const previousStreak = Number(existing.streak || 0);
    const nextStreak = existing.lastCompletedDate === yesterday ? previousStreak + 1 : 1;
    const nextTotal = Number(existing.totalCompletions || 0) + 1;

    progress.tools[key] = {
      lastCompletedDate: today,
      streak: nextStreak,
      totalCompletions: nextTotal
    };

    saveProgress(progress);
    renderCardState(card, progress.tools[key]);
    launchConfetti();
  });
});
