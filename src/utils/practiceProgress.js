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

function writeAll(data) {
  localStorage.setItem(JEONGCHEOGI_PROGRESS_KEY, JSON.stringify(data));
}

function saveAll(data, options) {
  writeAll(data);
  queuePracticePersist(options);
}

export function getJeongcheogiFullProgress() {
  return visibleEntry(loadAll().full);
}

export function getJeongcheogiRoundProgress(slug) {
  return visibleEntry(loadAll().rounds[slug]);
}

export function getJeongcheogiAllRoundProgress() {
  return visibleMap(loadAll().rounds);
}

export function saveJeongcheogiFullProgress(state) {
  const data = loadAll();
  data.full = stampProgress(data.full, state);
  saveAll(data);
}

export function saveJeongcheogiRoundProgress(slug, state) {
  const data = loadAll();
  data.rounds[slug] = stampProgress(data.rounds[slug], state);
  saveAll(data);
}

export function clearJeongcheogiFullProgress() {
  const data = loadAll();
  data.full = tombstone();
  saveAll(data, { immediate: true });
}

export function clearJeongcheogiRoundProgress(slug) {
  const data = loadAll();
  data.rounds[slug] = tombstone();
  saveAll(data, { immediate: true });
}

export const SILGI_PROGRESS_KEY = "aica-silgi-practice-progress";
const SILGI_PROGRESS_OWNER_KEY = "aica-silgi-progress-owner";
const SILGI_PROGRESS_META_KEY = "aica_silgi_progress";

function emptySilgi() {
  return { rounds: {}, subjects: {}, sample: null };
}

function loadSilgiAll() {
  try {
    const raw = localStorage.getItem(SILGI_PROGRESS_KEY);
    if (!raw) return emptySilgi();
    const parsed = JSON.parse(raw);
    return {
      rounds: parsed.rounds ?? {},
      subjects: parsed.subjects ?? {},
      sample: parsed.sample ?? null,
    };
  } catch {
    return emptySilgi();
  }
}

function writeSilgiAll(data) {
  localStorage.setItem(SILGI_PROGRESS_KEY, JSON.stringify(data));
}

function saveSilgiAll(data, options) {
  writeSilgiAll(data);
  queuePracticePersist(options);
}

function visibleEntry(entry) {
  if (!entry || entry.deleted) return null;
  const reachedIndex = Math.max(Number(entry.currentIndex) || 0, Number(entry.reachedIndex) || 0);
  if (entry.completed) return entry;
  return { ...entry, currentIndex: reachedIndex, reachedIndex };
}

function visibleMap(map) {
  const out = {};
  for (const [key, entry] of Object.entries(map ?? {})) {
    const visible = visibleEntry(entry);
    if (visible) out[key] = visible;
  }
  return out;
}

export function getSilgiAllProgress() {
  const data = loadSilgiAll();
  return {
    rounds: visibleMap(data.rounds),
    subjects: visibleMap(data.subjects),
    sample: visibleEntry(data.sample),
  };
}

export function getSilgiRoundProgress(slug) {
  return visibleEntry(loadSilgiAll().rounds[slug]);
}

export function getSilgiSubjectProgress(subjectId) {
  return visibleEntry(loadSilgiAll().subjects[subjectId]);
}

export function getSilgiSampleProgress() {
  return visibleEntry(loadSilgiAll().sample);
}

export function saveSilgiRoundProgress(slug, state, options) {
  const data = loadSilgiAll();
  data.rounds[slug] = stampProgress(data.rounds[slug], state);
  saveSilgiAll(data, options);
}

export function saveSilgiSubjectProgress(subjectId, state, options) {
  const data = loadSilgiAll();
  data.subjects[subjectId] = stampProgress(data.subjects[subjectId], state);
  saveSilgiAll(data, options);
}

export function saveSilgiSampleProgress(state, options) {
  const data = loadSilgiAll();
  data.sample = stampProgress(data.sample, state);
  saveSilgiAll(data, options);
}

function tombstone() {
  return { deleted: true, updatedAt: Date.now() };
}

function stampProgress(prev, state) {
  const now = Date.now();
  if (prev?.deleted) {
    return {
      ...state,
      updatedAt: now,
      clearedAt: Number(prev.updatedAt) || now,
      reachedIndex: Number(state.currentIndex) || 0,
    };
  }
  const reachedIndex = Math.max(
    Number(prev?.reachedIndex) || 0,
    Number(prev?.currentIndex) || 0,
    Number(state?.reachedIndex) || 0,
    Number(state?.currentIndex) || 0
  );
  const clearedAt = Math.max(Number(prev?.clearedAt) || 0, Number(state?.clearedAt) || 0);
  const next = { ...state, updatedAt: now, reachedIndex };
  if (clearedAt) next.clearedAt = clearedAt;
  return next;
}

export function clearSilgiRoundProgress(slug) {
  const data = loadSilgiAll();
  data.rounds[slug] = tombstone();
  saveSilgiAll(data, { immediate: true });
}

export function clearSilgiSubjectProgress(subjectId) {
  const data = loadSilgiAll();
  data.subjects[subjectId] = tombstone();
  saveSilgiAll(data, { immediate: true });
}

export function clearSilgiSampleProgress() {
  const data = loadSilgiAll();
  data.sample = tombstone();
  saveSilgiAll(data, { immediate: true });
}

function completedSilgiState(totalQuestions) {
  return {
    completed: true,
    totalQuestions,
    currentIndex: Math.max(0, totalQuestions - 1),
  };
}

export function completeSilgiRoundProgress(slug, totalQuestions) {
  saveSilgiRoundProgress(slug, completedSilgiState(totalQuestions), { immediate: true });
}

export function completeSilgiSubjectProgress(subjectId, totalQuestions) {
  saveSilgiSubjectProgress(subjectId, completedSilgiState(totalQuestions), { immediate: true });
}

export function completeSilgiSampleProgress(totalQuestions) {
  saveSilgiSampleProgress(completedSilgiState(totalQuestions), { immediate: true });
}

function entryTime(entry) {
  return Number(entry?.updatedAt) || 0;
}

function richness(entry) {
  if (!entry || entry.deleted) return -1;
  const grades = entry.grades ? Object.keys(entry.grades).length : 0;
  const revealed = entry.revealedMap ? Object.keys(entry.revealedMap).length : 0;
  return (entry.completed ? 1_000_000 : 0) + (Number(entry.currentIndex) || 0) * 1000 + grades + revealed;
}

function progressRank(entry) {
  if (!entry || entry.deleted) return -1;
  if (entry.completed) return 1_000_000 + (Number(entry.totalQuestions) || 0);
  return Math.max(Number(entry.currentIndex) || 0, Number(entry.reachedIndex) || 0);
}

function mergeEntry(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  const aClear = Number(a.clearedAt) || (a.deleted ? entryTime(a) : 0);
  const bClear = Number(b.clearedAt) || (b.deleted ? entryTime(b) : 0);
  if (a.deleted && aClear >= Math.max(entryTime(b), bClear)) return a;
  if (b.deleted && bClear >= Math.max(entryTime(a), aClear)) return b;
  if (a.deleted) return b;
  if (b.deleted) return a;
  if (aClear > entryTime(b) && aClear >= bClear) return a;
  if (bClear > entryTime(a) && bClear >= aClear) return b;

  const winner = progressRank(a) >= progressRank(b) ? a : b;
  const reachedIndex = Math.max(
    Math.max(Number(a.currentIndex) || 0, Number(a.reachedIndex) || 0),
    Math.max(Number(b.currentIndex) || 0, Number(b.reachedIndex) || 0)
  );
  const clearedAt = Math.max(aClear, bClear);
  const next = {
    ...winner,
    updatedAt: Math.max(entryTime(a), entryTime(b)),
    reachedIndex,
  };
  if (!winner.completed) next.currentIndex = reachedIndex;
  if (clearedAt) next.clearedAt = clearedAt;
  const richer = richness(a) >= richness(b) ? a : b;
  if (richer.grades) next.grades = richer.grades;
  if (richer.revealedMap) next.revealedMap = richer.revealedMap;
  if (richer.answers) next.answers = richer.answers;
  if (richer.sessionStats) next.sessionStats = richer.sessionStats;
  return next;
}

function mergeMaps(a = {}, b = {}) {
  const out = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const chosen = mergeEntry(a[key], b[key]);
    if (chosen) out[key] = chosen;
  }
  return out;
}

function mergeSilgi(local, remote) {
  return {
    rounds: mergeMaps(local?.rounds, remote?.rounds),
    subjects: mergeMaps(local?.subjects, remote?.subjects),
    sample: mergeEntry(local?.sample, remote?.sample),
  };
}

function compactStats(stats) {
  if (!stats || typeof stats !== "object") return undefined;
  return {
    correct: Number(stats.correct) || 0,
    wrong: Number(stats.wrong) || 0,
  };
}

function compactEntry(entry) {
  if (!entry) return null;
  if (entry.deleted) return { deleted: true, updatedAt: entryTime(entry) };
  const compact = {
    currentIndex: Number(entry.currentIndex) || 0,
    reachedIndex: Math.max(Number(entry.currentIndex) || 0, Number(entry.reachedIndex) || 0),
    totalQuestions: Number(entry.totalQuestions) || 0,
    updatedAt: entryTime(entry),
  };
  if (entry.completed) compact.completed = true;
  const clearedAt = Number(entry.clearedAt) || 0;
  if (clearedAt) compact.clearedAt = clearedAt;
  const sessionStats = compactStats(entry.sessionStats);
  if (sessionStats) compact.sessionStats = sessionStats;
  return compact;
}

function compactMap(map) {
  const out = {};
  for (const key of Object.keys(map ?? {}).sort()) {
    const compact = compactEntry(map[key]);
    if (compact) out[key] = compact;
  }
  return out;
}

function compactSilgi(data) {
  return {
    rounds: compactMap(data?.rounds),
    subjects: compactMap(data?.subjects),
    sample: compactEntry(data?.sample),
  };
}

function normalizeCloudEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (entry.deleted) return { deleted: true, updatedAt: entryTime(entry) };
  const normalized = {
    currentIndex: Number(entry.currentIndex) || 0,
    reachedIndex: Math.max(Number(entry.currentIndex) || 0, Number(entry.reachedIndex) || 0),
    totalQuestions: Number(entry.totalQuestions) || 0,
    updatedAt: entryTime(entry),
  };
  if (entry.completed) normalized.completed = true;
  const clearedAt = Number(entry.clearedAt) || 0;
  if (clearedAt) normalized.clearedAt = clearedAt;
  const sessionStats = compactStats(entry.sessionStats);
  if (sessionStats) normalized.sessionStats = sessionStats;
  return normalized;
}

function normalizeCloudMap(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  const out = {};
  for (const [key, entry] of Object.entries(map)) {
    const normalized = normalizeCloudEntry(entry);
    if (normalized) out[key] = normalized;
  }
  return out;
}

function normalizeSilgiCloud(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptySilgi();
  return {
    rounds: normalizeCloudMap(raw.rounds),
    subjects: normalizeCloudMap(raw.subjects),
    sample: normalizeCloudEntry(raw.sample),
  };
}

function normalizeJeongCloud(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { full: null, rounds: {} };
  return {
    full: normalizeCloudEntry(raw.full),
    rounds: normalizeCloudMap(raw.rounds),
  };
}

function remotePracticeOf(user) {
  const meta = user?.user_metadata ?? {};
  const bundled = meta.aica_practice;
  const nested = meta.aica_wrong?.practice;
  const legacySilgi = meta[SILGI_PROGRESS_META_KEY];
  return mergePractice(
    mergePractice(normalizePractice(bundled), normalizePractice(nested)),
    { silgi: normalizeSilgiCloud(legacySilgi), jeongcheogi: { full: null, rounds: {} } }
  );
}

function normalizePractice(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { silgi: emptySilgi(), jeongcheogi: { full: null, rounds: {} } };
  }
  return {
    silgi: normalizeSilgiCloud(raw.silgi),
    jeongcheogi: normalizeJeongCloud(raw.jeongcheogi),
  };
}

function readSilgiOwner() {
  try {
    return localStorage.getItem(SILGI_PROGRESS_OWNER_KEY);
  } catch {
    return null;
  }
}

function writeSilgiOwner(userId) {
  try {
    if (userId) localStorage.setItem(SILGI_PROGRESS_OWNER_KEY, userId);
    else localStorage.removeItem(SILGI_PROGRESS_OWNER_KEY);
  } catch {
    /* 저장 실패해도 이번 세션 동기화는 계속한다 */
  }
}

function loadPractice() {
  return { silgi: loadSilgiAll(), jeongcheogi: loadAll() };
}

function mergePractice(local, remote) {
  return {
    silgi: mergeSilgi(local?.silgi, remote?.silgi),
    jeongcheogi: {
      full: mergeEntry(local?.jeongcheogi?.full, remote?.jeongcheogi?.full),
      rounds: mergeMaps(local?.jeongcheogi?.rounds, remote?.jeongcheogi?.rounds),
    },
  };
}

function compactPractice(data) {
  return {
    silgi: compactSilgi(data?.silgi),
    jeongcheogi: {
      full: compactEntry(data?.jeongcheogi?.full),
      rounds: compactMap(data?.jeongcheogi?.rounds),
    },
  };
}

export function applyPracticeSnapshot(user) {
  const remote = remotePracticeOf(user);
  const owner = readSilgiOwner();
  const local = user && owner && owner !== user.id ? { silgi: emptySilgi(), jeongcheogi: { full: null, rounds: {} } } : loadPractice();
  const merged = mergePractice(local, remote);
  writeSilgiAll(merged.silgi);
  writeAll(merged.jeongcheogi);
  if (user?.id) writeSilgiOwner(user.id);
  const practice = compactPractice(merged);
  return {
    practice,
    unchanged: JSON.stringify(practice) === JSON.stringify(compactPractice(remote)),
  };
}

let practicePersistHook = () => {};
let practiceTimer = null;

export function setPracticePersistHook(fn) {
  practicePersistHook = fn;
}

function queuePracticePersist({ immediate = false } = {}) {
  if (practiceTimer) {
    clearTimeout(practiceTimer);
    practiceTimer = null;
  }
  if (immediate) {
    practicePersistHook();
    return;
  }
  practiceTimer = setTimeout(() => {
    practiceTimer = null;
    practicePersistHook();
  }, 800);
}
