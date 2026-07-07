export const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];
export const ROUND_COUNT = 10;

export { clearWrongIds, loadWrongIds, markCorrect, markWrong, WRONG_STORAGE_KEY } from "./wrongAnswers.js";

export function optionLabel(idx) {
  return OPTION_KEYS[idx] ?? String(idx + 1);
}

export function correctIndex(answer) {
  return Number(answer) - 1;
}

export function normalizeAnswerText(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.,·ㆍ\-_/]/g, "");
}

export function isShortAnswerCorrect(input, expectedAnswer) {
  const candidates = String(expectedAnswer ?? "").split(/또는|\/|,/);
  const normalizedInput = normalizeAnswerText(input);
  return candidates.some((candidate) => normalizeAnswerText(candidate) === normalizedInput);
}

export function buildQuestionId(source, raw) {
  const round = raw.round ?? null;
  if (source === "exam-round" && round != null) {
    return `exam-round-${round}-${raw.number}`;
  }
  if (source === "round" && round != null) {
    return `round-${round}-${raw.number}`;
  }
  return `full-${raw.global_question_number ?? raw.number}`;
}

export function questionId(q) {
  if (q.id) return q.id;
  if (q.source === "exam-round" && q.round != null) {
    return `exam-round-${q.round}-${q.number}`;
  }
  if (q.round != null && q.source === "round") {
    return `round-${q.round}-${q.number}`;
  }
  if (q.round != null) return `round-${q.round}-${q.number}`;
  return `full-${q.global_question_number ?? q.number}`;
}

export function normalizeQuestion(raw, source = "full") {
  const round = raw.round ?? null;
  return {
    ...raw,
    options: raw.options ?? raw.choices ?? [],
    round,
    source,
    id: buildQuestionId(source, { ...raw, round }),
  };
}

function baseUrl() {
  return import.meta.env.BASE_URL;
}

async function fetchJson(path) {
  const res = await fetch(`${baseUrl()}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function roundFileName(round) {
  return `aica_round_${String(round).padStart(2, "0")}.json`;
}

export function examRoundFileName(round) {
  return `aica_exam_round_${String(round).padStart(2, "0")}.json`;
}

export async function loadFullExam() {
  const data = await fetchJson("aica.json");
  const list = (data.questions ?? []).map((q) => normalizeQuestion(q, "full"));
  if (!list.length) throw new Error("문항이 없습니다.");
  return {
    title: data.exam?.title ?? "AICA 전체",
    questions: list,
  };
}

export async function loadRound(round) {
  const data = await fetchJson(roundFileName(round));
  const list = (data.questions ?? []).map((q) =>
    normalizeQuestion({ ...q, round: q.round ?? round }, "round")
  );
  if (!list.length) throw new Error("문항이 없습니다.");
  return {
    title: `연습 ${round}회차 (${list.length}문제)`,
    questions: list,
  };
}

export async function loadExamRound(round) {
  const data = await fetchJson(examRoundFileName(round));
  const list = (data.questions ?? []).map((q) =>
    normalizeQuestion({ ...q, round: q.round ?? round }, "exam-round")
  );
  if (!list.length) throw new Error("문항이 없습니다.");
  return {
    title: `통합시험 ${round}회차 (${list.length}문제)`,
    questions: list,
  };
}

import { loadWrongIds } from "./wrongAnswers.js";

export async function loadWrongQuestions() {  const wrongIds = loadWrongIds();
  if (!wrongIds.size) {
    return { title: "틀린 문제 복습", questions: [] };
  }

  const practiceRoundLoads = Array.from({ length: ROUND_COUNT }, (_, i) =>
    fetchJson(roundFileName(i + 1)).catch(() => null)
  );
  const examRoundLoads = Array.from({ length: ROUND_COUNT }, (_, i) =>
    fetchJson(examRoundFileName(i + 1)).catch(() => null)
  );

  const [fullData, ...rest] = await Promise.all([
    fetchJson("aica.json"),
    ...practiceRoundLoads,
    ...examRoundLoads,
  ]);
  const roundDataList = rest.slice(0, ROUND_COUNT);
  const examRoundDataList = rest.slice(ROUND_COUNT);

  const all = [
    ...(fullData.questions ?? []).map((q) => normalizeQuestion(q, "full")),
    ...roundDataList.flatMap((data, i) => {
      if (!data?.questions) return [];
      const round = data.round ?? i + 1;
      return data.questions.map((q) => normalizeQuestion({ ...q, round }, "round"));
    }),
    ...examRoundDataList.flatMap((data, i) => {
      if (!data?.questions) return [];
      const round = data.round ?? i + 1;
      return data.questions.map((q) => normalizeQuestion({ ...q, round }, "exam-round"));
    }),
  ];

  const questions = all.filter((q) => wrongIds.has(q.id));
  return {
    title: `틀린 문제 복습 (${questions.length}문제)`,
    questions,
  };
}
