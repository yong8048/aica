import { SILGI_ROUNDS, silgiRoundLabel } from "../utils/jeongcheogiSilgi.js";

export default function SilgiHomeScreen({
  wrongCount,
  onStartRound,
  onStartSample,
  onStartWrong,
  onClearWrong,
}) {
  return (
    <div className="home">
      <section className="home-section">
        <h2 className="home-heading">회차</h2>
        <p className="home-desc">
          주관식은 답을 입력하지 않습니다. 문제를 본 뒤 정답을 열고, 맞았는지 직접 표시합니다.
        </p>
        <div className="home-row">
          {SILGI_ROUNDS.map((round) => (
            <button
              key={round.slug}
              type="button"
              className="btn btn-primary home-action"
              onClick={() => onStartRound(round.slug)}
            >
              {silgiRoundLabel(round.slug)} 시작
            </button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-heading">예시 문제</h2>
        <p className="home-desc">동작 확인용 예시 3문제입니다.</p>
        <button type="button" className="btn btn-ghost home-action" onClick={onStartSample}>
          예시 3문제 시작
        </button>
      </section>

      <section className="home-section">
        <h2 className="home-heading">틀린 문제 복습</h2>
        <p className="home-desc">
          {wrongCount > 0
            ? `틀렸다고 표시한 ${wrongCount}문제를 다시 볼 수 있습니다.`
            : "아직 저장된 오답이 없습니다. 틀렸다고 표시하면 여기에 쌓입니다."}
        </p>
        <div className="home-row">
          <button
            type="button"
            className="btn btn-primary home-action"
            onClick={onStartWrong}
            disabled={wrongCount === 0}
          >
            틀린 문제만 보기{wrongCount > 0 ? ` (${wrongCount})` : ""}
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
