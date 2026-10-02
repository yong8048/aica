import { loadWrongIds } from "./wrongAnswers.js";

export const ID_PREFIX = "silgi";

const SILGI_FILES = ["jeongcheogi_silgi_sample.json"];

function baseUrl() {
  return import.meta.env.BASE_URL;
}

async function fetchJson(path) {
  const res = await fetch(`${baseUrl()}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function silgiQuestionId(slug, number) {
  return `${ID_PREFIX}-${slug}-${number}`;
}

export function isSilgiId(id) {
  return typeof id === "string" && id.startsWith(`${ID_PREFIX}-`);
}

function normalizeSilgiQuestion(raw, slug) {
  return {
    ...raw,
    round: slug,
    source: ID_PREFIX,
    id: silgiQuestionId(slug, raw.number),
  };
}

export async function loadAllSilgiQuestions() {
  const results = await Promise.all(SILGI_FILES.map((file) => fetchJson(file).catch(() => null)));
  return results.flatMap((data) => {
    if (!data?.questions) return [];
    const slug = data.slug ?? "sample";
    return data.questions.map((q) => normalizeSilgiQuestion(q, slug));
  });
}

export async function loadSilgiSample() {
  const list = await loadAllSilgiQuestions();
  if (!list.length) throw new Error("문항이 없습니다.");
  return {
    title: `정보처리기사 실기 예시 (${list.length}문제)`,
    questions: list,
  };
}

export function countSilgiWrong() {
  return [...loadWrongIds()].filter(isSilgiId).length;
}

export async function loadWrongSilgiQuestions() {
  const wrongIds = [...loadWrongIds()].filter(isSilgiId);
  if (!wrongIds.length) {
    return { title: "틀린 문제 복습", questions: [] };
  }
  const idSet = new Set(wrongIds);
  const all = await loadAllSilgiQuestions();
  const questions = all.filter((q) => idSet.has(q.id));
  return {
    title: `틀린 문제 복습 (${questions.length}문제)`,
    questions,
  };
}
