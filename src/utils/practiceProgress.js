import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

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

function saveSilgiAll(data, { immediate = false } = {}) {
  writeSilgiAll(data);
  queueSilgiCloudPersist({ immediate });
}

function visibleEntry(entry) {
  if (!entry || entry.deleted) return null;
  return entry;
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
  data.rounds[slug] = { ...state, updatedAt: Date.now() };
  saveSilgiAll(data, options);
}

export function saveSilgiSubjectProgress(subjectId, state, options) {
  const data = loadSilgiAll();
  data.subjects[subjectId] = { ...state, updatedAt: Date.now() };
  saveSilgiAll(data, options);
}

export function saveSilgiSampleProgress(state, options) {
  const data = loadSilgiAll();
  data.sample = { ...state, updatedAt: Date.now() };
  saveSilgiAll(data, options);
}

function tombstone() {
  return { deleted: true, updatedAt: Date.now() };
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

function sameSpot(a, b) {
  return (
    Boolean(a?.completed) === Boolean(b?.completed) &&
    (Number(a?.currentIndex) || 0) === (Number(b?.currentIndex) || 0)
  );
}

function mergeEntry(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  const ta = entryTime(a);
  const tb = entryTime(b);
  const winner = ta === tb ? (richness(a) >= richness(b) ? a : b) : ta > tb ? a : b;
  const loser = winner === a ? b : a;
  if (
    !winner.deleted &&
    !loser.deleted &&
    sameSpot(winner, loser) &&
    richness(loser) > richness(winner)
  ) {
    return {
      ...loser,
      updatedAt: entryTime(winner) || entryTime(loser),
      totalQuestions: Number(winner.totalQuestions) || loser.totalQuestions,
      sessionStats: winner.sessionStats ?? loser.sessionStats,
    };
  }
  return winner;
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
    totalQuestions: Number(entry.totalQuestions) || 0,
    updatedAt: entryTime(entry),
  };
  if (entry.completed) compact.completed = true;
  const sessionStats = compactStats(entry.sessionStats);
  if (sessionStats) compact.sessionStats = sessionStats;
  return compact;
}

function compactMap(map) {
  const out = {};
  for (const [key, entry] of Object.entries(map ?? {})) {
    const compact = compactEntry(entry);
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
    totalQuestions: Number(entry.totalQuestions) || 0,
    updatedAt: entryTime(entry),
  };
  if (entry.completed) normalized.completed = true;
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

function cloudStateOf(user) {
  const raw = user?.user_metadata?.[SILGI_PROGRESS_META_KEY];
  if (!raw || typeof raw !== "object") return emptySilgi();
  return {
    rounds: normalizeCloudMap(raw.rounds),
    subjects: normalizeCloudMap(raw.subjects),
    sample: normalizeCloudEntry(raw.sample),
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

async function getSessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

let silgiPersistTimer = null;
let silgiPersistChain = Promise.resolve();

function enqueueSilgiPersist() {
  silgiPersistChain = silgiPersistChain.then(() => persistSilgiCloud()).catch((err) => {
    console.error("실기 진행 클라우드 저장 실패:", err);
  });
}

function queueSilgiCloudPersist({ immediate = false } = {}) {
  if (silgiPersistTimer) {
    clearTimeout(silgiPersistTimer);
    silgiPersistTimer = null;
  }
  if (immediate) {
    enqueueSilgiPersist();
    return;
  }
  silgiPersistTimer = setTimeout(() => {
    silgiPersistTimer = null;
    enqueueSilgiPersist();
  }, 800);
}

function flushSilgiCloudPersist() {
  if (silgiPersistTimer) {
    clearTimeout(silgiPersistTimer);
    silgiPersistTimer = null;
    enqueueSilgiPersist();
  }
  return silgiPersistChain;
}

async function persistSilgiCloud() {
  if (!isSupabaseConfigured || !supabase) return;
  const user = await getSessionUser();
  if (!user) return;
  const owner = readSilgiOwner();
  if (owner && owner !== user.id) return;

  const merged = mergeSilgi(loadSilgiAll(), cloudStateOf(user));
  writeSilgiAll(merged);
  writeSilgiOwner(user.id);

  const cloud = compactSilgi(merged);
  const remote = compactSilgi(cloudStateOf(user));
  if (JSON.stringify(cloud) === JSON.stringify(remote)) return;

  const { error } = await supabase.auth.updateUser({
    data: { [SILGI_PROGRESS_META_KEY]: cloud },
  });
  if (error) console.error("실기 진행 저장 실패:", error);
}

export async function syncSilgiProgress() {
  if (!isSupabaseConfigured || !supabase) return;
  await flushSilgiCloudPersist();

  const user = await getSessionUser();
  if (!user) return;

  const owner = readSilgiOwner();
  const local = !owner || owner === user.id ? loadSilgiAll() : emptySilgi();
  const remote = cloudStateOf(user);
  const merged = mergeSilgi(local, remote);
  writeSilgiAll(merged);
  writeSilgiOwner(user.id);

  const cloud = compactSilgi(merged);
  if (JSON.stringify(cloud) === JSON.stringify(compactSilgi(remote))) return;

  const { error } = await supabase.auth.updateUser({
    data: { [SILGI_PROGRESS_META_KEY]: cloud },
  });
  if (error) console.error("실기 진행 동기화 실패:", error);
}
