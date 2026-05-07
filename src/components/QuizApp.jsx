import { useCallback, useEffect, useState } from "react";
import "../styles/app.css";
import { correctIndex, optionLabel } from "../utils/quiz.js";

export default function QuizApp() {
  const [examTitle, setExamTitle] = useState("불러오는 중…");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}aica.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data.questions ?? [];
        if (!list.length) throw new Error("문항이 없습니다.");
        if (!cancelled) {
          setQuestions(list);
          setExamTitle(data.exam?.title ?? "AICA");
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setLoadError("문제 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setQuestions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = questions[currentIndex];
  const total = questions.length;
  const progressPct = total ? ((currentIndex + 1) / total) * 100 : 0;

  const handleOption = useCallback(
    (idx) => {
      if (revealed || !q) return;
      setSelectedIndex(idx);
      setRevealed(true);
    },
    [q, revealed]
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setRevealed(false);
    setSelectedIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
    setRevealed(false);
    setSelectedIndex(null);
  }, [total]);

  const correct = q ? correctIndex(q.answer) : -1;
  const isCorrect = revealed && selectedIndex === correct;

  return (
    <div className="layout">
      <header className="header">
        <div className="brand-row">
          <h1 className="title">AICA 연습</h1>
          <span className="title-sep" aria-hidden="true">
            ·
          </span>
          <p className="subtitle" title={loadError ? undefined : examTitle}>
            {loadError ? "로드 오류" : examTitle}
          </p>
        </div>
        {!loadError && total > 0 && (
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
        {loadError && (
          <p className="error" role="alert">
            {loadError}
          </p>
        )}

        {!loadError && q && (
          <article className="card">
            <div className="meta">
              <span className="badge">{q.category || "—"}</span>
              <span className="qnum">
                문제 {q.global_question_number ?? q.number ?? currentIndex + 1}
              </span>
            </div>
            <div className="card-body">
              <h2 className="question">{q.question}</h2>
              <ul className="options" role="list">
                {(q.options ?? []).map((text, idx) => {
                  let stateClass = "";
                  if (revealed) {
                    if (idx === correct) stateClass = "is-correct";
                    else if (idx === selectedIndex) stateClass = "is-wrong";
                  }
                  return (
                    <li key={idx} className="option-li">
                      <button
                        type="button"
                        className={`option-btn ${stateClass}`}
                        onClick={() => handleOption(idx)}
                        disabled={revealed}
                        aria-pressed={revealed && idx === selectedIndex}
                      >
                        <span className="key" aria-hidden>
                          {optionLabel(idx)}
                        </span>
                        <span className="option-text">{text}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {revealed && (
                <section className="result" aria-live="polite">
                  <p className={`result-title ${isCorrect ? "ok" : "no"}`}>
                    {isCorrect ? "정답입니다." : "오답입니다."}
                  </p>
                  <p className="explanation">{q.explanation || "해설이 없습니다."}</p>
                </section>
              )}
            </div>
          </article>
        )}

        {!loadError && !q && total === 0 && (
          <p className="muted center">문제를 불러오는 중…</p>
        )}
      </main>

      {!loadError && total > 0 && (
        <footer className="footer">
          <button type="button" className="btn btn-ghost" onClick={goPrev} disabled={currentIndex <= 0}>
            이전
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={goNext}
            disabled={currentIndex >= total - 1}
          >
            다음 문제
          </button>
        </footer>
      )}
    </div>
  );
}
