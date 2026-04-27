// OCR — screenshot upload and Claude Vision parsing

// After deploying Tencent SCF, replace this URL with your actual function URL
const SCF_URL = window.SCF_URL || '';

export async function parseScreenshot(file, playerName) {
  const base64 = await fileToBase64(file);

  if (!SCF_URL) {
    throw new Error('SCF_URL not configured');
  }

  const res = await fetch(SCF_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, playerName })
  });

  if (!res.ok) throw new Error('识别服务出错，请手动输入');

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return processOcrResult(data);
}

function processOcrResult(data) {
  // Calculate birdie/par/bogey from holeScores array
  const holes = Array.isArray(data.holeScores) ? data.holeScores : [];
  const birdies = holes.filter(s => s === -1).length;
  const eagles = holes.filter(s => s <= -2).length;
  const pars = holes.filter(s => s === 0).length;
  const bogeys = holes.filter(s => s === 1).length;
  const doublePlusBogeys = holes.filter(s => s >= 2).length;

  const parTotal = data.parTotal || 72;
  const totalScore = data.totalScore;
  const relativeScore = totalScore != null ? totalScore - parTotal : null;

  return {
    date: data.date || null,
    course: data.course || '',
    parTotal,
    totalScore: totalScore || null,
    relativeScore,
    frontNine: data.frontNine || null,
    backNine: data.backNine || null,
    birdies: birdies + eagles,
    pars,
    bogeys,
    doublePlusBogeys,
    companions: Array.isArray(data.companions) ? data.companions : [],
    parsedFromScreenshot: true
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
