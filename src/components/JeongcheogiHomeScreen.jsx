import { JEONGCHEOGI_ROUNDS, roundLabel } from "../utils/jeongcheogi.js";

function RoundGrid({ roundProgress, onSelect }) {
  return (
    <div className="round-grid" role="list">
      {JEONGCHEOGI_ROUNDS.map((slug) => {
        const progress = roundProgress[slug];
        return (
          <button
            key={slug}
            type="button"
            className={`round-btn${progress ? " has-progress" : ""}`}
            onClick={() => onSelect(slug)}
          >
            <span className="round-btn-label">{roundLabel(slug)}</span>
            {progress && (
              <span className="round-btn-progress">
                {progress.currentIndex + 1}/{progress.totalQuestions}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function JeongcheogiHomeScreen({
  wrongCount,
  fullProgress,
  roundProgress,
  onStartFull,
  onResumeFull,
  onStartRound,
  onResumeRound,
  onStartWrong,
  onClearWrong,
}) {
  const handleRoundSelect = (slug) => {
    const progress = roundProgress[slug];
    if (progress) {
      const label = roundLabel(slug);
      const resume = window.confirm(
        `${label} ${progress.currentIndex + 1}번 문제부터 이어서 풀까요?\n\n취소하면 처음부터 시작합니다.`
      );
      if (resume) {
        onResumeRound(slug);
        return;
      }
    }
    onStartRound(slug);
  };

  return (
    <div className="home">
      <section className="home-section">
        <h2 className="home-heading">전체 연습</h2>
        <p className="home-desc">18회차 통합 1800문제를 순서대로 풀어봅니다.</p>
        {fullProgress ? (
          <div className="home-row">
            <button type="button" className="btn btn-primary home-action" onClick={onResumeFull}>
              이어하기 ({fullProgress.currentIndex + 1}/{fullProgress.totalQuestions})
            </button>
            <button type="button" className="btn btn-ghost home-action" onClick={onStartFull}>
              처음부터 시작
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary home-action" onClick={onStartFull}>
            전체 1800문제 시작
          </button>
        )}
      </section>

      <section className="home-section">
        <h2 className="home-heading">회차별 (100문제)</h2>
        <p className="home-desc">기출 회차를 선택해서 100문제씩 풀어봅니다.</p>
        <RoundGrid roundProgress={roundProgress} onSelect={handleRoundSelect} />
      </section>

      <section className="home-section">
        <h2 className="home-heading">틀린 문제 복습</h2>
        <p className="home-desc">
          {wrongCount > 0
            ? `저장된 오답 ${wrongCount}문제를 다시 풀 수 있습니다.`
            : "아직 저장된 오답이 없습니다. 문제를 풀면 오답이 자동으로 저장됩니다."}
        </p>
        <div className="home-row">
          <button
            type="button"
            className="btn btn-primary home-action"
            onClick={onStartWrong}
            disabled={wrongCount === 0}
          >
            틀린 문제만 풀기{wrongCount > 0 ? ` (${wrongCount})` : ""}
          </button>
          {wrongCount > 0 && (
            <button type="button" className="btn btn-ghost home-clear" onClick={onClearWrong}>
              오답 기록 삭제
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
