// Accessibility Settings Manager
// Provides text-to-speech, font resizing, and color contrast modes
// Settings persist via localStorage

(function () {
    const STORAGE_KEY = 'reclaim_accessibility';
    const DEFAULT_SETTINGS = {
        fontSize: 'normal',
        colorMode: 'default',
        textToSpeech: false
    };

    let settings = { ...DEFAULT_SETTINGS };
    let isSpeaking = false;

    // ── Storage ────────────────────────────────────────────────────────────────

    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (_) {
            settings = { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (_) {}
    }

    // ── Apply ──────────────────────────────────────────────────────────────────

    function applySettings() {
        const html = document.documentElement;
        html.setAttribute('data-font-size', settings.fontSize);
        html.setAttribute('data-color-mode', settings.colorMode);
        updateModalUI();
    }

    // ── TTS ────────────────────────────────────────────────────────────────────

    function getPageText() {
        const root = document.querySelector('main') || document.body;
        const selectors = 'h1, h2, h3, h4, p, li, label, .stat-label, .stat-number, .dashboard-subtitle';
        return Array.from(root.querySelectorAll(selectors))
            .map(el => el.textContent.trim())
            .filter(t => t.length > 1)
            .join('. ');
    }

    function readText(text) {
        if (!window.speechSynthesis) {
            alert('Text-to-speech is not supported in your browser.');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.onend = () => setReadingState(false);
        utterance.onerror = () => setReadingState(false);
        window.speechSynthesis.speak(utterance);
        setReadingState(true);
    }

    function stopReading() {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setReadingState(false);
    }

    function setReadingState(reading) {
        isSpeaking = reading;
        const stopBtn = document.getElementById('a11yStopBtn');
        const readBtn = document.getElementById('a11yReadBtn');
        if (stopBtn) stopBtn.style.display = reading ? 'inline-flex' : 'none';
        if (readBtn) readBtn.style.display = reading ? 'none' : 'inline-flex';
    }

    // ── Modal HTML ─────────────────────────────────────────────────────────────

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'a11yModal';
        modal.className = 'a11y-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'a11yModalTitle');
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';

        modal.innerHTML = `
<div class="a11y-panel" role="document">

  <div class="a11y-panel-header">
    <h2 id="a11yModalTitle" class="a11y-panel-title">
      <svg class="a11y-title-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="4" r="2"/>
        <path d="M19 9h-6V7h-2v2H5a1 1 0 0 0 0 2h2.28l1.45 7.26C8.89 17.08 9.63 18 11 18s2.11-.92 2.27-1.74L14.72 11H17a1 1 0 0 0 0-2z"/>
      </svg>
      Accessibility Settings
    </h2>
    <button class="a11y-close" id="a11yClose" aria-label="Close accessibility settings">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>

  <div class="a11y-panel-body">

    <!-- Font Size -->
    <div class="a11y-group">
      <p class="a11y-group-label">
        <svg class="a11y-group-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/>
        </svg>
        Text Size
      </p>
      <div class="a11y-btn-group" role="group" aria-label="Text size options">
        <button class="a11y-choice" data-setting="fontSize" data-value="normal" aria-pressed="false">
          <span class="a11y-choice-preview" style="font-size:0.8em;font-weight:700;">A</span>
          <span class="a11y-choice-label">Normal</span>
        </button>
        <button class="a11y-choice" data-setting="fontSize" data-value="large" aria-pressed="false">
          <span class="a11y-choice-preview" style="font-size:1.1em;font-weight:700;">A</span>
          <span class="a11y-choice-label">Large</span>
        </button>
        <button class="a11y-choice" data-setting="fontSize" data-value="xl" aria-pressed="false">
          <span class="a11y-choice-preview" style="font-size:1.4em;font-weight:700;">A</span>
          <span class="a11y-choice-label">Extra Large</span>
        </button>
      </div>
    </div>

    <!-- Color Mode -->
    <div class="a11y-group">
      <p class="a11y-group-label">
        <svg class="a11y-group-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
        Color Mode
      </p>
      <div class="a11y-btn-group a11y-color-group" role="group" aria-label="Color mode options">
        <button class="a11y-choice" data-setting="colorMode" data-value="default" aria-pressed="false">
          <span class="a11y-swatch a11y-swatch-default" aria-hidden="true"></span>
          <span class="a11y-choice-label">Default</span>
        </button>
        <button class="a11y-choice" data-setting="colorMode" data-value="high-contrast" aria-pressed="false">
          <span class="a11y-swatch a11y-swatch-hc" aria-hidden="true"></span>
          <span class="a11y-choice-label">High Contrast</span>
        </button>
        <button class="a11y-choice" data-setting="colorMode" data-value="dark" aria-pressed="false">
          <span class="a11y-swatch a11y-swatch-dark" aria-hidden="true"></span>
          <span class="a11y-choice-label">Dark Mode</span>
        </button>
      </div>
    </div>

    <!-- Text to Speech -->
    <div class="a11y-group">
      <p class="a11y-group-label">
        <svg class="a11y-group-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        Text to Speech
      </p>
      <div class="a11y-tts-row">
        <div class="a11y-toggle-wrap">
          <label class="a11y-toggle-label" for="a11yTtsToggle">
            Read page content aloud
            <span class="a11y-toggle-hint">Use the buttons below to start or stop reading</span>
          </label>
          <button class="a11y-toggle" id="a11yTtsToggle" role="switch" aria-checked="false">
            <span class="a11y-toggle-track" aria-hidden="true">
              <span class="a11y-toggle-thumb"></span>
            </span>
          </button>
        </div>
        <div class="a11y-tts-actions" id="a11yTtsActions" style="display:none">
          <button class="a11y-tts-btn" id="a11yReadBtn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
            Read Page
          </button>
          <button class="a11y-tts-btn a11y-tts-stop-btn" id="a11yStopBtn" style="display:none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>
            Stop
          </button>
        </div>
      </div>
    </div>

  </div>

  <div class="a11y-panel-footer">
    <button class="a11y-btn-reset" id="a11yReset">Reset to Defaults</button>
    <button class="a11y-btn-done" id="a11yDone">Done</button>
  </div>

</div>`;
        return modal;
    }

    // ── Floating Button ────────────────────────────────────────────────────────

    function createFloatingBtn() {
        const btn = document.createElement('button');
        btn.id = 'a11yFab';
        btn.className = 'a11y-fab';
        btn.setAttribute('aria-label', 'Open Accessibility Settings');
        btn.title = 'Accessibility Settings';
        btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="4" r="2"/>
        <path d="M19 9h-6V7h-2v2H5a1 1 0 0 0 0 2h2.28l1.45 7.26C8.89 17.08 9.63 18 11 18s2.11-.92 2.27-1.74L14.72 11H17a1 1 0 0 0 0-2z"/>
      </svg>`;
        return btn;
    }

    // ── Modal UI sync ──────────────────────────────────────────────────────────

    function updateModalUI() {
        const modal = document.getElementById('a11yModal');
        if (!modal) return;

        modal.querySelectorAll('.a11y-choice').forEach(btn => {
            const isActive = btn.dataset.value === settings[btn.dataset.setting];
            btn.classList.toggle('a11y-choice--active', isActive);
            btn.setAttribute('aria-pressed', isActive.toString());
        });

        const toggle = document.getElementById('a11yTtsToggle');
        const actions = document.getElementById('a11yTtsActions');
        if (toggle) {
            toggle.classList.toggle('a11y-toggle--on', settings.textToSpeech);
            toggle.setAttribute('aria-checked', settings.textToSpeech.toString());
        }
        if (actions) {
            actions.style.display = settings.textToSpeech ? 'flex' : 'none';
        }
    }

    // ── Open / Close ───────────────────────────────────────────────────────────

    function openModal() {
        let modal = document.getElementById('a11yModal');
        if (!modal) {
            modal = createModal();
            document.body.appendChild(modal);
            wireModalEvents(modal);
        }
        updateModalUI();
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => modal.classList.add('a11y-overlay--visible'));
        setTimeout(() => document.getElementById('a11yClose')?.focus(), 60);
    }

    function closeModal() {
        const modal = document.getElementById('a11yModal');
        if (!modal) return;
        modal.classList.remove('a11y-overlay--visible');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }, 200);
        document.getElementById('a11yFab')?.focus();
    }

    // ── Event Wiring ───────────────────────────────────────────────────────────

    function wireModalEvents(modal) {
        document.getElementById('a11yClose').addEventListener('click', closeModal);
        document.getElementById('a11yDone').addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

        // Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
        });

        // Setting choice buttons
        modal.querySelectorAll('.a11y-choice').forEach(btn => {
            btn.addEventListener('click', () => {
                settings[btn.dataset.setting] = btn.dataset.value;
                saveSettings();
                applySettings();
            });
        });

        // TTS toggle
        document.getElementById('a11yTtsToggle').addEventListener('click', () => {
            settings.textToSpeech = !settings.textToSpeech;
            if (!settings.textToSpeech) stopReading();
            saveSettings();
            updateModalUI();
        });

        // Read / Stop buttons
        document.getElementById('a11yReadBtn').addEventListener('click', () => readText(getPageText()));
        document.getElementById('a11yStopBtn').addEventListener('click', stopReading);

        // Reset
        document.getElementById('a11yReset').addEventListener('click', () => {
            settings = { ...DEFAULT_SETTINGS };
            saveSettings();
            applySettings();
            stopReading();
        });
    }

    // ── Nav link handler (set by nav.js) ───────────────────────────────────────

    function handleNavLinkClicks() {
        document.addEventListener('click', e => {
            const link = e.target.closest('#a11yNavLink, [data-a11y-trigger]');
            if (link) {
                e.preventDefault();
                openModal();
            }
        });
    }

    // ── Init ───────────────────────────────────────────────────────────────────

    function init() {
        loadSettings();
        applySettings();

        const fab = createFloatingBtn();
        document.body.appendChild(fab);
        fab.addEventListener('click', openModal);

        handleNavLinkClicks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for nav.js to call
    window.openAccessibilityModal = openModal;
})();
