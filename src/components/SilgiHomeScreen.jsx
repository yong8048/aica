import { SILGI_ROUNDS, SILGI_SUBJECTS, silgiRoundLabel } from "../utils/jeongcheogiSilgi.js";

function progressLabel(progress) {
  if (!progress) return null;
  return `${progress.currentIndex + 1}/${progress.totalQuestions}`;
}

function confirmResume(label, progress) {
  return window.confirm(
    `${label} ${progress.currentIndex + 1}번 문제부터 이어서 풀까요?\n\n취소하면 처음부터 시작합니다.`
  );
}

export default function SilgiHomeScreen({
  wrongCount,
  roundProgress,
  subjectProgress,
  sampleProgress,
  onStartRound,
  onResumeRound,
  onStartSubject,
  onResumeSubject,
  onStartSample,
  onResumeSample,
  onStartWrong,
  onClearWrong,
}) {
  const handleSubjectSelect = (subject) => {
    const progress = subjectProgress[subject.id];
    if (progress && confirmResume(subject.label, progress)) {
      onResumeSubject(subject.id);
      return;
    }
    onStartSubject(subject.id);
  };

  const handleRoundSelect = (slug) => {
    const progress = roundProgress[slug];
    if (progress && confirmResume(silgiRoundLabel(slug), progress)) {
      onResumeRound(slug);
      return;
    }
    onStartRound(slug);
  };

  const handleSampleSelect = () => {
    if (sampleProgress && confirmResume("예시", sampleProgress)) {
      onResumeSample();
      return;
    }
    onStartSample();
  };

  return (
    <div className="home">
      <section className="home-section">
        <h2 className="home-heading">과목</h2>
        <p className="home-desc">등록된 회차에서 같은 과목만 모아 풉니다.</p>
        <div className="subject-grid" role="list">
          {SILGI_SUBJECTS.map((subject) => {
            const progress = subjectProgress[subject.id];
            return (
              <button
                key={subject.id}
                type="button"
                className={`round-btn${progress ? " has-progress" : ""}`}
                onClick={() => handleSubjectSelect(subject)}
              >
                <span className="round-btn-label">{subject.label}</span>
                {progress && <span className="round-btn-progress">{progressLabel(progress)}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-heading">회차</h2>
        <p className="home-desc">
          주관식은 답을 입력하지 않습니다. 문제를 본 뒤 정답을 열고, 맞았는지 직접 표시합니다.
        </p>
        <div className="round-grid" role="list">
          {SILGI_ROUNDS.map((round) => {
            const progress = roundProgress[round.slug];
            return (
              <button
                key={round.slug}
                type="button"
                className={`round-btn${progress ? " has-progress" : ""}`}
                onClick={() => handleRoundSelect(round.slug)}
              >
                <span className="round-btn-label">{silgiRoundLabel(round.slug)}</span>
                {progress && <span className="round-btn-progress">{progressLabel(progress)}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-heading">예시 문제</h2>
        <p className="home-desc">동작 확인용 예시 3문제입니다.</p>
        <button type="button" className="btn btn-ghost home-action" onClick={handleSampleSelect}>
          {sampleProgress
            ? `예시 이어하기 (${progressLabel(sampleProgress)})`
            : "예시 3문제 시작"}
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
