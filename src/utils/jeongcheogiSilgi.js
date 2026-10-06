import { loadWrongIds } from "./wrongAnswers.js";

export const ID_PREFIX = "silgi";

export const SILGI_ROUNDS = [{ slug: "2025_03", file: "jeongcheogi_silgi_2025_03.json" }];

const SILGI_FILES = ["jeongcheogi_silgi_sample.json", ...SILGI_ROUNDS.map((round) => round.file)];

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

export function silgiRoundLabel(slug) {
  if (slug === "sample") return "예시";
  const [year, round] = String(slug ?? "").split("_");
  if (!year || !round) return String(slug ?? "");
  return `${year}년 ${Number(round)}회`;
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

async function loadSilgiFile(file, fallbackSlug) {
  const data = await fetchJson(file);
  const slug = data.slug ?? fallbackSlug;
  const list = (data.questions ?? []).map((q) => normalizeSilgiQuestion(q, slug));
  if (!list.length) throw new Error("문항이 없습니다.");
  return { slug, questions: list };
}

export async function loadSilgiSample() {
  const { questions } = await loadSilgiFile("jeongcheogi_silgi_sample.json", "sample");
  return {
    title: `정보처리기사 실기 예시 (${questions.length}문제)`,
    questions,
  };
}

export async function loadSilgiRound(slug) {
  const round = SILGI_ROUNDS.find((item) => item.slug === slug);
  if (!round) throw new Error("회차를 찾을 수 없습니다.");
  const { questions } = await loadSilgiFile(round.file, slug);
  return {
    title: `정보처리기사 실기 ${silgiRoundLabel(slug)} (${questions.length}문제)`,
    questions,
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
