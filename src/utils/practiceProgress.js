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

export function saveJeongcheogiFullProgress(state) {
  const data = loadAll();
  data.full = { ...state, updatedAt: Date.now() };
  saveAll(data);
}

export function saveJeongcheogiRoundProgress(slug, state) {
  const data = loadAll();
  data.rounds[slug] = { ...state, updatedAt: Date.now() };
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

export const SILGI_PROGRESS_KEY = "aica-silgi-practice-progress";

function loadSilgiAll() {
  try {
    const raw = localStorage.getItem(SILGI_PROGRESS_KEY);
    if (!raw) return { rounds: {}, subjects: {}, sample: null };
    const parsed = JSON.parse(raw);
    return {
      rounds: parsed.rounds ?? {},
      subjects: parsed.subjects ?? {},
      sample: parsed.sample ?? null,
    };
  } catch {
    return { rounds: {}, subjects: {}, sample: null };
  }
}

function saveSilgiAll(data) {
  localStorage.setItem(SILGI_PROGRESS_KEY, JSON.stringify(data));
}

export function getSilgiAllProgress() {
  return loadSilgiAll();
}

export function getSilgiRoundProgress(slug) {
  return loadSilgiAll().rounds[slug] ?? null;
}

export function getSilgiSubjectProgress(subjectId) {
  return loadSilgiAll().subjects[subjectId] ?? null;
}

export function getSilgiSampleProgress() {
  return loadSilgiAll().sample;
}

export function saveSilgiRoundProgress(slug, state) {
  const data = loadSilgiAll();
  data.rounds[slug] = { ...state, updatedAt: Date.now() };
  saveSilgiAll(data);
}

export function saveSilgiSubjectProgress(subjectId, state) {
  const data = loadSilgiAll();
  data.subjects[subjectId] = { ...state, updatedAt: Date.now() };
  saveSilgiAll(data);
}

export function saveSilgiSampleProgress(state) {
  const data = loadSilgiAll();
  data.sample = { ...state, updatedAt: Date.now() };
  saveSilgiAll(data);
}

export function clearSilgiRoundProgress(slug) {
  const data = loadSilgiAll();
  delete data.rounds[slug];
  saveSilgiAll(data);
}

export function clearSilgiSubjectProgress(subjectId) {
  const data = loadSilgiAll();
  delete data.subjects[subjectId];
  saveSilgiAll(data);
}

export function clearSilgiSampleProgress() {
  const data = loadSilgiAll();
  data.sample = null;
  saveSilgiAll(data);
}

function completedSilgiState(totalQuestions) {
  return {
    completed: true,
    totalQuestions,
    currentIndex: Math.max(0, totalQuestions - 1),
  };
}

export function completeSilgiRoundProgress(slug, totalQuestions) {
  saveSilgiRoundProgress(slug, completedSilgiState(totalQuestions));
}

export function completeSilgiSubjectProgress(subjectId, totalQuestions) {
  saveSilgiSubjectProgress(subjectId, completedSilgiState(totalQuestions));
}

export function completeSilgiSampleProgress(totalQuestions) {
  saveSilgiSampleProgress(completedSilgiState(totalQuestions));
}
