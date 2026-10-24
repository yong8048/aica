import { useState } from "react";
import { APPLIED_PARTS } from "../data/appliedSwBasics.js";

export default function AppliedSwStudy({ onBack }) {
  const [partId, setPartId] = useState(APPLIED_PARTS[0].id);
  const part = APPLIED_PARTS.find((item) => item.id === partId) ?? APPLIED_PARTS[0];

  return (
    <div className="layout layout-home">
      <header className="header">
        <div className="brand-row">
          <button type="button" className="back-btn" onClick={onBack} aria-label="실기 메뉴로 돌아가기">
            ←
          </button>
          <h1 className="title">응용 SW 기초 기술</h1>
          <span className="title-sep" aria-hidden="true">
            ·
          </span>
          <p className="subtitle">운영체제 · 네트워크 · 데이터베이스</p>
        </div>
      </header>

      <main className="main main-home">
        <div className="testing-study">
          <div className="lang-lesson-nav" role="tablist" aria-label="응용 SW 기초 기술 파트">
            {APPLIED_PARTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === part.id}
                className={`lang-lesson-btn ${item.id === part.id ? "is-active" : ""}`}
                onClick={() => setPartId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="gof-intro">{part.intro}</p>

          {part.sections.map((section) => (
            <section key={section.title} className="study-callout">
              <h2 className="study-heading">{section.title}</h2>
              <p className="study-lead">{section.lead}</p>
              <div className="study-memory">
                <span>암기</span>
                <p>{section.memory}</p>
              </div>
              <div className="gof-table-wrap applied-table-wrap">
                <table className="gof-table">
                  <thead>
                    <tr>
                      {section.headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, index) =>
                          index === 0 ? (
                            <th key={index} scope="row" className="gof-pattern">
                              {cell}
                            </th>
                          ) : (
                            <td key={index}>{cell}</td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="study-caution">{section.note}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
