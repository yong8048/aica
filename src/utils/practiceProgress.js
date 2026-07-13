export const JEONGCHEOGI_PROGRESS_KEY = "aica-jeongcheogi-practice-progress";

function loadAll() {
  try {
    const raw = localStorage.getItem(JEONGCHEOGI_PROGRESS_KEY);
    if (!raw) return { full: null, rounds: {} };
    const parsed = JSON.parse(raw);
    return {
      full: parsed.full ?? null,
      rounds: parsed.rounds ?? {},
    };
  } catch {
    return { full: null, rounds: {} };
  }
}

function saveAll(data) {
  localStorage.setItem(JEONGCHEOGI_PROGRESS_KEY, JSON.stringify(data));
}

export function getJeongcheogiFullProgress() {
  return loadAll().full;
}

export function getJeongcheogiRoundProgress(slug) {
  return loadAll().rounds[slug] ?? null;
}

export function getJeongcheogiAllRoundProgress() {
  return loadAll().rounds;
}

export function saveJeongcheogiFullProgress(currentIndex, sessionStats, totalQuestions) {
  const data = loadAll();
  data.full = {
    currentIndex,
    sessionStats,
    totalQuestions,
    updatedAt: Date.now(),
  };
  saveAll(data);
}

export function saveJeongcheogiRoundProgress(slug, currentIndex, sessionStats, totalQuestions) {
  const data = loadAll();
  data.rounds[slug] = {
    currentIndex,
    sessionStats,
    totalQuestions,
    updatedAt: Date.now(),
  };
  saveAll(data);
}

export function clearJeongcheogiFullProgress() {
  const data = loadAll();
  data.full = null;
  saveAll(data);
}

export function clearJeongcheogiRoundProgress(slug) {
  const data = loadAll();
  delete data.rounds[slug];
  saveAll(data);
}
