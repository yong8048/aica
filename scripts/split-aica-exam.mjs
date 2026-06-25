import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "public", "aica.json");
const data = JSON.parse(readFileSync(sourcePath, "utf8"));
const questions = data.questions ?? [];

const CIRCLE_MAP = { "①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5, "⑥": 6 };

function parseAnswer(q) {
  if (q.answer != null && q.answer !== "") return Number(q.answer);
  const raw = String(q.correct_answer ?? "").trim();
  if (CIRCLE_MAP[raw]) return CIRCLE_MAP[raw];
  const digit = raw.match(/[1-6]/);
  if (digit) return Number(digit[0]);
  throw new Error(`answer parse failed: ${JSON.stringify(q).slice(0, 120)}`);
}

function toRoundQuestion(q, round, number) {
  const options = q.options ?? q.choices ?? [];
  return {
    round,
    number,
    global_question_number: q.global_question_number ?? (round - 1) * 20 + number,
    category: q.category ?? "—",
    type: options.length >= 5 ? "5choice" : "4choice",
    question: q.question ?? "",
    passage: q.passage ?? "",
    options,
    answer: parseAnswer(q),
    explanation: q.explanation ?? "",
  };
}

const CHUNK = 20;
const roundCount = Math.ceil(questions.length / CHUNK);

for (let round = 1; round <= roundCount; round++) {
  const slice = questions.slice((round - 1) * CHUNK, round * CHUNK);
  const roundQuestions = slice.map((q, i) => toRoundQuestion(q, round, i + 1));
  const out = {
    source: "aica.json",
    exam_title: data.exam?.title ?? "AICA LEVEL 2",
    round,
    total: roundQuestions.length,
    questions: roundQuestions,
  };
  const fileName = `aica_exam_round_${String(round).padStart(2, "0")}.json`;
  const outPath = join(root, "public", fileName);
  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`${fileName}: ${roundQuestions.length}문항`);
}

console.log(`완료: ${roundCount}개 회차 파일 생성 (${questions.length}문항)`);
