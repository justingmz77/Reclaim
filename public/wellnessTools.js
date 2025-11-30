document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".wellness-tools-grid");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-success");
    if (!btn) return;

    const card = btn.closest(".dashboard-card");
    if (!card) return;

    const index = Array.from(container.children).indexOf(card);

    let completedTools = JSON.parse(localStorage.getItem("completedTools") || "[]");

    if (!completedTools.includes(index)) {
      completedTools.push(index);
      localStorage.setItem("completedTools", JSON.stringify(completedTools));
    }

    btn.textContent = "Completed";
    btn.disabled = true;
    btn.classList.add("completed");
  });

  const completedTools = JSON.parse(localStorage.getItem("completedTools") || "[]");
  completedTools.forEach((index) => {
    const card = container.children[index];
    if (card) {
      const btn = card.querySelector(".btn-success");
      if (btn) {
        btn.textContent = "Completed";
        btn.disabled = true;
        btn.classList.add("completed");
      }
    }
  });
});
