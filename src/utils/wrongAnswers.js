import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

export const WRONG_STORAGE_KEY = "aica-wrong-questions";

export function loadWrongIds() {
  try {
    const raw = localStorage.getItem(WRONG_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveWrongIds(ids) {
  localStorage.setItem(WRONG_STORAGE_KEY, JSON.stringify([...ids]));
}

async function getUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function upsertWrongOnCloud(userId, questionId) {
  if (!supabase) return;
  await supabase.from("wrong_questions").upsert(
    { user_id: userId, question_id: questionId },
    { onConflict: "user_id,question_id" }
  );
}

async function removeWrongOnCloud(userId, questionId) {
  if (!supabase) return;
  await supabase.from("wrong_questions").delete().eq("user_id", userId).eq("question_id", questionId);
}

async function clearWrongOnCloud(userId) {
  if (!supabase) return;
  await supabase.from("wrong_questions").delete().eq("user_id", userId);
}

export async function syncWrongAnswers() {
  if (!isSupabaseConfigured || !supabase) return loadWrongIds().size;

  const userId = await getUserId();
  if (!userId) return loadWrongIds().size;

  const local = loadWrongIds();
  const { data, error } = await supabase
    .from("wrong_questions")
    .select("question_id")
    .eq("user_id", userId);

  if (error) {
    console.error("오답 불러오기 실패:", error);
    return local.size;
  }

  const remote = new Set((data ?? []).map((row) => row.question_id));
  const merged = new Set([...local, ...remote]);
  saveWrongIds(merged);

  const toAdd = [...merged].filter((id) => !remote.has(id));
  const toRemove = [...remote].filter((id) => !merged.has(id));

  if (toAdd.length) {
    const { error: addError } = await supabase.from("wrong_questions").upsert(
      toAdd.map((question_id) => ({ user_id: userId, question_id })),
      { onConflict: "user_id,question_id" }
    );
    if (addError) console.error("오답 업로드 실패:", addError);
  }

  if (toRemove.length) {
    const { error: removeError } = await supabase
      .from("wrong_questions")
      .delete()
      .eq("user_id", userId)
      .in("question_id", toRemove);
    if (removeError) console.error("오답 삭제 실패:", removeError);
  }

  return merged.size;
}

export function markWrong(id) {
  const ids = loadWrongIds();
  ids.add(id);
  saveWrongIds(ids);

  void (async () => {
    const userId = await getUserId();
    if (userId) await upsertWrongOnCloud(userId, id);
  })();

  return ids.size;
}

export function markCorrect(id) {
  const ids = loadWrongIds();
  if (!ids.has(id)) return ids.size;
  ids.delete(id);
  saveWrongIds(ids);

  void (async () => {
    const userId = await getUserId();
    if (userId) await removeWrongOnCloud(userId, id);
  })();

  return ids.size;
}

export async function clearWrongIds() {
  saveWrongIds(new Set());

  const userId = await getUserId();
  if (userId) await clearWrongOnCloud(userId);
}
