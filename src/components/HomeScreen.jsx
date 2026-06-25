import { ROUND_COUNT } from "../utils/quiz.js";

function RoundGrid({ prefix, onSelect }) {
  return (
    <div className="round-grid" role="list">
      {Array.from({ length: ROUND_COUNT }, (_, i) => {
        const round = i + 1;
        return (
          <button
            key={`${prefix}-${round}`}
            type="button"
            className="round-btn"
            onClick={() => onSelect(round)}
          >
            {round}회차
          </button>
        );
      })}
    </div>
  );
}

export default function HomeScreen({
  wrongCount,
  onStartFull,
  onStartExamRound,
  onStartRound,
  onStartWrong,
  onClearWrong,
}) {
  return (
    <div className="home">
      <section className="home-section">
        <h2 className="home-heading">전체 연습</h2>
        <p className="home-desc">통합 200문제를 순서대로 풀어봅니다.</p>
        <button type="button" className="btn btn-primary home-action" onClick={onStartFull}>
          전체 200문제 시작
        </button>
      </section>

      <section className="home-section">
        <h2 className="home-heading">통합시험 회차별</h2>
        <p className="home-desc">aica.json 통합 200문제를 회차당 20문제씩 풀어봅니다.</p>
        <RoundGrid prefix="exam" onSelect={onStartExamRound} />
      </section>

      <section className="home-section">
        <h2 className="home-heading">연습 회차별</h2>
        <p className="home-desc">추가 연습 문제, 회차당 20문제씩 총 {ROUND_COUNT}회차입니다.</p>
        <RoundGrid prefix="practice" onSelect={onStartRound} />
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
