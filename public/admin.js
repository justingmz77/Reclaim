// Admin UI for managing prompts, games, and exercises
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const user = await window.userDataManager?.requireAuth();
    if (!user) return; // Will redirect to login if not authenticated
  
    const isAdmin = window.userDataManager.isAdmin(user);
    const gate = document.getElementById('adminOnlyGate');
    const app = document.getElementById('adminApp');
  
    if (!isAdmin) {
      gate.style.display = 'block';
      app.style.display = 'none';
      return;
    }
  
    gate.style.display = 'none';
    app.style.display = 'block';
  
    // Tabs
    document.querySelectorAll('.admin-tabs .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.tab;
        document.querySelectorAll('.admin-tab').forEach(t => (t.style.display = 'none'));
        document.getElementById(`tab-${name}`).style.display = 'block';
      });
    });
  
    // Fetch content
    async function fetchContent() {
      const res = await fetch('/api/content');
      if (!res.ok) return { prompts: [], games: [], exercises: [] };
      return res.json();
    }
  
    let content = await fetchContent();
  
    // Helpers
    function newId() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
  
    async function saveItem(type, item, mode) {
      const base = `/api/content/${type}`;
      const url = mode === 'create' ? base : `${base}/${encodeURIComponent(item.id)}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
  
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
  
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || `Failed to ${mode} ${type.slice(0, -1)}`);
        return;
      }
  
      content = await fetchContent();
      renderAll();
    }
  
    async function deleteItem(type, id) {
      if (!confirm('Delete this item?')) return;
      const res = await fetch(`/api/content/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || 'Delete failed');
        return;
      }
      content = await fetchContent();
      renderAll();
    }
  
    // Render lists
    function renderList(type, containerId, fields) {
      const container = document.getElementById(containerId);
      const items = content[type] || [];
  
      if (!items.length) {
        container.innerHTML = `<div class="no-data-message">No ${type} yet. Add one above!</div>`;
        return;
      }
  
      container.innerHTML = items
        .map(
          (item) => `
        <div class="admin-row">
          <div class="admin-row-main">
            ${fields
              .map(
                (f) => `
              <div class="admin-field">
                <label>${f.label}</label>
                <input type="text"
                       value="${(item[f.key] ?? '').toString().replace(/"/g, '&quot;')}"
                       data-field="${f.key}" data-id="${item.id}" />
              </div>`
              )
              .join('')}
          </div>
          <div class="admin-row-actions">
            <button class="btn btn-small btn-success" data-action="save" data-type="${type}" data-id="${item.id}">Save</button>
            <button class="btn btn-small btn-danger" data-action="delete" data-type="${type}" data-id="${item.id}">Delete</button>
          </div>
        </div>`
        )
        .join('');
  
      container.querySelectorAll('button[data-action="save"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const updated = { id };
          fields.forEach((f) => {
            const input = container.querySelector(`input[data-id="${id}"][data-field="${f.key}"]`);
            updated[f.key] = input.value.trim();
          });
          await saveItem(type, updated, 'update');
        });
      });
  
      container.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await deleteItem(type, btn.dataset.id);
        });
      });
    }
  
    function renderAll() {
      renderList('prompts', 'promptsList', [
        { key: 'title', label: 'Title' },
        { key: 'text', label: 'Prompt' }
      ]);
      renderList('games', 'gamesList', [
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' }
      ]);
      renderList('exercises', 'exercisesList', [
        { key: 'title', label: 'Title' },
        { key: 'instructions', label: 'Instructions' }
      ]);
    }
  
    renderAll();
  
    // Add handlers
    document.getElementById('addPromptBtn').addEventListener('click', async () => {
      const title = prompt('Prompt title');
      if (title === null) return;
      const text = prompt('Prompt text');
      if (text === null) return;
      await saveItem('prompts', { id: newId(), title: title.trim(), text: text.trim() }, 'create');
    });
  
    document.getElementById('addGameBtn').addEventListener('click', async () => {
      const title = prompt('Game title');
      if (title === null) return;
      const description = prompt('Short description');
      if (description === null) return;
      await saveItem('games', { id: newId(), title: title.trim(), description: description.trim() }, 'create');
    });
  
    document.getElementById('addExerciseBtn').addEventListener('click', async () => {
      const title = prompt('Exercise title');
      if (title === null) return;
      const instructions = prompt('Instructions');
      if (instructions === null) return;
      await saveItem('exercises', { id: newId(), title: title.trim(), instructions: instructions.trim() }, 'create');
    });
  });
  