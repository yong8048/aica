import { loadWrongIds } from "./wrongAnswers.js";

export const ID_PREFIX = "silgi";

export const SILGI_SUBJECTS = [
  { id: "language", label: "프로그래밍 언어" },
  { id: "database", label: "데이터베이스" },
  { id: "infra", label: "IT 인프라와 시스템" },
  { id: "engineering", label: "소프트웨어 공학" },
];

const CATEGORY_TO_SUBJECT = {
  Java: "language",
  Python: "language",
  C언어: "language",
  SQL: "database",
  데이터베이스: "database",
  네트워크: "infra",
  운영체제: "infra",
  정보보안: "infra",
  정보통신: "infra",
  "소프트웨어 공학": "engineering",
  "소프트웨어 설계": "engineering",
};

// 자동 분류가 '정보처리'로 남은 문항. 문제 내용 기준으로 대과목에 넣는다.
const QUESTION_SUBJECT = {
  "2024_01-20": "engineering",
  "2024_02-7": "infra",
  "2024_02-8": "infra",
  "2024_02-9": "engineering",
  "2025_01-3": "infra",
  "2025_02-20": "database",
  "2026_01-5": "infra",
};

export function silgiSubjectOf(question) {
  const byQuestion = QUESTION_SUBJECT[`${question.round}-${question.number}`];
  if (byQuestion) return byQuestion;
  return CATEGORY_TO_SUBJECT[question.category] ?? "engineering";
}

export const SILGI_ROUNDS = [
  { slug: "2024_01", file: "jeongcheogi_silgi_2024_01.json" },
  { slug: "2024_02", file: "jeongcheogi_silgi_2024_02.json" },
  { slug: "2024_03", file: "jeongcheogi_silgi_2024_03.json" },
  { slug: "2025_01", file: "jeongcheogi_silgi_2025_01.json" },
  { slug: "2025_02", file: "jeongcheogi_silgi_2025_02.json" },
  { slug: "2025_03", file: "jeongcheogi_silgi_2025_03.json" },
  { slug: "2026_01", file: "jeongcheogi_silgi_2026_01.json" },
  { slug: "2026_02", file: "jeongcheogi_silgi_2026_02.json" },
  { slug: "example", file: "jeongcheogi_silgi_example.json" },
  { slug: "example_02", file: "jeongcheogi_silgi_example_02.json" },
  { slug: "example_03", file: "jeongcheogi_silgi_example_03.json" },
  { slug: "example_04", file: "jeongcheogi_silgi_example_04.json" },
];

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
  if (slug === "example") return "예시 1";
  const exampleRound = /^example_(\d+)$/.exec(String(slug ?? ""));
  if (exampleRound) return `예시 ${Number(exampleRound[1])}`;
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

export async function loadSilgiSubject(subjectId) {
  const subject = SILGI_SUBJECTS.find((item) => item.id === subjectId);
  if (!subject) throw new Error("과목을 찾을 수 없습니다.");
  const results = await Promise.all(SILGI_ROUNDS.map((round) => fetchJson(round.file)));
  const questions = results.flatMap((data) =>
    (data.questions ?? [])
      .map((q) => normalizeSilgiQuestion(q, data.slug))
      .filter((q) => silgiSubjectOf(q) === subjectId)
  );
  if (!questions.length) throw new Error("문항이 없습니다.");
  return {
    title: `정보처리기사 실기 ${subject.label} (${questions.length}문제)`,
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
