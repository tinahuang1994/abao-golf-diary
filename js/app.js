import { getSettings, saveSettings, getRounds, saveRound, getRoundById, deleteRound } from './storage.js';
import { getYearStats, formatRelative, formatDate } from './stats.js';
import { parseScreenshot } from './ocr.js';
import { createSpeechInput } from './speech.js';

// ── ROUTER ──
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    window.scrollTo(0, 0);
  }
}

// ── SETUP VIEW ──
function initSetup() {
  const form = document.getElementById('setup-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('setup-name').value.trim() || '宝';
    saveSettings({ playerName: name, setupComplete: true });
    initHome();
    showView('view-home');
  });
}

// ── HOME VIEW ──
function initHome() {
  const rounds = getRounds();
  const stats = getYearStats(rounds);

  // Year stats card
  const yearCard = document.getElementById('year-card');
  if (stats && stats.count > 0) {
    yearCard.style.display = '';
    document.getElementById('stat-count').textContent = stats.count;
    document.getElementById('stat-avg').textContent = stats.avg ?? '--';
    document.getElementById('stat-best').textContent = stats.best ?? '--';
    document.getElementById('stat-birds').textContent = stats.birdies;
    const progEl = document.getElementById('stat-progress');
    if (stats.improvement && stats.improvement > 0) {
      progEl.textContent = `🎉 今年进步了 ${stats.improvement} 杆！加油阿宝！`;
    } else {
      progEl.textContent = '继续加油，每一场都是进步！';
    }
  } else {
    yearCard.style.display = 'none';
  }

  // Rounds list
  const list = document.getElementById('rounds-list');
  const empty = document.getElementById('rounds-empty');
  if (rounds.length === 0) {
    list.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    list.innerHTML = rounds.map(r => roundCardHTML(r)).join('');
    list.querySelectorAll('.round-card').forEach(card => {
      card.addEventListener('click', () => {
        showDetail(card.dataset.id);
      });
    });
  }
}

function roundCardHTML(r) {
  const icons = [];
  if (r.birdies > 0) icons.push(`<span class="score-icon birdie">🐦 ×${r.birdies}</span>`);
  if (r.pars > 0) icons.push(`<span class="score-icon par">◯ ×${r.pars}</span>`);
  if (r.bogeys > 0) icons.push(`<span class="score-icon bogey">+ ×${r.bogeys}</span>`);
  if (r.doublePlusBogeys > 0) icons.push(`<span class="score-icon dbl">++ ×${r.doublePlusBogeys}</span>`);

  const rel = r.relativeScore != null ? (r.relativeScore > 0 ? '+' + r.relativeScore : r.relativeScore) : '';
  const notesText = r.notes ? r.notes : '<span style="color:var(--text-light);font-style:italic">暂无心得</span>';

  return `
    <div class="round-card" data-id="${r.id}">
      <div class="round-card-top">
        <div>
          <div class="round-course">${escHtml(r.course || '未知球场')}</div>
          <div class="round-date">${formatDate(r.date)}</div>
        </div>
        <div class="round-score-block">
          <div class="round-score">${r.totalScore ?? '--'}</div>
          <div class="round-relative">${rel ? rel + ' 超标准杆' : ''}</div>
        </div>
      </div>
      ${icons.length ? `<div class="round-icons">${icons.join('')}</div>` : ''}
      <div class="round-notes">${notesText}</div>
    </div>`;
}

// ── ADD ROUND VIEW ──
let draftRound = {};

function initAddRound() {
  draftRound = {};
  showStep('step-upload');

  // File upload
  const zone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleScreenshot(file);
    fileInput.value = '';
  });

  // Manual entry button
  document.getElementById('btn-manual').addEventListener('click', () => {
    draftRound = { parsedFromScreenshot: false };
    populateConfirmForm(null);
    showStep('step-confirm');
  });

  // Confirm step next
  document.getElementById('btn-confirm-next').addEventListener('click', () => {
    readConfirmForm();
    initNotesStep();
    showStep('step-notes');
  });

  // Notes step: voice inputs
  const notesMic = document.getElementById('mic-notes');
  const notesTA = document.getElementById('ta-notes');
  const notesLabel = document.getElementById('mic-notes-label');
  createSpeechInput(notesMic, notesTA, notesLabel);

  const improveMic = document.getElementById('mic-improve');
  const improveTA = document.getElementById('ta-improve');
  const improveLabel = document.getElementById('mic-improve-label');
  createSpeechInput(improveMic, improveTA, improveLabel);

  // Save
  document.getElementById('btn-save').addEventListener('click', saveAndReturn);
}

async function handleScreenshot(file) {
  showStep('step-loading');
  const settings = getSettings();
  const playerName = settings.playerName || '宝';

  try {
    const result = await parseScreenshot(file, playerName);
    Object.assign(draftRound, result);
    populateConfirmForm(result);
    showStep('step-confirm');
  } catch (err) {
    alert('截图识别失败：' + err.message + '\n\n请手动输入数据。');
    draftRound = { parsedFromScreenshot: false };
    populateConfirmForm(null);
    showStep('step-confirm');
  }
}

function populateConfirmForm(data) {
  document.getElementById('cf-course').value = data?.course || '';
  document.getElementById('cf-date').value = data?.date || today();
  document.getElementById('cf-score').value = data?.totalScore || '';
  document.getElementById('cf-par').value = data?.parTotal || 72;

  // Stats (read-only display)
  document.getElementById('cs-birdies').textContent = data?.birdies ?? '--';
  document.getElementById('cs-pars').textContent = data?.pars ?? '--';
  document.getElementById('cs-bogeys').textContent = data?.bogeys ?? '--';
  document.getElementById('cs-dbl').textContent = data?.doublePlusBogeys ?? '--';

  // Front/back nine
  document.getElementById('cf-front').value = data?.frontNine || '';
  document.getElementById('cf-back').value = data?.backNine || '';

  // Companions
  const comps = data?.companions || [];
  document.getElementById('companions-list').innerHTML =
    comps.length ? comps.map(c => `<span class="companion-tag">${escHtml(c)}</span>`).join('') : '<span style="color:var(--text-light)">无同伴数据</span>';
  document.getElementById('cf-companions').value = comps.join('、');

  // Recalculate stats when score or par changes
  ['cf-score', 'cf-par'].forEach(id => {
    document.getElementById(id).addEventListener('input', recalcStats);
  });
}

function recalcStats() {
  const score = parseInt(document.getElementById('cf-score').value);
  const par = parseInt(document.getElementById('cf-par').value);
  // If manually entered, stats won't auto-calc (no hole data)
  // Just show what we have from OCR or leave as manual
}

function readConfirmForm() {
  const score = parseInt(document.getElementById('cf-score').value) || null;
  const par = parseInt(document.getElementById('cf-par').value) || 72;
  draftRound.course = document.getElementById('cf-course').value.trim();
  draftRound.date = document.getElementById('cf-date').value;
  draftRound.totalScore = score;
  draftRound.parTotal = par;
  draftRound.relativeScore = score != null ? score - par : null;
  draftRound.frontNine = parseInt(document.getElementById('cf-front').value) || null;
  draftRound.backNine = parseInt(document.getElementById('cf-back').value) || null;

  const compStr = document.getElementById('cf-companions').value;
  draftRound.companions = compStr ? compStr.split(/[、,，\s]+/).filter(Boolean) : [];
}

function initNotesStep() {
  document.getElementById('ta-notes').value = '';
  document.getElementById('ta-improve').value = '';
}

function saveAndReturn() {
  draftRound.notes = document.getElementById('ta-notes').value.trim();
  draftRound.improvement = document.getElementById('ta-improve').value.trim();
  saveRound(draftRound);
  initHome();
  showView('view-home');
}

function showStep(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── DETAIL VIEW ──
function showDetail(id) {
  const r = getRoundById(id);
  if (!r) return;

  const rel = r.relativeScore != null
    ? (r.relativeScore === 0 ? 'E（平标准杆）' : (r.relativeScore > 0 ? '+' : '') + r.relativeScore + ' 超标准杆')
    : '';

  document.getElementById('det-course').textContent = r.course || '未知球场';
  document.getElementById('det-date').textContent = formatDate(r.date);
  document.getElementById('det-score').textContent = r.totalScore ?? '--';
  document.getElementById('det-relative').textContent = rel;

  const halvesEl = document.getElementById('det-halves');
  if (r.frontNine || r.backNine) {
    halvesEl.style.display = 'flex';
    document.getElementById('det-front').textContent = r.frontNine ?? '--';
    document.getElementById('det-back').textContent = r.backNine ?? '--';
  } else {
    halvesEl.style.display = 'none';
  }

  document.getElementById('det-birdies').textContent = r.birdies ?? '--';
  document.getElementById('det-pars').textContent = r.pars ?? '--';
  document.getElementById('det-bogeys').textContent = r.bogeys ?? '--';
  document.getElementById('det-dbl').textContent = r.doublePlusBogeys ?? '--';

  const compEl = document.getElementById('det-companions');
  compEl.innerHTML = r.companions?.length
    ? r.companions.map(c => `<span class="companion-tag">${escHtml(c)}</span>`).join('')
    : '<span class="detail-text empty">无记录</span>';

  document.getElementById('det-notes').textContent = r.notes || '';
  document.getElementById('det-notes').className = 'detail-text' + (r.notes ? '' : ' empty');
  if (!r.notes) document.getElementById('det-notes').textContent = '暂无心得';

  document.getElementById('det-improve').textContent = r.improvement || '';
  document.getElementById('det-improve').className = 'detail-text' + (r.improvement ? '' : ' empty');
  if (!r.improvement) document.getElementById('det-improve').textContent = '暂无记录';

  document.getElementById('btn-delete').onclick = () => {
    if (confirm('确定删除这条记录吗？')) {
      deleteRound(id);
      initHome();
      showView('view-home');
    }
  };

  showView('view-detail');
}

// ── UTILS ──
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── BOOT ──
document.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  const settings = getSettings();

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back;
      if (target === 'home') { initHome(); showView('view-home'); }
      else showView(target);
    });
  });

  // Add round button
  document.getElementById('btn-add').addEventListener('click', () => {
    initAddRound();
    showView('view-add');
  });

  if (!settings.setupComplete) {
    initSetup();
    showView('view-setup');
  } else {
    initHome();
    showView('view-home');
  }
});
