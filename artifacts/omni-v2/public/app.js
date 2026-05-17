/* ============================================================
   Omni V2 Learning Platform — app.js
   Handles: navigation, progress, localStorage, copy buttons,
            Python syntax highlighting
   Plain ES6 — no frameworks, no external libs, no build step
   ============================================================ */

const STORAGE_KEY = 'omniV2Progress';
const TOTAL = 9;
const API_PROGRESS_URL = '/api/progress';

/* ── Python syntax highlighter ───────────────────────────── */
function highlightPython(raw) {
  const KW = new Set([
    'False','None','True','and','as','assert','break','class','continue',
    'def','del','elif','else','except','finally','for','from','global',
    'if','import','in','is','lambda','nonlocal','not','or','pass',
    'raise','return','try','while','with','yield'
  ]);
  const BN = new Set([
    'abs','dict','dir','enumerate','filter','float','format','getattr',
    'hasattr','hex','input','int','isinstance','len','list','map','max',
    'min','oct','open','ord','pow','print','range','repr','reversed',
    'round','set','setattr','sorted','str','sum','super','tuple','type','zip'
  ]);

  let out = '';
  let i = 0;
  const n = raw.length;
  let prevKw = '';

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function sp(cls, s) {
    return '<span class="' + cls + '">' + esc(s) + '</span>';
  }

  while (i < n) {
    const c = raw[i];

    // Triple-quoted strings
    if ((c === '"' && raw.slice(i, i + 3) === '"""') ||
        (c === "'" && raw.slice(i, i + 3) === "'''")) {
      const q = raw.slice(i, i + 3);
      let j = i + 3;
      while (j < n && raw.slice(j, j + 3) !== q) j++;
      j += 3;
      out += sp('str', raw.slice(i, j));
      i = j; prevKw = ''; continue;
    }
    // Single-quoted strings
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && raw[j] !== q && raw[j] !== '\n') {
        if (raw[j] === '\\') j++;
        j++;
      }
      if (j < n && raw[j] === q) j++;
      out += sp('str', raw.slice(i, j));
      i = j; prevKw = ''; continue;
    }
    // Comments
    if (c === '#') {
      let j = i + 1;
      while (j < n && raw[j] !== '\n') j++;
      out += sp('cm', raw.slice(i, j));
      i = j; prevKw = ''; continue;
    }
    // Numbers
    if (/[0-9]/.test(c) || (c === '.' && i + 1 < n && /[0-9]/.test(raw[i + 1]))) {
      let j = i;
      while (j < n && /[0-9a-fA-FxXoObB._]/.test(raw[j])) j++;
      out += sp('num', raw.slice(i, j));
      i = j; prevKw = ''; continue;
    }
    // Identifiers (keywords, self, function names, builtins, plain)
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_]/.test(raw[j])) j++;
      const word = raw.slice(i, j);
      // peek past spaces to find the next non-space char
      let k = j;
      while (k < n && raw[k] === ' ') k++;
      const nx = raw[k];

      if (KW.has(word)) {
        out += sp('kw', word);
        prevKw = word;
      } else if (word === 'self') {
        out += sp('self', word);
        prevKw = '';
      } else if (prevKw === 'def') {
        out += sp('fn', word);
        prevKw = '';
      } else if (prevKw === 'class') {
        out += sp('cls', word);
        prevKw = '';
      } else if (nx === '(') {
        out += sp('fn', word);
        prevKw = '';
      } else if (BN.has(word)) {
        out += sp('fn', word);
        prevKw = '';
      } else {
        out += esc(word);
        prevKw = '';
      }
      i = j; continue;
    }
    // Newline resets keyword context so it doesn't bleed across lines
    if (c === '\n') prevKw = '';
    out += esc(c);
    i++;
  }
  return out;
}

function initSyntaxHighlight() {
  document.querySelectorAll('.code-block').forEach(function (pre) {
    // Store raw text BEFORE replacing innerHTML — copy button reads dataset.raw
    const raw = pre.textContent;
    pre.dataset.raw = raw;
    pre.innerHTML = highlightPython(raw);
  });
}

/* ── Local storage helpers ───────────────────────────────── */
function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveLocalProgress(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

/* ── Merge: OR-combine both sides so no completed module is lost ── */
function mergeProgress(local, remote) {
  const merged = {};
  const allKeys = new Set(Object.keys(local).concat(Object.keys(remote)));
  allKeys.forEach(function (k) {
    merged[k] = !!(local[k] || remote[k]);
  });
  return merged;
}

/* ── Server sync ─────────────────────────────────────────── */
async function fetchServerProgress() {
  try {
    const res = await fetch(API_PROGRESS_URL, { credentials: 'include' });
    if (!res.ok) return {};
    const data = await res.json();
    return data.modules || {};
  } catch (_) {
    return {};
  }
}

async function pushServerProgress(state) {
  try {
    await fetch(API_PROGRESS_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: state }),
    });
  } catch (_) {}
}

/* ── Navigation ──────────────────────────────────────────── */
let currentPage = 'home';

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    currentPage = id;
  }

  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.target === id);
  });

  window.scrollTo({ top: 0, behavior: 'instant' });
  closeSidebar();
}

window.goTo = function (id) { showPage(id); };

/* ── Progress ────────────────────────────────────────────── */
function updateProgressUI(state) {
  const done = Object.values(state).filter(Boolean).length;
  const pct  = Math.round((done / TOTAL) * 100);

  const textEl = document.getElementById('progress-text');
  const pctEl  = document.getElementById('progress-pct');
  const fillEl = document.getElementById('progress-fill');
  const tbPct  = document.getElementById('topbar-pct');

  if (textEl) textEl.textContent = done + ' / ' + TOTAL + ' modules';
  if (pctEl)  pctEl.textContent  = pct + '%';
  if (fillEl) fillEl.style.width = pct + '%';
  if (tbPct)  tbPct.textContent  = pct + '%';

  for (let i = 1; i <= TOTAL; i++) {
    const check = document.querySelector('.nav-check[data-module="' + i + '"]');
    if (check) {
      check.textContent = state[i] ? '✓' : '○';
      check.classList.toggle('done', !!state[i]);
    }
    const box = document.querySelector('.module-check[data-module="' + i + '"]');
    if (box) box.checked = !!state[i];
  }

  const banner = document.getElementById('finish-banner');
  if (banner) {
    banner.classList.toggle('visible', done === TOTAL);
  }
}

function initCheckboxes(state) {
  document.querySelectorAll('.module-check').forEach(function (cb) {
    const num = parseInt(cb.dataset.module, 10);
    cb.checked = !!state[num];

    cb.addEventListener('change', function () {
      state[num] = cb.checked;
      saveLocalProgress(state);
      updateProgressUI(state);
      pushServerProgress(state);
    });
  });
}

/* ── Copy Code ───────────────────────────────────────────── */
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = btn.dataset.copyTarget;
      const preEl    = document.getElementById(targetId);
      if (!preEl) return;

      // dataset.raw is set by initSyntaxHighlight — always plain Python, no markup
      const text = preEl.dataset.raw || preEl.textContent;

      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = '✓ Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy Code';
          btn.classList.remove('copied');
        }, 1800);
      }).catch(function () {
        fallbackCopy(text, btn);
      });
    });
  });
}

function fallbackCopy(text, btn) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = 'Copy Code';
      btn.classList.remove('copied');
    }, 1800);
  } catch (_) {
    btn.textContent = 'Error';
    setTimeout(function () { btn.textContent = 'Copy Code'; }, 1500);
  }
  document.body.removeChild(ta);
}

/* ── Mobile sidebar ──────────────────────────────────────── */
function closeSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (sidebar)  sidebar.classList.remove('open');
  if (overlay)  overlay.classList.remove('visible');
}

function initMobile() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }
}

/* ── Module card clicks (home grid) ─────────────────────── */
function initModuleCards() {
  document.querySelectorAll('.module-card').forEach(function (card) {
    card.addEventListener('click', function () {
      const id = card.dataset.goto;
      if (id) showPage(id);
    });
  });
}

/* ── Next / back buttons ─────────────────────────────────── */
function initNavButtons() {
  document.querySelectorAll('.next-btn, .prev-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const id = btn.dataset.goto;
      if (id) showPage(id);
    });
  });
}

/* ── Nav link clicks ─────────────────────────────────────── */
function initNavLinks() {
  document.querySelectorAll('.nav-item').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      const id = a.dataset.target;
      if (id) showPage(id);
    });
  });
}

/* ── Reset button ────────────────────────────────────────── */
function initReset() {
  const btn = document.getElementById('reset-btn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    const state = {};
    saveLocalProgress(state);
    pushServerProgress(state);
    updateProgressUI(state);
    document.querySelectorAll('.module-check').forEach(function (cb) {
      cb.checked = false;
    });
  });
}

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async function () {
  // Highlight first so dataset.raw is set before copy buttons are used
  initSyntaxHighlight();

  const local  = loadLocalProgress();
  const remote = await fetchServerProgress();

  const state = mergeProgress(local, remote);

  saveLocalProgress(state);
  pushServerProgress(state);

  initNavLinks();
  initModuleCards();
  initNavButtons();
  initCheckboxes(state);
  initCopyButtons();
  initMobile();
  initReset();
  updateProgressUI(state);

  showPage('home');
});
