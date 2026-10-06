import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/app.css";
import HomeScreen from "./HomeScreen.jsx";
import JeongcheogiHomeScreen from "./JeongcheogiHomeScreen.jsx";
import SilgiHomeScreen from "./SilgiHomeScreen.jsx";
import SilgiQuiz from "./SilgiQuiz.jsx";
import RichContent from "./RichContent.jsx";
import SyncAuth from "./SyncAuth.jsx";
import {
  clearWrongIdsMatching,
  countAicaWrong,
  loadFullExam,
  loadExamRound,
  loadRound,
  loadWrongQuestions,
  isShortAnswerCorrect,
  markCorrect,
  markWrong,
  optionLabel,
  questionId,
} from "../utils/quiz.js";
import {
  correctIndicesOf,
  countJeongcheogiWrong,
  isSelectionCorrect,
  loadFullJeongcheogiExam,
  loadJeongcheogiRound,
  loadWrongJeongcheogiQuestions,
  roundLabel,
} from "../utils/jeongcheogi.js";
import {
  clearJeongcheogiFullProgress,
  clearJeongcheogiRoundProgress,
  getJeongcheogiAllRoundProgress,
  getJeongcheogiFullProgress,
  getJeongcheogiRoundProgress,
  saveJeongcheogiFullProgress,
  saveJeongcheogiRoundProgress,
} from "../utils/practiceProgress.js";
import {
  countSilgiWrong,
  isSilgiId,
  loadSilgiRound,
  loadSilgiSample,
  loadWrongSilgiQuestions,
} from "../utils/jeongcheogiSilgi.js";

const EXAM_MODES = {
  aica: { key: "aica", label: "AICA" },
  jeongcheogi: { key: "jeongcheogi", label: "정보처리기사" },
  silgi: { key: "silgi", label: "정보처리기사 실기" },
};

function countWrong(mode) {
  if (mode === "jeongcheogi") return countJeongcheogiWrong();
  if (mode === "silgi") return countSilgiWrong();
  return countAicaWrong();
}

function homeTagline(mode) {
  if (mode === "jeongcheogi") return "전체 · 회차별(100문제) · 오답 복습";
  if (mode === "silgi") return "정답 확인 후 스스로 채점 · 오답 복습";
  return "전체 · 통합시험 회차 · 연습 회차 · 오답 복습";
}

const TEST_MODE_KEY = "aica-test-mode";

function readTestModePref() {
  try {
    return localStorage.getItem(TEST_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function isAnswered(question, given) {
  return question?.type === "short_answer"
    ? String(given ?? "").trim().length > 0
    : Number.isInteger(given);
}

function isAnswerCorrect(question, given) {
  if (!isAnswered(question, given)) return false;
  return question.type === "short_answer"
    ? isShortAnswerCorrect(String(given), question.answer)
    : isSelectionCorrect(given, question.answer);
}

function correctAnswerLabel(question) {
  if (question.type === "short_answer") return String(question.answer ?? "");
  return correctIndicesOf(question.answer).map(optionLabel).join(", ");
}

export default function QuizApp() {
  const [examMode, setExamMode] = useState("aica");
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
  const [wrongCount, setWrongCount] = useState(() => countAicaWrong());
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const [testMode, setTestModeState] = useState(readTestModePref);
  const [answers, setAnswers] = useState({});
  const [graded, setGraded] = useState(null);
  const [openResultIndex, setOpenResultIndex] = useState(null);
  const [silgiSession, setSilgiSession] = useState(0);
  const [jeongcheogiProgress, setJeongcheogiProgress] = useState(() => ({
    full: getJeongcheogiFullProgress(),
    rounds: getJeongcheogiAllRoundProgress(),
  }));
  const jeongcheogiSessionRef = useRef(null);

  const refreshJeongcheogiProgress = useCallback(() => {
    setJeongcheogiProgress({
      full: getJeongcheogiFullProgress(),
      rounds: getJeongcheogiAllRoundProgress(),
    });
  }, []);

  const setTestMode = useCallback((value) => {
    setTestModeState(value);
    try {
      localStorage.setItem(TEST_MODE_KEY, value ? "1" : "0");
    } catch {
      /* 저장 실패해도 이번 세션에는 적용된다 */
    }
  }, []);

  const refreshWrongCount = useCallback(
    (mode = examMode) => {
      setWrongCount(countWrong(mode));
    },
    [examMode]
  );

  const handleSwitchMode = useCallback(
    (mode) => {
      if (mode === examMode) return;
      setExamMode(mode);
      setView("home");
      setLoadError(null);
      setFinished(false);
      setQuestions([]);
      setWrongCount(countWrong(mode));
    },
    [examMode]
  );

  const resetQuizState = useCallback(() => {
    setCurrentIndex(0);
    setRevealed(false);
    setSelectedIndex(null);
    setShortAnswerInput("");
    setShortAnswerCorrect(false);
    setSessionStats({ correct: 0, wrong: 0 });
    setFinished(false);
    setAnswers({});
    setGraded(null);
    setOpenResultIndex(null);
  }, []);

  const saveJeongcheogiSessionProgress = useCallback((state) => {
    const session = jeongcheogiSessionRef.current;
    if (!session || session.type === "wrong") return;
    if (session.type === "full") {
      saveJeongcheogiFullProgress(state);
    } else if (session.type === "round" && session.slug) {
      saveJeongcheogiRoundProgress(session.slug, state);
    }
  }, []);

  const clearJeongcheogiSessionProgress = useCallback(() => {
    const session = jeongcheogiSessionRef.current;
    if (!session || session.type === "wrong") return;
    if (session.type === "full") {
      clearJeongcheogiFullProgress();
    } else if (session.type === "round" && session.slug) {
      clearJeongcheogiRoundProgress(session.slug);
    }
  }, []);

  const startJeongcheogiQuiz = useCallback(
    async (loader, sessionType, roundSlug = null, resume = false) => {
      setLoading(true);
      setLoadError(null);
      jeongcheogiSessionRef.current = { type: sessionType, slug: roundSlug };

      if (resume) {
        setRevealed(false);
        setSelectedIndex(null);
        setShortAnswerInput("");
        setShortAnswerCorrect(false);
        setFinished(false);
      } else {
        resetQuizState();
        if (sessionType === "full") {
          clearJeongcheogiFullProgress();
        } else if (sessionType === "round" && roundSlug) {
          clearJeongcheogiRoundProgress(roundSlug);
        }
      }

      try {
        const { title, questions: list } = await loader();
        if (!list.length) {
          setLoadError("풀 수 있는 문제가 없습니다.");
          setQuestions([]);
          setView("home");
          jeongcheogiSessionRef.current = null;
          return;
        }

        const saved =
          resume &&
          (sessionType === "full"
            ? getJeongcheogiFullProgress()
            : roundSlug
              ? getJeongcheogiRoundProgress(roundSlug)
              : null);

        setExamTitle(title);
        setQuestions(list);
        if (saved && saved.currentIndex < list.length) {
          setCurrentIndex(saved.currentIndex);
          setSessionStats(saved.sessionStats ?? { correct: 0, wrong: 0 });
          setAnswers(saved.answers ?? {});
          setGraded(null);
          setOpenResultIndex(null);
          if (typeof saved.testMode === "boolean") setTestMode(saved.testMode);
        } else if (resume) {
          resetQuizState();
        }
        setView("quiz");
      } catch (e) {
        console.error(e);
        setLoadError("문제 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setView("home");
        jeongcheogiSessionRef.current = null;
      } finally {
        setLoading(false);
      }
    },
    [resetQuizState, setTestMode]
  );

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
    if (
      view === "quiz" &&
      examMode === "jeongcheogi" &&
      !finished &&
      questions.length > 0 &&
      jeongcheogiSessionRef.current?.type !== "wrong"
    ) {
      saveJeongcheogiSessionProgress({
        currentIndex,
        sessionStats,
        totalQuestions: questions.length,
        answers,
        testMode,
      });
    }
    jeongcheogiSessionRef.current = null;
    setView("home");
    setLoadError(null);
    setFinished(false);
    resetQuizState();
    setQuestions([]);
    refreshJeongcheogiProgress();
  }, [
    view,
    examMode,
    finished,
    questions.length,
    currentIndex,
    sessionStats,
    answers,
    testMode,
    resetQuizState,
    saveJeongcheogiSessionProgress,
    refreshJeongcheogiProgress,
  ]);

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

  const handleStartJeongcheogiFull = useCallback(
    () => startJeongcheogiQuiz(loadFullJeongcheogiExam, "full"),
    [startJeongcheogiQuiz]
  );
  const handleResumeJeongcheogiFull = useCallback(
    () => startJeongcheogiQuiz(loadFullJeongcheogiExam, "full", null, true),
    [startJeongcheogiQuiz]
  );
  const handleStartJeongcheogiRound = useCallback(
    (slug) => startJeongcheogiQuiz(() => loadJeongcheogiRound(slug), "round", slug),
    [startJeongcheogiQuiz]
  );
  const handleResumeJeongcheogiRound = useCallback(
    (slug) => startJeongcheogiQuiz(() => loadJeongcheogiRound(slug), "round", slug, true),
    [startJeongcheogiQuiz]
  );
  const handleStartJeongcheogiWrong = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    resetQuizState();
    jeongcheogiSessionRef.current = { type: "wrong", slug: null };
    try {
      const result = await loadWrongJeongcheogiQuestions();
      if (!result.questions.length) {
        throw new Error("저장된 오답이 없습니다.");
      }
      setExamTitle(result.title);
      setQuestions(result.questions);
      setView("quiz");
    } catch (e) {
      console.error(e);
      setLoadError(e.message === "저장된 오답이 없습니다." ? e.message : "문제 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setView("home");
      jeongcheogiSessionRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [resetQuizState]);

  const handleStartSilgi = useCallback(() => {
    setSilgiSession((n) => n + 1);
    return startQuiz(loadSilgiSample);
  }, [startQuiz]);

  const handleStartSilgiRound = useCallback(
    (slug) => {
      setSilgiSession((n) => n + 1);
      return startQuiz(() => loadSilgiRound(slug));
    },
    [startQuiz]
  );

  const handleStartSilgiWrong = useCallback(() => {
    setSilgiSession((n) => n + 1);
    return startQuiz(async () => {
      const result = await loadWrongSilgiQuestions();
      if (!result.questions.length) {
        throw new Error("저장된 오답이 없습니다.");
      }
      return result;
    });
  }, [startQuiz]);

  const handleClearWrong = useCallback(async () => {
    if (!window.confirm("저장된 오답 기록을 삭제할까요? (로그인 중이면 클라우드도 삭제됩니다)")) return;
    const isJeongcheogiId = (id) => id.startsWith("jeongcheogi-");
    const predicate =
      examMode === "jeongcheogi"
        ? isJeongcheogiId
        : examMode === "silgi"
          ? isSilgiId
          : (id) => !isJeongcheogiId(id) && !isSilgiId(id);
    await clearWrongIdsMatching(predicate);
    refreshWrongCount();
  }, [refreshWrongCount, examMode]);

  useEffect(() => {
    if (view === "home") {
      refreshWrongCount();
      if (examMode === "jeongcheogi") refreshJeongcheogiProgress();
    }
  }, [view, examMode, refreshWrongCount, refreshJeongcheogiProgress]);

  useEffect(() => {
    if (view !== "quiz" || examMode !== "jeongcheogi" || finished || !questions.length) return;
    if (jeongcheogiSessionRef.current?.type === "wrong") return;
    saveJeongcheogiSessionProgress({
      currentIndex,
      sessionStats,
      totalQuestions: questions.length,
      answers,
      testMode,
    });
  }, [
    view,
    examMode,
    finished,
    questions.length,
    currentIndex,
    sessionStats,
    answers,
    testMode,
    saveJeongcheogiSessionProgress,
  ]);

  const q = questions[currentIndex];
  const total = questions.length;
  const progressPct = total ? ((currentIndex + 1) / total) * 100 : 0;
  const isLast = currentIndex >= total - 1;
  const isShortAnswer = q?.type === "short_answer";
  const answeredCount = questions.reduce(
    (n, question, index) => (isAnswered(question, answers[index]) ? n + 1 : n),
    0
  );

  const handleOption = useCallback(
    (idx) => {
      if (!q) return;

      if (testMode) {
        setAnswers((prev) => ({ ...prev, [currentIndex]: idx }));
        return;
      }

      if (revealed) return;
      setSelectedIndex(idx);
      setRevealed(true);

      const id = questionId(q);
      if (isSelectionCorrect(idx, q.answer)) {
        setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
        markCorrect(id);
      } else {
        setSessionStats((s) => ({ ...s, wrong: s.wrong + 1 }));
        markWrong(id);
      }
      refreshWrongCount();
    },
    [q, revealed, testMode, currentIndex, refreshWrongCount]
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

  // 시험 모드는 마지막에 한 번에 채점하고, 틀린 문항만 오답 목록에 넣는다.
  const gradeExam = useCallback(() => {
    const items = questions.map((question, index) => {
      const given = answers[index];
      return {
        index,
        question,
        given,
        answered: isAnswered(question, given),
        correct: isAnswerCorrect(question, given),
      };
    });

    items.forEach((item) => {
      const id = questionId(item.question);
      if (item.correct) markCorrect(id);
      else markWrong(id);
    });

    const correctCount = items.filter((item) => item.correct).length;
    setGraded({
      items,
      correctCount,
      wrongCount: items.length - correctCount,
      unansweredCount: items.filter((item) => !item.answered).length,
    });
    setSessionStats({ correct: correctCount, wrong: items.length - correctCount });
    setOpenResultIndex(null);
    clearJeongcheogiSessionProgress();
    refreshJeongcheogiProgress();
    refreshWrongCount();
    setFinished(true);
  }, [
    questions,
    answers,
    clearJeongcheogiSessionProgress,
    refreshJeongcheogiProgress,
    refreshWrongCount,
  ]);

  const handleSubmitExam = useCallback(() => {
    const remaining = total - answeredCount;
    if (
      remaining > 0 &&
      !window.confirm(`아직 답하지 않은 문제가 ${remaining}개 있습니다. 지금 제출할까요?`)
    ) {
      return;
    }
    gradeExam();
  }, [total, answeredCount, gradeExam]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setFinished(false);
    if (testMode) return;
    setRevealed(false);
    setSelectedIndex(null);
    setShortAnswerInput("");
    setShortAnswerCorrect(false);
  }, [testMode]);

  const goNext = useCallback(() => {
    if (isLast) {
      if (testMode) {
        handleSubmitExam();
        return;
      }
      clearJeongcheogiSessionProgress();
      refreshJeongcheogiProgress();
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
    if (testMode) return;
    setRevealed(false);
    setSelectedIndex(null);
    setShortAnswerInput("");
    setShortAnswerCorrect(false);
  }, [
    isLast,
    total,
    testMode,
    handleSubmitExam,
    clearJeongcheogiSessionProgress,
    refreshJeongcheogiProgress,
  ]);

  const correctIndices = q && !isShortAnswer ? correctIndicesOf(q.answer) : [];
  const currentAnswer = answers[currentIndex];
  const pickedIndex = testMode ? (Number.isInteger(currentAnswer) ? currentAnswer : null) : selectedIndex;
  const shortAnswerValue = testMode ? String(currentAnswer ?? "") : shortAnswerInput;
  const isCorrect = isShortAnswer
    ? shortAnswerCorrect
    : revealed && selectedIndex != null && correctIndices.includes(selectedIndex);

  const modeTabs = (
    <div className="mode-tabs" role="tablist" aria-label="시험 종류 선택">
      {Object.values(EXAM_MODES).map((mode) => (
        <button
          key={mode.key}
          type="button"
          role="tab"
          aria-selected={examMode === mode.key}
          className={`mode-tab-btn ${examMode === mode.key ? "is-active" : ""}`}
          onClick={() => handleSwitchMode(mode.key)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );

  if (view === "home") {
    return (
      <div className="layout layout-home">
        <header className="header">
          <div className="brand-row">
            <h1 className="title">{EXAM_MODES[examMode].label} 연습</h1>
          </div>
          {modeTabs}
          <p className="home-tagline">{homeTagline(examMode)}</p>
          {examMode !== "silgi" && (
            <label className={`test-mode-toggle ${testMode ? "is-on" : ""}`}>
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
              />
              <span className="test-mode-copy">
                <strong>실전 시험 모드</strong>
                <span className="test-mode-desc">
                  정답을 바로 보지 않고 끝까지 푼 뒤 한 번에 채점합니다. 틀린 문제는 그대로 오답
                  목록에 저장돼요.
                </span>
              </span>
            </label>
          )}
          <SyncAuth onSync={refreshWrongCount} />
        </header>
        <main className="main main-home">
          {loading && <p className="muted center">문제를 불러오는 중…</p>}
          {loadError && !loading && (
            <p className="error" role="alert">
              {loadError}
            </p>
          )}
          {!loading && examMode === "jeongcheogi" && (
            <JeongcheogiHomeScreen
              wrongCount={wrongCount}
              fullProgress={jeongcheogiProgress.full}
              roundProgress={jeongcheogiProgress.rounds}
              onStartFull={handleStartJeongcheogiFull}
              onResumeFull={handleResumeJeongcheogiFull}
              onStartRound={handleStartJeongcheogiRound}
              onResumeRound={handleResumeJeongcheogiRound}
              onStartWrong={handleStartJeongcheogiWrong}
              onClearWrong={handleClearWrong}
            />
          )}
          {!loading && examMode === "silgi" && (
            <SilgiHomeScreen
              wrongCount={wrongCount}
              onStartRound={handleStartSilgiRound}
              onStartSample={handleStartSilgi}
              onStartWrong={handleStartSilgiWrong}
              onClearWrong={handleClearWrong}
            />
          )}
          {!loading && examMode === "aica" && (
            <HomeScreen
              wrongCount={wrongCount}
              onStartFull={handleStartFull}
              onStartExamRound={handleStartExamRound}
              onStartRound={handleStartRound}
              onStartWrong={handleStartWrong}
              onClearWrong={handleClearWrong}
            />
          )}
        </main>
      </div>
    );
  }

  if (view === "quiz" && examMode === "silgi") {
    if (loading || questions.length === 0) {
      return (
        <div className="layout">
          <header className="header">
            <div className="brand-row">
              <button type="button" className="back-btn" onClick={goHome} aria-label="메뉴로 돌아가기">
                ←
              </button>
              <h1 className="title">{EXAM_MODES.silgi.label} 연습</h1>
            </div>
          </header>
          <main className="main">
            {loadError ? (
              <p className="error" role="alert">
                {loadError}
              </p>
            ) : (
              <p className="muted center">문제를 불러오는 중…</p>
            )}
          </main>
        </div>
      );
    }

    return (
      <SilgiQuiz
        key={silgiSession}
        heading={`${EXAM_MODES.silgi.label} 연습`}
        examTitle={examTitle}
        questions={questions}
        wrongCount={wrongCount}
        onHome={goHome}
        onReviewWrong={handleStartSilgiWrong}
        onMarked={() => refreshWrongCount("silgi")}
      />
    );
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="brand-row">
          <button type="button" className="back-btn" onClick={goHome} aria-label="메뉴로 돌아가기">
            ←
          </button>
          <h1 className="title">{EXAM_MODES[examMode].label} 연습</h1>
          <span className="title-sep" aria-hidden="true">
            ·
          </span>
          <p className="subtitle" title={loadError ? undefined : examTitle}>
            {loadError ? "로드 오류" : examTitle}
          </p>
          {testMode && (
            <span className="test-mode-badge" title="실전 시험 모드">
              시험
            </span>
          )}
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
            {testMode && (
              <p className="progress-answered">응답 {answeredCount} / {total}</p>
            )}
          </div>
        )}
      </header>

      <main className="main">
        {loadError && (
          <p className="error" role="alert">
            {loadError}
          </p>
        )}

        {finished && graded && (
          <article className="card exam-result">
            <header className="exam-result-head">
              <h2 className="summary-title">채점 결과</h2>
              <p className="exam-score">
                <strong>{graded.correctCount}</strong>
                <span className="exam-score-total"> / {graded.items.length}</span>
                <span className="exam-score-pct">
                  {Math.round((graded.correctCount / Math.max(1, graded.items.length)) * 100)}%
                </span>
              </p>
              <p className="exam-score-sub muted">
                정답 {graded.correctCount} · 오답 {graded.wrongCount}
                {graded.unansweredCount > 0 ? ` (미응답 ${graded.unansweredCount})` : ""}
              </p>
            </header>

            <div className="exam-wrong-list">
              {graded.wrongCount === 0 ? (
                <p className="muted center">전부 맞혔습니다.</p>
              ) : (
                <>
                  <h3 className="exam-wrong-title">틀린 문제 {graded.wrongCount}개</h3>
                  <ul className="exam-wrong-items" role="list">
                    {graded.items
                      .filter((item) => !item.correct)
                      .map((item) => {
                        const open = openResultIndex === item.index;
                        const answerIndices = correctIndicesOf(item.question.answer);
                        return (
                          <li key={item.index} className="exam-wrong-item">
                            <button
                              type="button"
                              className="exam-wrong-row"
                              onClick={() => setOpenResultIndex(open ? null : item.index)}
                              aria-expanded={open}
                            >
                              <span className="exam-wrong-no">{item.index + 1}번</span>
                              <span className="exam-wrong-ans">
                                내 답{" "}
                                <em className="no">
                                  {item.answered
                                    ? item.question.type === "short_answer"
                                      ? String(item.given)
                                      : optionLabel(item.given)
                                    : "미응답"}
                                </em>{" "}
                                · 정답 <em className="ok">{correctAnswerLabel(item.question)}</em>
                              </span>
                              <span className="exam-wrong-caret" aria-hidden>
                                {open ? "−" : "+"}
                              </span>
                            </button>
                            {open && (
                              <div className="exam-wrong-detail">
                                <RichContent
                                  text={item.question.question}
                                  className="exam-detail-question"
                                />
                                {item.question.type !== "short_answer" && (
                                  <ul className="options" role="list">
                                    {(item.question.options ?? []).map((text, idx) => {
                                      let stateClass = "";
                                      if (answerIndices.includes(idx)) stateClass = "is-correct";
                                      else if (idx === item.given) stateClass = "is-wrong";
                                      return (
                                        <li key={idx} className="option-li">
                                          <div className={`option-btn is-static ${stateClass}`}>
                                            <span className="key" aria-hidden>
                                              {optionLabel(idx)}
                                            </span>
                                            <RichContent
                                              text={String(text)}
                                              className="option-text"
                                            />
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                                <RichContent
                                  text={item.question.explanation || "해설이 없습니다."}
                                  className="explanation"
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </>
              )}
            </div>

            <div className="summary-actions">
              <button type="button" className="btn btn-ghost" onClick={goHome}>
                메뉴로
              </button>
              {wrongCount > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    examMode === "jeongcheogi" ? handleStartJeongcheogiWrong : handleStartWrong
                  }
                >
                  틀린 문제 복습 ({wrongCount})
                </button>
              )}
            </div>
          </article>
        )}

        {finished && !graded && (
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
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={examMode === "jeongcheogi" ? handleStartJeongcheogiWrong : handleStartWrong}
                >
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
                {q.source === "jeongcheogi" && q.round != null
                  ? `${roundLabel(q.round)} `
                  : ""}
                {q.source !== "exam-round" &&
                q.source !== "round" &&
                q.source !== "jeongcheogi" &&
                q.round != null
                  ? `${q.round}회차 `
                  : ""}
                문제 {q.global_question_number ?? q.number ?? currentIndex + 1}
              </span>
            </div>
            <div className="card-body">
              <h2 className="question">
                <RichContent text={q.question} />
              </h2>
              {q.image && (
                <img
                  className="question-image"
                  src={`${import.meta.env.BASE_URL}${q.image}`}
                  alt={`문제 ${q.number} 첨부 이미지`}
                  loading="lazy"
                />
              )}
              {q.passage && <RichContent text={q.passage} className="passage" />}
              {isShortAnswer ? (
                <form
                  className="short-answer-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!testMode) handleShortAnswerSubmit();
                  }}
                >
                  <input
                    type="text"
                    className={`short-answer-input ${
                      revealed ? (isCorrect ? "is-correct" : "is-wrong") : ""
                    }`}
                    value={shortAnswerValue}
                    onChange={(e) => {
                      const { value } = e.target;
                      if (testMode) setAnswers((prev) => ({ ...prev, [currentIndex]: value }));
                      else setShortAnswerInput(value);
                    }}
                    placeholder="정답을 입력하세요"
                    disabled={!testMode && revealed}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="주관식 답안 입력"
                  />
                  {!testMode && (
                    <button
                      type="submit"
                      className="btn btn-primary short-answer-submit"
                      disabled={revealed || !shortAnswerInput.trim()}
                    >
                      제출
                    </button>
                  )}
                </form>
              ) : (
                <ul className="options" role="list">
                  {(q.options ?? []).map((text, idx) => {
                    let stateClass = "";
                    if (testMode) {
                      if (idx === pickedIndex) stateClass = "is-picked";
                    } else if (revealed) {
                      if (correctIndices.includes(idx)) stateClass = "is-correct";
                      else if (idx === selectedIndex) stateClass = "is-wrong";
                    }
                    return (
                      <li key={idx} className="option-li">
                        <button
                          type="button"
                          className={`option-btn ${stateClass}`}
                          onClick={() => handleOption(idx)}
                          disabled={!testMode && revealed}
                          aria-pressed={idx === pickedIndex}
                        >
                          <span className="key" aria-hidden>
                            {optionLabel(idx)}
                          </span>
                          <RichContent text={String(text)} className="option-text" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!testMode && revealed && (
                <section className="result" aria-live="polite">
                  <p className={`result-title ${isCorrect ? "ok" : "no"}`}>
                    {isCorrect ? "정답입니다." : "오답입니다."}
                  </p>
                  {isShortAnswer && !isCorrect && (
                    <p className="correct-answer">정답: {q.answer}</p>
                  )}
                  <RichContent
                    text={q.explanation || "해설이 없습니다."}
                    className="explanation"
                  />
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
          {testMode && !isLast && (
            <button type="button" className="btn btn-ghost btn-submit" onClick={handleSubmitExam}>
              제출
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={goNext}
            disabled={!testMode && !revealed}
          >
            {isLast ? (testMode ? "제출하고 채점" : "결과 보기") : "다음 문제"}
          </button>
        </footer>
      )}
    </div>
  );
}
