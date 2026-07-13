import { JEONGCHEOGI_ROUNDS, roundLabel } from "../utils/jeongcheogi.js";

function RoundGrid({ onSelect }) {
  return (
    <div className="round-grid" role="list">
      {JEONGCHEOGI_ROUNDS.map((slug) => (
        <button
          key={slug}
          type="button"
          className="round-btn"
          onClick={() => onSelect(slug)}
        >
          {roundLabel(slug)}
        </button>
      ))}
    </div>
  );
}

export default function JeongcheogiHomeScreen({
  wrongCount,
  onStartFull,
  onStartRound,
  onStartWrong,
  onClearWrong,
}) {
  return (
    <div className="home">
      <section className="home-section">
        <h2 className="home-heading">전체 연습</h2>
        <p className="home-desc">18회차 통합 1800문제를 순서대로 풀어봅니다.</p>
        <button type="button" className="btn btn-primary home-action" onClick={onStartFull}>
          전체 1800문제 시작
        </button>
      </section>

      <section className="home-section">
        <h2 className="home-heading">회차별 (100문제)</h2>
        <p className="home-desc">기출 회차를 선택해서 100문제씩 풀어봅니다.</p>
        <RoundGrid onSelect={onStartRound} />
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
