import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

export const WRONG_STORAGE_KEY = "aica-wrong-questions";
const META_KEY = "aica_wrong";
const TOMBSTONE_MS = 60 * 24 * 60 * 60 * 1000;

function emptyState() {
  return { v: 2, a: {}, d: {} };
}

function pruneState(state) {
  const cutoff = Date.now() - TOMBSTONE_MS;
  const d = {};
  for (const [id, t] of Object.entries(state.d ?? {})) {
    if (Number(t) >= cutoff) d[id] = Number(t);
  }
  const a = {};
  for (const [id, t] of Object.entries(state.a ?? {})) {
    a[id] = Number(t);
  }
  return { v: 2, a, d };
}

function parseState(raw) {
  if (!raw) return emptyState();
  if (Array.isArray(raw)) {
    const now = Date.now();
    const a = {};
    for (const id of raw) {
      if (typeof id === "string" && id) a[id] = now;
    }
    return { v: 2, a, d: {} };
  }
  if (raw && typeof raw === "object") {
    if (raw.v === 2 || raw.a || raw.d) return pruneState(raw);
    if (Array.isArray(raw.ids)) return parseState(raw.ids);
  }
  return emptyState();
}

function loadState() {
  try {
    return parseState(JSON.parse(localStorage.getItem(WRONG_STORAGE_KEY)));
  } catch {
    return emptyState();
  }
}

function saveState(state) {
  localStorage.setItem(WRONG_STORAGE_KEY, JSON.stringify(pruneState(state)));
}

function activeIdsFrom(state) {
  const ids = new Set();
  for (const [id, addedAt] of Object.entries(state.a ?? {})) {
    const deletedAt = state.d?.[id];
    if (!deletedAt || Number(addedAt) > Number(deletedAt)) ids.add(id);
  }
  return ids;
}

export function loadWrongIds() {
  return activeIdsFrom(loadState());
}

export function saveWrongIds(ids) {
  const prev = loadState();
  const now = Date.now();
  const next = { v: 2, a: {}, d: { ...prev.d } };
  const wanted = new Set(ids);

  for (const id of wanted) {
    next.a[id] = prev.a[id] ?? now;
    delete next.d[id];
  }
  for (const id of Object.keys(prev.a)) {
    if (!wanted.has(id)) next.d[id] = now;
  }
  saveState(next);
  queueCloudPersist();
}

function mergeStates(...states) {
  const merged = emptyState();
  for (const state of states) {
    if (!state) continue;
    for (const [id, t] of Object.entries(state.a ?? {})) {
      if (merged.a[id] == null || Number(t) > merged.a[id]) merged.a[id] = Number(t);
    }
    for (const [id, t] of Object.entries(state.d ?? {})) {
      if (merged.d[id] == null || Number(t) > merged.d[id]) merged.d[id] = Number(t);
    }
  }
  for (const id of new Set([...Object.keys(merged.a), ...Object.keys(merged.d)])) {
    if (merged.a[id] != null && merged.d[id] != null) {
      if (merged.a[id] >= merged.d[id]) delete merged.d[id];
      else delete merged.a[id];
    }
  }
  return pruneState(merged);
}

async function getSessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

function metaStateOf(user) {
  return parseState(user?.user_metadata?.[META_KEY]);
}

async function tableStateOf(userId) {
  if (!supabase) return emptyState();
  const { data, error } = await supabase
    .from("wrong_questions")
    .select("question_id")
    .eq("user_id", userId);
  if (error) return emptyState();
  const a = {};
  for (const row of data ?? []) {
    if (row.question_id) a[row.question_id] = 1;
  }
  return { v: 2, a, d: {} };
}

async function writeTable(userId, state) {
  if (!supabase) return;
  const active = [...activeIdsFrom(state)];
  const deleted = Object.keys(state.d ?? {});
  if (active.length) {
    await supabase.from("wrong_questions").upsert(
      active.map((question_id) => ({ user_id: userId, question_id })),
      { onConflict: "user_id,question_id" }
    );
  }
  if (deleted.length) {
    await supabase
      .from("wrong_questions")
      .delete()
      .eq("user_id", userId)
      .in("question_id", deleted);
  }
}

let persistChain = Promise.resolve();

function queueCloudPersist() {
  persistChain = persistChain.then(() => persistCloud(loadState())).catch((err) => {
    console.error("오답 클라우드 저장 실패:", err);
  });
}

async function persistCloud(state) {
  if (!isSupabaseConfigured || !supabase) return;
  const user = await getSessionUser();
  if (!user) return;

  const merged = mergeStates(metaStateOf(user), state);
  saveState(merged);

  const { error: metaError } = await supabase.auth.updateUser({
    data: { [META_KEY]: merged },
  });
  if (metaError) console.error("오답 메타데이터 저장 실패:", metaError);

  try {
    await writeTable(user.id, merged);
  } catch (err) {
    console.error("오답 테이블 저장 실패:", err);
  }
}

export async function syncWrongAnswers() {
  if (!isSupabaseConfigured || !supabase) return loadWrongIds().size;

  const user = await getSessionUser();
  if (!user) return loadWrongIds().size;

  const local = loadState();
  const meta = metaStateOf(user);
  const table = await tableStateOf(user.id);
  const merged = mergeStates(local, meta, table);
  saveState(merged);

  const { error: metaError } = await supabase.auth.updateUser({
    data: { [META_KEY]: merged },
  });
  if (metaError) console.error("오답 동기화 실패:", metaError);

  try {
    await writeTable(user.id, merged);
  } catch (err) {
    console.error("오답 테이블 동기화 실패:", err);
  }

  return activeIdsFrom(merged).size;
}

export function markWrong(id) {
  const state = loadState();
  const now = Date.now();
  state.a[id] = now;
  delete state.d[id];
  saveState(state);
  queueCloudPersist();
  return activeIdsFrom(state).size;
}

export function markCorrect(id) {
  const state = loadState();
  if (!state.a[id] || (state.d[id] && state.d[id] >= state.a[id])) {
    return activeIdsFrom(state).size;
  }
  state.d[id] = Date.now();
  saveState(state);
  queueCloudPersist();
  return activeIdsFrom(state).size;
}

export async function clearWrongIds() {
  saveWrongIds(new Set());
  await persistChain;
}

export async function clearWrongIdsMatching(predicate) {
  const ids = loadWrongIds();
  const remaining = new Set([...ids].filter((id) => !predicate(id)));
  if (remaining.size === ids.size) return;
  saveWrongIds(remaining);
  await persistChain;
}
