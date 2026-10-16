import { useState } from "react";
import { LANGUAGE_GUIDES } from "../data/languageConcepts.js";

const SECTIONS = [
  ["summary", "【💡 핵심 요약 및 원리】"],
  ["code", "【🔥 최고 난이도 기출 변형 코드 분석】"],
  ["trace", "【💡 한 줄씩 완벽 쪼개기 / 추적】"],
  ["answer", "【🎯 최종 정답】"],
  ["cheat", "【⚠️ 시험장 생존 요약 치트키】"],
];

export default function LanguageStudy({ onBack }) {
  const [langId, setLangId] = useState(LANGUAGE_GUIDES[0].id);
  const [lessonId, setLessonId] = useState(LANGUAGE_GUIDES[0].lessons[0].id);
  const lang = LANGUAGE_GUIDES.find((item) => item.id === langId) ?? LANGUAGE_GUIDES[0];
  const lesson = lang.lessons.find((item) => item.id === lessonId) ?? lang.lessons[0];

  const selectLang = (id) => {
    const next = LANGUAGE_GUIDES.find((item) => item.id === id);
    setLangId(id);
    setLessonId(next.lessons[0].id);
  };

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
        <div className="testing-study lang-study">
          <div className="mode-tabs" role="tablist" aria-label="언어 선택">
            {LANGUAGE_GUIDES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === lang.id}
                className={`mode-tab-btn ${item.id === lang.id ? "is-active" : ""}`}
                onClick={() => selectLang(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="lang-lesson-nav" role="tablist" aria-label={`${lang.label} 개념`}>
            {lang.lessons.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === lesson.id}
                className={`lang-lesson-btn ${item.id === lesson.id ? "is-active" : ""}`}
                onClick={() => setLessonId(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>

          <article className="lang-lesson">
            <h2 className="study-heading">{lesson.title}</h2>

            <section>
              <h3 className="lang-kicker">{SECTIONS[0][1]}</h3>
              <p className="study-lead">{lesson.summary}</p>
              {lesson.table && (
                <div className="gof-table-wrap">
                  <table className="gof-table">
                    <thead>
                      <tr>
                        {lesson.table.headers.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.table.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, index) =>
                            index === 0 ? (
                              <th key={cell} scope="row" className="gof-pattern">
                                {cell}
                              </th>
                            ) : (
                              <td key={cell}>{cell}</td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="lang-kicker">{SECTIONS[1][1]}</h3>
              <div className="study-code" aria-label={`${lesson.title} 코드`}>
                {lesson.code.map((line, index) => (
                  <span key={`${lesson.id}-${index}`}>{line}</span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="lang-kicker">{SECTIONS[2][1]}</h3>
              <ol className="lang-steps">
                {lesson.steps.map((step) => (
                  <li key={step.n}>
                    <strong>{step.n}</strong>
                    <p>{step.body}</p>
                    {step.trap && <p className="lang-trap">★ {step.trap}</p>}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="lang-kicker">{SECTIONS[3][1]}</h3>
              <pre className="lang-final">{lesson.answer}</pre>
            </section>

            <section>
              <h3 className="lang-kicker">{SECTIONS[4][1]}</h3>
              <ul className="study-facts">
                {lesson.cheats.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
