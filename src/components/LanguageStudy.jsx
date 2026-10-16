import { useState } from "react";
import { LANGUAGE_GUIDES } from "../data/languageConcepts.js";

export default function LanguageStudy({ onBack }) {
  const [langId, setLangId] = useState(LANGUAGE_GUIDES[0].id);
  const lang = LANGUAGE_GUIDES.find((item) => item.id === langId) ?? LANGUAGE_GUIDES[0];

  return (
    <div className="layout layout-home">
      <header className="header">
        <div className="brand-row">
          <button type="button" className="back-btn" onClick={onBack} aria-label="실기 메뉴로 돌아가기">
            ←
          </button>
          <h1 className="title">C · Java · Python</h1>
          <span className="title-sep" aria-hidden="true">
            ·
          </span>
          <p className="subtitle">정보처리기사 실기</p>
        </div>
      </header>

      <main className="main main-home">
        <div className="testing-study">
          <div className="mode-tabs" role="tablist" aria-label="언어 선택">
            {LANGUAGE_GUIDES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === lang.id}
                className={`mode-tab-btn ${item.id === lang.id ? "is-active" : ""}`}
                onClick={() => setLangId(item.id)}
              >
                {item.label}
                <span className="lang-tab-count"> {item.countLabel}</span>
              </button>
            ))}
          </div>

          <p className="gof-intro">{lang.summary}</p>

          <section className="study-callout">
            <h2 className="study-heading">코드를 보기 전에</h2>
            <ol className="study-steps">
              {lang.checks.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="study-heading">알아야 하는 규칙</h2>
            <div className="gof-table-wrap">
              <table className="gof-table">
                <thead>
                  <tr>
                    <th>개념</th>
                    <th>판정</th>
                    <th>나온 회차</th>
                  </tr>
                </thead>
                <tbody>
                  {lang.rows.map(([name, rule, rounds]) => (
                    <tr key={name}>
                      <th scope="row" className="gof-pattern">
                        {name}
                      </th>
                      <td>{rule}</td>
                      <td className="lang-rounds">{rounds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="study-heading">기출로 확인</h2>
            <p className="study-lead">
              같은 규칙은 대표 문제만 코드를 줄였다. 회차는 2024년 1회부터 2026년 2회 복원이다.
            </p>
            <div className="coverage-list">
              {lang.problems.map((problem) => (
                <article key={problem.title} className="coverage-card">
                  <h3 className="lang-problem-title">{problem.title}</h3>
                  <p className="lang-meta">{problem.where}</p>
                  <div className="study-code" aria-label={`${problem.title} 코드`}>
                    {problem.lines.map((line, index) => (
                      <span key={`${problem.title}-${index}`}>{line}</span>
                    ))}
                  </div>
                  <p className="lang-answer">
                    결과 <span>{problem.answer}</span>
                  </p>
                  <p className="coverage-warning">{problem.why}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
