// Stats — year summary calculations

export function getYearStats(rounds) {
  const year = new Date().getFullYear();
  const thisYear = rounds.filter(r => r.date && r.date.startsWith(String(year)));

  if (thisYear.length === 0) return null;

  const scores = thisYear.map(r => r.totalScore).filter(Boolean);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const best = scores.length ? Math.min(...scores) : null;
  const birdies = thisYear.reduce((sum, r) => sum + (r.birdies || 0), 0);

  // Progress: compare best score to first round this year
  const sorted = [...thisYear].sort((a, b) => a.date.localeCompare(b.date));
  const firstScore = sorted[0]?.totalScore;
  const improvement = firstScore && best ? firstScore - best : null;

  return {
    count: thisYear.length,
    avg,
    best,
    birdies,
    improvement
  };
}

export function formatRelative(rel) {
  if (rel === 0) return 'E（平标准杆）';
  if (rel > 0) return '+' + rel;
  return String(rel);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
