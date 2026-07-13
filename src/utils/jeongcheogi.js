import { loadWrongIds } from "./wrongAnswers.js";

export const ID_PREFIX = "jeongcheogi";

export const JEONGCHEOGI_ROUNDS = [
  "2020_02",
  "2020_03",
  "2020_04",
  "2021_01",
  "2021_02",
  "2021_03",
  "2022_01",
  "2022_02",
  "2022_03",
  "2023_01",
  "2023_02",
  "2023_03",
  "2024_01",
  "2024_02",
  "2024_03",
  "2025_01",
  "2025_02",
  "2025_03",
];

export function roundLabel(slug) {
  const [year, round] = slug.split("_");
  return `${year}년 ${Number(round)}회`;
}

function baseUrl() {
  return import.meta.env.BASE_URL;
}

async function fetchJson(path) {
  const res = await fetch(`${baseUrl()}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function jeongcheogiFileName(slug) {
  return `jeongcheogi_${slug}.json`;
}

export function jeongcheogiQuestionId(slug, number) {
  return `${ID_PREFIX}-${slug}-${number}`;
}

export function normalizeJeongcheogiQuestion(raw, slug) {
  return {
    ...raw,
    round: slug,
    source: ID_PREFIX,
    id: jeongcheogiQuestionId(slug, raw.number),
  };
}

export async function loadJeongcheogiRound(slug) {
  const data = await fetchJson(jeongcheogiFileName(slug));
  const list = (data.questions ?? []).map((q) => normalizeJeongcheogiQuestion(q, slug));
  if (!list.length) throw new Error("문항이 없습니다.");
  return {
    title: `정보처리기사 ${roundLabel(slug)} (${list.length}문제)`,
    questions: list,
  };
}

export async function loadAllJeongcheogiQuestions() {
  const results = await Promise.all(
    JEONGCHEOGI_ROUNDS.map((slug) => fetchJson(jeongcheogiFileName(slug)).catch(() => null))
  );
  return results.flatMap((data, i) => {
    if (!data?.questions) return [];
    const slug = JEONGCHEOGI_ROUNDS[i];
    return data.questions.map((q) => normalizeJeongcheogiQuestion(q, slug));
  });
}

export async function loadFullJeongcheogiExam() {
  const list = await loadAllJeongcheogiQuestions();
  if (!list.length) throw new Error("문항이 없습니다.");
  return {
    title: `정보처리기사 전체 (${list.length}문제)`,
    questions: list,
  };
}

function isJeongcheogiId(id) {
  return typeof id === "string" && id.startsWith(`${ID_PREFIX}-`);
}

export function countJeongcheogiWrong() {
  return [...loadWrongIds()].filter(isJeongcheogiId).length;
}

export async function loadWrongJeongcheogiQuestions() {
  const wrongIds = [...loadWrongIds()].filter(isJeongcheogiId);
  if (!wrongIds.length) {
    return { title: "틀린 문제 복습", questions: [] };
  }
  const idSet = new Set(wrongIds);
  const all = await loadAllJeongcheogiQuestions();
  const questions = all.filter((q) => idSet.has(q.id));
  return {
    title: `틀린 문제 복습 (${questions.length}문제)`,
    questions,
  };
}

// 정처기 정답표는 대부분 단일 정답(숫자)이지만, 원본 PDF 정정 표기로
// 복수 정답이 인정되는 문항은 배열([2, 4] 등)로 저장되어 있다.
export function correctIndicesOf(answer) {
  const list = Array.isArray(answer) ? answer : [answer];
  return list.map((a) => Number(a) - 1);
}

export function isSelectionCorrect(selectedIdx, answer) {
  return correctIndicesOf(answer).includes(selectedIdx);
}
