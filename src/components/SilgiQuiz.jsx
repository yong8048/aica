import { useCallback, useState } from "react";
import RichContent from "./RichContent.jsx";
import { markCorrect, markWrong } from "../utils/quiz.js";
import { silgiRoundLabel } from "../utils/jeongcheogiSilgi.js";

export default function SilgiQuiz({
  heading,
  examTitle,
  questions,
  wrongCount,
  onHome,
  onReviewWrong,
  onMarked,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedMap, setRevealedMap] = useState({});
  const [grades, setGrades] = useState({});
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const q = questions[currentIndex];
  const revealed = Boolean(revealedMap[currentIndex]);
  const grade = grades[currentIndex] ?? null;
  const isLast = currentIndex >= total - 1;
  const progressPct = total ? ((currentIndex + 1) / total) * 100 : 0;

  const handleReveal = useCallback(() => {
    setRevealedMap((prev) => ({ ...prev, [currentIndex]: true }));
  }, [currentIndex]);

  const handleGrade = useCallback(
    (correct) => {
      if (!q || !revealed) return;
      const next = correct ? "correct" : "wrong";
      const prev = grades[currentIndex];
      if (prev === next) return;

      if (correct) markCorrect(q.id);
      else markWrong(q.id);

      setGrades((map) => ({ ...map, [currentIndex]: next }));
      setSessionStats((stats) => {
        if (!prev) {
          return correct
            ? { correct: stats.correct + 1, wrong: stats.wrong }
            : { correct: stats.correct, wrong: stats.wrong + 1 };
        }
        return correct
          ? { correct: stats.correct + 1, wrong: Math.max(0, stats.wrong - 1) }
          : { correct: Math.max(0, stats.correct - 1), wrong: stats.wrong + 1 };
      });
      onMarked();
    },
    [q, revealed, grades, currentIndex, onMarked]
  );

  const goPrev = useCallback(() => {
    setFinished(false);
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    if (!grade) return;
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIndex((index) => Math.min(total - 1, index + 1));
  }, [grade, isLast, total]);

  return (
    <div className="layout">
      <header className="header">
        <div className="brand-row">
          <button type="button" className="back-btn" onClick={onHome} aria-label="메뉴로 돌아가기">
            ←
          </button>
          <h1 className="title">{heading}</h1>
          <span className="title-sep" aria-hidden="true">
            ·
          </span>
          <p className="subtitle" title={examTitle}>
            {examTitle}
          </p>
        </div>
        {!finished && total > 0 && (
          <div className="progress-wrap" aria-label={`진행 ${currentIndex + 1}번째 문제, 전체 ${total}문제`}>
            <div className="progress-inline">
              <div className="progress-bar" aria-hidden>
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="progress-count">
                {currentIndex + 1} / {total}
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="main">
        {finished && (
          <article className="card summary-card">
            <h2 className="summary-title">풀이 완료</h2>
            <p className="summary-score">
              맞음 <strong>{sessionStats.correct}</strong> · 틀림{" "}
              <strong>{sessionStats.wrong}</strong>
            </p>
            <p className="summary-note muted">
              틀렸다고 표시한 문제는 오답으로 저장됩니다. 로그인하면 다른 기기와도 동기화됩니다.
            </p>
            <div className="summary-actions">
              <button type="button" className="btn btn-ghost" onClick={onHome}>
                메뉴로
              </button>
              {wrongCount > 0 && (
                <button type="button" className="btn btn-primary" onClick={onReviewWrong}>
                  틀린 문제 복습 ({wrongCount})
                </button>
              )}
            </div>
          </article>
        )}

        {!finished && q && (
          <article className="card">
            <div className="meta">
              <span className="badge">{q.category || "—"}</span>
              <span className="qnum">
                {q.round ? `${silgiRoundLabel(q.round)} ` : ""}
                문제 {q.number ?? currentIndex + 1}
              </span>
            </div>
            <div className="card-body">
              <h2 className="question">
                <RichContent text={q.question} />
              </h2>
              {[q.image, ...(q.images ?? [])].filter(Boolean).map((src) => (
                <img
                  key={src}
                  className="question-image"
                  src={`${import.meta.env.BASE_URL}${src}`}
                  alt={`문제 ${q.number ?? currentIndex + 1} 첨부`}
                />
              ))}
              {q.passage ? <RichContent text={q.passage} className="passage" /> : null}

              {!revealed ? (
                <button type="button" className="btn btn-primary reveal-answer-btn" onClick={handleReveal}>
                  정답 보기
                </button>
              ) : (
                <section className="silgi-answer" aria-live="polite">
                  <p className="silgi-answer-label">정답</p>
                  <RichContent text={String(q.answer ?? "")} className="silgi-answer-text" />
                  {q.explanation ? (
                    <>
                      <p className="silgi-answer-label">해설</p>
                      <RichContent text={q.explanation} className="explanation" />
                    </>
                  ) : null}
                  <div className="silgi-grade" role="group" aria-label="스스로 채점">
                    <button
                      type="button"
                      className={`silgi-grade-btn ${grade === "correct" ? "is-correct" : ""}`}
                      aria-pressed={grade === "correct"}
                      onClick={() => handleGrade(true)}
                    >
                      맞았어요
                    </button>
                    <button
                      type="button"
                      className={`silgi-grade-btn ${grade === "wrong" ? "is-wrong" : ""}`}
                      aria-pressed={grade === "wrong"}
                      onClick={() => handleGrade(false)}
                    >
                      틀렸어요
                    </button>
                  </div>
                  <p className={`silgi-grade-note ${grade === "correct" ? "ok" : grade === "wrong" ? "no" : ""}`}>
                    {grade === "correct"
                      ? "정답으로 기록했습니다."
                      : grade === "wrong"
                        ? "오답으로 저장했습니다. 다시 맞았다고 바꿀 수 있습니다."
                        : isLast
                          ? "풀어 본 뒤 맞았는지 표시하면 결과를 볼 수 있습니다."
                          : "풀어 본 뒤 맞았는지 표시하면 다음 문제로 넘어갑니다."}
                  </p>
                </section>
              )}
            </div>
          </article>
        )}
      </main>

      {!finished && total > 0 && (
        <footer className="footer">
          <button type="button" className="btn btn-ghost" onClick={goPrev} disabled={currentIndex <= 0}>
            이전
          </button>
          <button type="button" className="btn btn-primary" onClick={goNext} disabled={!grade}>
            {isLast ? "결과 보기" : "다음 문제"}
          </button>
        </footer>
      )}
    </div>
  );
}
