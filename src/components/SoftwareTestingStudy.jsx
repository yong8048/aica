const COVERAGE_ROWS = [
  {
    name: "문장",
    en: "Statement",
    target: "실행 가능한 문장",
    rule: "모든 문장을 한 번 이상 실행",
    cases: "(T, T)",
    warning: "결정의 False를 확인하지 않아도 100%가 될 수 있다.",
  },
  {
    name: "결정(분기)",
    en: "Decision / Branch",
    target: "결정 전체의 결과",
    rule: "전체 결과가 True, False를 한 번씩",
    cases: "(T, T), (F, T)",
    warning: "개별 조건 B가 False인 경우는 빠질 수 있다.",
  },
  {
    name: "조건",
    en: "Condition",
    target: "각 원자 조건",
    rule: "A와 B가 각각 True, False를 한 번씩",
    cases: "(T, F), (F, T)",
    warning: "결정은 두 경우 모두 False라서 True 분기가 빠진다.",
  },
  {
    name: "조건/결정",
    en: "Condition / Decision",
    target: "개별 조건 + 결정 전체",
    rule: "조건마다 T/F, 결정도 T/F",
    cases: "(T, T), (T, F), (F, T)",
    warning: "각 조건의 독립적인 영향까지 증명하는 것은 아니다.",
  },
  {
    name: "변경 조건/결정",
    en: "MC/DC",
    target: "각 조건의 독립 영향",
    rule: "다른 조건은 고정하고 하나만 바꿔 결정 결과를 뒤집음",
    cases: "(T, T), (F, T), (T, F)",
    warning: "조건이 n개면 보통 최소 n+1개 테스트를 목표로 한다.",
  },
  {
    name: "다중 조건",
    en: "Multiple Condition",
    target: "모든 조건 조합",
    rule: "가능한 T/F 조합을 전부 검사",
    cases: "(T, T), (T, F), (F, T), (F, F)",
    warning: "조건이 n개면 최대 2ⁿ개라 비용이 빠르게 커진다.",
  },
];

const TRUTH_ROWS = [
  ["T", "T", "T", "결정 True"],
  ["T", "F", "F", "A만 만족"],
  ["F", "T", "F", "B만 만족"],
  ["F", "F", "F", "둘 다 불만족"],
];

const TECHNIQUES = [
  {
    group: "명세 기반 · 블랙박스",
    items: [
      ["동등 분할", "입력 영역을 같은 방식으로 처리될 집단으로 나누고 각 집단의 대표값을 고른다."],
      ["경곗값 분석", "오류가 잦은 경계의 바로 아래·경계·바로 위를 검사한다. 1~100이면 0, 1, 2, 99, 100, 101."],
      ["결정 테이블", "조건 조합과 그에 따른 행동을 표로 만들어 업무 규칙의 누락·충돌을 찾는다."],
      ["상태 전이", "현재 상태, 이벤트, 다음 상태를 기준으로 유효·무효 전이를 검사한다."],
      ["유스케이스", "사용자 시나리오의 기본 흐름과 예외 흐름을 끝까지 검사한다."],
      ["페어와이즈", "모든 조합 대신 적어도 모든 값의 쌍이 한 번씩 나오게 조합 수를 줄인다."],
    ],
  },
  {
    group: "구조 기반 · 화이트박스",
    items: [
      ["커버리지", "코드 내부의 문장·분기·조건을 얼마나 실행했는지 측정한다."],
      ["기초 경로", "제어 흐름 그래프의 독립 경로를 찾는다. 순환 복잡도 V(G)는 독립 경로 수의 기준이다."],
      ["루프 테스트", "0회, 1회, 일반 횟수, 경계 최대 횟수와 그 주변을 검사한다."],
      ["데이터 흐름", "변수의 정의(define)부터 사용(use)까지의 비정상 경로를 찾는다."],
    ],
  },
  {
    group: "경험 기반",
    items: [
      ["오류 추정", "과거 결함과 경험을 바탕으로 비어 있는 값, 0, 중복, 시간 초과처럼 잘 깨지는 곳을 노린다."],
      ["탐색적 테스트", "학습·설계·실행을 동시에 하며 결과에 따라 다음 검사를 조정한다."],
      ["체크리스트", "도메인에서 반복되는 결함 항목을 목록으로 만들어 빠짐없이 확인한다."],
    ],
  },
];

function StudyHeader({ onBack }) {
  return (
    <header className="header">
      <div className="brand-row">
        <button type="button" className="back-btn" onClick={onBack} aria-label="실기 메뉴로 돌아가기">
          ←
        </button>
        <h1 className="title">소프트웨어 테스트 기법</h1>
        <span className="title-sep" aria-hidden="true">
          ·
        </span>
        <p className="subtitle">정보처리기사 실기</p>
      </div>
    </header>
  );
}

export default function SoftwareTestingStudy({ onBack }) {
  return (
    <div className="layout layout-home">
      <StudyHeader onBack={onBack} />

      <main className="main main-home">
        <div className="testing-study">
          <section className="study-callout">
            <strong>이 세 단어만 먼저 구분</strong>
            <div className="term-grid">
              <div>
                <span className="study-chip">문장</span>
                <p>실제로 실행되는 코드 한 줄</p>
              </div>
              <div>
                <span className="study-chip">조건</span>
                <p>A, B처럼 더 나눌 수 없는 원자식</p>
              </div>
              <div>
                <span className="study-chip">결정</span>
                <p>A &amp;&amp; B처럼 분기를 정하는 전체 식</p>
              </div>
            </div>
            <p className="study-note">
              교재에서 <strong>분기 커버리지</strong>는 대개 <strong>결정 커버리지</strong>와 같은
              뜻이다. 즉, 전체 조건식의 True/False 분기를 모두 실행한다.
            </p>
          </section>

          <section>
            <h2 className="study-heading">하나의 예제로 끝내기</h2>
            <div className="study-code" aria-label="커버리지 설명용 코드">
              <span>if (A &amp;&amp; B) &#123;</span>
              <span>　할인 적용;　// 문장</span>
              <span>&#125;</span>
              <span>주문 저장;　　 // 문장</span>
            </div>
            <ul className="study-facts">
              <li>원자 조건은 A와 B, 총 2개다.</li>
              <li>결정은 A &amp;&amp; B 전체, 총 1개다.</li>
              <li>결정이 True면 할인 분기, False면 건너뛰는 분기로 간다.</li>
            </ul>

            <div className="gof-table-wrap">
              <table className="gof-table test-truth-table">
                <thead>
                  <tr>
                    <th>A</th>
                    <th>B</th>
                    <th>A &amp;&amp; B</th>
                    <th>의미</th>
                  </tr>
                </thead>
                <tbody>
                  {TRUTH_ROWS.map((row) => (
                    <tr key={`${row[0]}-${row[1]}`}>
                      {row.map((cell, index) => (
                        <td key={index}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="study-heading">커버리지 비교</h2>
            <p className="study-lead">
              아래 테스트 조합은 위의 <code>A &amp;&amp; B</code> 예제 기준이다.
            </p>
            <div className="coverage-list">
              {COVERAGE_ROWS.map((coverage, index) => (
                <article className="coverage-card" key={coverage.en}>
                  <div className="coverage-title-row">
                    <span className="coverage-order">{index + 1}</span>
                    <h3>
                      {coverage.name}
                      <small>{coverage.en}</small>
                    </h3>
                  </div>
                  <dl className="coverage-detail">
                    <div>
                      <dt>보는 것</dt>
                      <dd>{coverage.target}</dd>
                    </div>
                    <div>
                      <dt>100% 조건</dt>
                      <dd>{coverage.rule}</dd>
                    </div>
                    <div>
                      <dt>예시</dt>
                      <dd>
                        <code>{coverage.cases}</code>
                      </dd>
                    </div>
                  </dl>
                  <p className="coverage-warning">{coverage.warning}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="study-callout">
            <h2 className="study-heading">MC/DC는 이렇게 확인</h2>
            <p className="study-lead">
              조건 하나만 바꿨을 때 결정도 바뀌면, 그 조건이 결과에 독립적으로 영향을 줬다는 뜻이다.
            </p>
            <div className="mcdc-grid">
              <div>
                <strong>A의 영향</strong>
                <code>(T, T) → T</code>
                <code>(F, T) → F</code>
                <p>B=T로 고정하고 A만 변경</p>
              </div>
              <div>
                <strong>B의 영향</strong>
                <code>(T, T) → T</code>
                <code>(T, F) → F</code>
                <p>A=T로 고정하고 B만 변경</p>
              </div>
            </div>
            <p className="study-note">
              그래서 3개 테스트 <code>(T,T), (F,T), (T,F)</code>로 두 조건의 독립 영향을 모두
              보인다. 다중 조건 커버리지는 여기에 <code>(F,F)</code>까지 포함한다.
            </p>
          </section>

          <section>
            <h2 className="study-heading">시험장에서 고르는 순서</h2>
            <ol className="study-steps">
              <li>
                식을 원자 조건으로 쪼갠다. <code>A &amp;&amp; (B || C)</code>면 조건은 3개다.
              </li>
              <li>결정은 괄호를 포함한 전체 식 하나로 본다.</li>
              <li>요구사항이 문장, 조건, 결정, 독립 영향, 모든 조합 중 무엇인지 찾는다.</li>
              <li>진리표를 그리고 필요한 행만 선택한다.</li>
            </ol>
            <div className="study-memory">
              <span>문장</span> 줄을 실행
              <span>조건</span> 낱개 T/F
              <span>결정</span> 전체 T/F
              <span>MC/DC</span> 하나만 바꿔 결과 뒤집기
              <span>다중 조건</span> 모든 조합
            </div>
            <p className="study-caution">
              실제 언어의 <code>&amp;&amp;</code>, <code>||</code>는 단락 평가(short-circuit)를 할 수
              있다. 예를 들어 A가 False면 <code>A &amp;&amp; B</code>에서 B를 아예 실행하지 않는다.
              도구로 조건 실행을 측정할 때는 이 점도 확인한다.
            </p>
          </section>

          <section>
            <h2 className="study-heading">나머지 테스트 기법 지도</h2>
            <div className="technique-groups">
              {TECHNIQUES.map((technique) => (
                <article className="technique-group" key={technique.group}>
                  <h3>{technique.group}</h3>
                  <dl>
                    {technique.items.map(([name, description]) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd>{description}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="study-callout">
            <h2 className="study-heading">자주 섞이는 분류</h2>
            <ul className="study-facts">
              <li>
                <strong>정적 테스트</strong>: 프로그램을 실행하지 않고 리뷰·워크스루·인스펙션이나
                정적 분석으로 결함을 찾는다.
              </li>
              <li>
                <strong>동적 테스트</strong>: 프로그램을 실제 실행한다. 블랙박스와 화이트박스가
                여기에 속한다.
              </li>
              <li>
                <strong>검증(Verification)</strong>: 제품을 올바르게 만들고 있는가?
              </li>
              <li>
                <strong>확인(Validation)</strong>: 사용자가 원하는 올바른 제품을 만들었는가?
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
