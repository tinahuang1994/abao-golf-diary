// Storage — localStorage CRUD

const SETTINGS_KEY = 'abao_settings';
const ROUNDS_KEY = 'abao_rounds';

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch { return {}; }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getRounds() {
  try {
    return JSON.parse(localStorage.getItem(ROUNDS_KEY)) || [];
  } catch { return []; }
}

export function saveRound(round) {
  const rounds = getRounds();
  round.id = 'r_' + Date.now();
  round.createdAt = new Date().toISOString();
  rounds.unshift(round); // newest first
  localStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
  return round;
}

export function getRoundById(id) {
  return getRounds().find(r => r.id === id) || null;
}

export function deleteRound(id) {
  const rounds = getRounds().filter(r => r.id !== id);
  localStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
}
