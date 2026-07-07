import { useCallback, useEffect, useState } from "react";
import "../styles/app.css";
import HomeScreen from "./HomeScreen.jsx";
import SyncAuth from "./SyncAuth.jsx";
import {
  clearWrongIds,
  correctIndex,
  loadFullExam,
  loadExamRound,
  loadRound,
  loadWrongIds,
  loadWrongQuestions,
  isShortAnswerCorrect,
  markCorrect,
  markWrong,
  optionLabel,
  questionId,
} from "../utils/quiz.js";

export default function QuizApp() {
  const [view, setView] = useState("home");
  const [examTitle, setExamTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [shortAnswerInput, setShortAnswerInput] = useState("");
  const [shortAnswerCorrect, setShortAnswerCorrect] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wrongCount, setWrongCount] = useState(() => loadWrongIds().size);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  const refreshWrongCount = useCallback(() => {
    setWrongCount(loadWrongIds().size);
  }, []);

  const resetQuizState = useCallback(() => {
    setCurrentIndex(0);
    setRevealed(false);
    setSelectedIndex(null);
    setShortAnswerInput("");
    setShortAnswerCorrect(false);
    setSessionStats({ correct: 0, wrong: 0 });
    setFinished(false);
  }, []);

  const startQuiz = useCallback(
    async (loader) => {
      setLoading(true);
      setLoadError(null);
      resetQuizState();
      try {
        const { title, questions: list } = await loader();
        if (!list.length) {
          setLoadError("풀 수 있는 문제가 없습니다.");
          setQuestions([]);
          setView("home");
          return;
        }
        setExamTitle(title);
        setQuestions(list);
        setView("quiz");
      } catch (e) {
        console.error(e);
        setLoadError("문제 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setView("home");
      } finally {
        setLoading(false);
      }
    },
    [resetQuizState]
  );

  const goHome = useCallback(() => {
    setView("home");
    setLoadError(null);
    setFinished(false);
    resetQuizState();
    setQuestions([]);
  }, [resetQuizState]);

  const handleStartFull = useCallback(() => startQuiz(loadFullExam), [startQuiz]);
  const handleStartExamRound = useCallback(
    (round) => startQuiz(() => loadExamRound(round)),
    [startQuiz]
  );
  const handleStartRound = useCallback((round) => startQuiz(() => loadRound(round)), [startQuiz]);
  const handleStartWrong = useCallback(
    () =>
      startQuiz(async () => {
        const result = await loadWrongQuestions();
        if (!result.questions.length) {
          throw new Error("저장된 오답이 없습니다.");
        }
        return result;
      }),
    [startQuiz]
  );

  const handleClearWrong = useCallback(async () => {
    if (!window.confirm("저장된 모든 오답 기록을 삭제할까요? (로그인 중이면 클라우드도 삭제됩니다)")) return;
    await clearWrongIds();
    refreshWrongCount();
  }, [refreshWrongCount]);

  useEffect(() => {
    if (view === "home") refreshWrongCount();
  }, [view, refreshWrongCount]);

  const q = questions[currentIndex];
  const total = questions.length;
  const progressPct = total ? ((currentIndex + 1) / total) * 100 : 0;
  const isLast = currentIndex >= total - 1;
  const isShortAnswer = q?.type === "short_answer";

  const handleOption = useCallback(
    (idx) => {
      if (revealed || !q) return;
      setSelectedIndex(idx);
      setRevealed(true);

      const correct = correctIndex(q.answer);
      const id = questionId(q);
      if (idx === correct) {
        setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
        markCorrect(id);
        refreshWrongCount();
      } else {
        setSessionStats((s) => ({ ...s, wrong: s.wrong + 1 }));
        markWrong(id);
        refreshWrongCount();
      }
    },
    [q, revealed, refreshWrongCount]
  );

  const handleShortAnswerSubmit = useCallback(() => {
    if (revealed || !q) return;
    const trimmed = shortAnswerInput.trim();
    if (!trimmed) return;

    const correct = isShortAnswerCorrect(trimmed, q.answer);
    setShortAnswerCorrect(correct);
    setRevealed(true);

    const id = questionId(q);
    if (correct) {
      setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
      markCorrect(id);
    } else {
      setSessionStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      markWrong(id);
    }
    refreshWrongCount();
  }, [q, revealed, shortAnswerInput, refreshWrongCount]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setRevealed(false);
    setSelectedIndex(null);
    setShortAnswerInput("");
    setShortAnswerCorrect(false);
    setFinished(false);
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
    setRevealed(false);
    setSelectedIndex(null);
    setShortAnswerInput("");
    setShortAnswerCorrect(false);
  }, [isLast, total]);

  const correct = q && !isShortAnswer ? correctIndex(q.answer) : -1;
  const isCorrect = isShortAnswer ? shortAnswerCorrect : revealed && selectedIndex === correct;

  if (view === "home") {
    return (
      <div className="layout layout-home">
        <header className="header">
          <div className="brand-row">
            <h1 className="title">AICA 연습</h1>
          </div>
          <p className="home-tagline">전체 · 통합시험 회차 · 연습 회차 · 오답 복습</p>
          <SyncAuth onSync={refreshWrongCount} />
        </header>
        <main className="main main-home">
          {loading && <p className="muted center">문제를 불러오는 중…</p>}
          {loadError && !loading && (
            <p className="error" role="alert">
              {loadError}
            </p>
          )}
          {!loading && <HomeScreen
            wrongCount={wrongCount}
            onStartFull={handleStartFull}
            onStartExamRound={handleStartExamRound}
            onStartRound={handleStartRound}
            onStartWrong={handleStartWrong}
            onClearWrong={handleClearWrong}
          />}
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="brand-row">
          <button type="button" className="back-btn" onClick={goHome} aria-label="메뉴로 돌아가기">
            ←
          </button>
          <h1 className="title">AICA 연습</h1>
          <span className="title-sep" aria-hidden="true">
            ·
          </span>
          <p className="subtitle" title={loadError ? undefined : examTitle}>
            {loadError ? "로드 오류" : examTitle}
          </p>
        </div>
        {!loadError && total > 0 && !finished && (
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

        {finished && (
          <article className="card summary-card">
            <h2 className="summary-title">풀이 완료</h2>
            <p className="summary-score">
              정답 <strong>{sessionStats.correct}</strong> · 오답{" "}
              <strong>{sessionStats.wrong}</strong>
            </p>
            <p className="summary-note muted">
              오답은 자동 저장됩니다. 로그인하면 다른 기기와도 동기화됩니다.
            </p>
            <div className="summary-actions">
              <button type="button" className="btn btn-ghost" onClick={goHome}>
                메뉴로
              </button>
              {wrongCount > 0 && (
                <button type="button" className="btn btn-primary" onClick={handleStartWrong}>
                  틀린 문제 복습 ({wrongCount})
                </button>
              )}
            </div>
          </article>
        )}

        {!loadError && !finished && q && (
          <article className="card">
            <div className="meta">
              <span className="badge">{q.category || "—"}</span>
              <span className="qnum">
                {q.source === "exam-round" && q.round != null ? `통합시험 ${q.round}회차 ` : ""}
                {q.source === "round" && q.round != null ? `연습 ${q.round}회차 ` : ""}
                {q.source !== "exam-round" && q.source !== "round" && q.round != null
                  ? `${q.round}회차 `
                  : ""}
                문제 {q.global_question_number ?? q.number ?? currentIndex + 1}
              </span>
            </div>
            <div className="card-body">
              <h2 className="question">{q.question}</h2>
              {q.passage && <p className="passage">{q.passage}</p>}
              {isShortAnswer ? (
                <form
                  className="short-answer-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleShortAnswerSubmit();
                  }}
                >
                  <input
                    type="text"
                    className={`short-answer-input ${
                      revealed ? (isCorrect ? "is-correct" : "is-wrong") : ""
                    }`}
                    value={shortAnswerInput}
                    onChange={(e) => setShortAnswerInput(e.target.value)}
                    placeholder="정답을 입력하세요"
                    disabled={revealed}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="주관식 답안 입력"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary short-answer-submit"
                    disabled={revealed || !shortAnswerInput.trim()}
                  >
                    제출
                  </button>
                </form>
              ) : (
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
              )}
              {revealed && (
                <section className="result" aria-live="polite">
                  <p className={`result-title ${isCorrect ? "ok" : "no"}`}>
                    {isCorrect ? "정답입니다." : "오답입니다."}
                  </p>
                  {isShortAnswer && !isCorrect && (
                    <p className="correct-answer">정답: {q.answer}</p>
                  )}
                  <p className="explanation">{q.explanation || "해설이 없습니다."}</p>
                </section>
              )}
            </div>
          </article>
        )}

        {!loadError && !finished && !q && total === 0 && (
          <p className="muted center">문제를 불러오는 중…</p>
        )}
      </main>

      {!loadError && total > 0 && !finished && (
        <footer className="footer">
          <button type="button" className="btn btn-ghost" onClick={goPrev} disabled={currentIndex <= 0}>
            이전
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={goNext}
            disabled={!revealed}
          >
            {isLast ? "결과 보기" : "다음 문제"}
          </button>
        </footer>
      )}
    </div>
  );
}
