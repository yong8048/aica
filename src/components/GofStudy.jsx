import { GOF_EXAM, GOF_GROUPS, GOF_PAIRS, GOF_PATTERNS } from "../data/gofPatterns.js";

function ExamText({ text }) {
  const parts = text.split("( )");
  return parts.map((part, index) => (
    <span key={index}>
      {index > 0 && <span className="gof-blank">( )</span>}
      {part}
    </span>
  ));
}

function groupSpan(group) {
  return GOF_PATTERNS.filter((pattern) => pattern.group === group).length;
}

export default function GofStudy({ onBack }) {
  return (
    <div className="layout layout-home">
      <header className="header">
        <div className="brand-row">
          <button type="button" className="back-btn" onClick={onBack} aria-label="실기 메뉴로 돌아가기">
            ←
          </button>
          <h1 className="title">GoF 디자인 패턴</h1>
          <span className="title-sep" aria-hidden="true">
            ·
          </span>
          <p className="subtitle">정보처리기사 실기</p>
        </div>
      </header>

      <main className="main main-home">
        <div className="gof">
          <p className="gof-intro">
            실기 문장의 ( )에 들어갈 패턴 이름을 읽는다. 별칭(Kit, Wrapper, Cursor 등)도 빈칸으로 나온다.
          </p>

          <div className="gof-table-wrap">
            <table className="gof-table">
              <thead>
                <tr>
                  <th>분류</th>
                  <th>패턴</th>
                  <th>한 줄</th>
                  <th>이럴 때</th>
                  <th>실기 문장</th>
                </tr>
              </thead>
              <tbody>
                {GOF_PATTERNS.map((pattern, index) => {
                  const prev = GOF_PATTERNS[index - 1];
                  const showGroup = !prev || prev.group !== pattern.group;
                  return (
                    <tr key={pattern.id}>
                      {showGroup && (
                        <th scope="rowgroup" rowSpan={groupSpan(pattern.group)} className="gof-cat">
                          {GOF_GROUPS[pattern.group].label}
                        </th>
                      )}
                      <th scope="row" className="gof-pattern">
                        {pattern.ko}
                        <span className="gof-en">{pattern.en}</span>
                      </th>
                      <td>{pattern.line}</td>
                      <td>{pattern.when}</td>
                      <td className="gof-exam">
                        <ExamText text={GOF_EXAM[pattern.id]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className="gof-heading">헷갈리는 쌍</h2>
          <div className="gof-table-wrap">
            <table className="gof-table">
              <thead>
                <tr>
                  <th>가를 때</th>
                  <th>이쪽</th>
                  <th>저쪽</th>
                </tr>
              </thead>
              <tbody>
                {GOF_PAIRS.map((pair) => (
                  <tr key={pair.ask}>
                    <th scope="row">{pair.ask}</th>
                    <td>
                      <strong>{pair.a[0]}.</strong> {pair.a[1]}
                    </td>
                    <td>
                      <strong>{pair.b[0]}.</strong> {pair.b[1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
