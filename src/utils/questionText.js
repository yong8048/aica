// 기출 문제 JSON은 PDF에서 추출되어 줄바꿈이 모두 소실된 상태로 저장되어 있다.
// 화면에 그릴 때 코드/SQL 구간을 찾아 다시 줄을 나눠 준다.

const CODE_MIN_LENGTH = 24;
const INDENT = "  ";

const QUOTE_CLOSERS = new Map([
  ['"', '"'],
  ["'", "'"],
  ["\u201C", "\u201D"],
  ["\u2018", "\u2019"],
]);

function quoteEnd(src, i) {
  const closer = QUOTE_CLOSERS.get(src[i]);
  if (!closer) return -1;
  const limit = Math.min(src.length, i + 200);
  for (let j = i + 1; j < limit; j += 1) {
    if (src[j] === "\\") {
      j += 1;
      continue;
    }
    if (src[j] === closer) return j;
  }
  return -1;
}

function nextMeaningful(src, from) {
  let j = from;
  while (j < src.length && /\s/.test(src[j])) j += 1;
  return src[j] ?? "";
}

function renderLines(lines) {
  return lines.map(({ depth, text }) => INDENT.repeat(Math.max(0, depth)) + text).join("\n");
}

/* ---------------------------------- C / Java --------------------------------- */

const BLOCK_HEADER = /(?:^|[\s{};)])(?:for|if|while|switch)\s*\([\s\S]*\)\s*$/;

function formatBraceCode(src) {
  const lines = [];
  let buf = "";
  let depth = 0;
  let paren = 0;
  let dataBrace = 0;
  let pending = 0;

  const flush = (lineDepth = depth) => {
    const text = buf.replace(/\s+/g, " ").trim();
    buf = "";
    if (!text) return false;
    lines.push({ depth: lineDepth, text });
    return true;
  };

  const releasePending = () => {
    while (pending > 0) {
      depth = Math.max(0, depth - 1);
      pending -= 1;
    }
  };

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (QUOTE_CLOSERS.has(ch)) {
      const end = quoteEnd(src, i);
      if (end > 0) {
        buf += src.slice(i, end + 1);
        i = end;
        continue;
      }
    }

    if (ch === "\n") {
      flush();
      continue;
    }

    if (ch === "#") {
      const directive = /^#\s*(?:include\s*(?:<[^>\n]*>|"[^"\n]*")|(?:define|undef|pragma)\s+[^\n#]*?(?=\s+(?:#|int\b|char\b|void\b|float\b|double\b|long\b|short\b|unsigned\b|struct\b|typedef\b|main\b)|$))/.exec(
        src.slice(i)
      );
      if (directive) {
        flush();
        buf = directive[0];
        flush();
        i += directive[0].length - 1;
        continue;
      }
    }

    if (ch === "(") {
      paren += 1;
      buf += ch;
      continue;
    }

    if (ch === ")") {
      paren = Math.max(0, paren - 1);
      buf += ch;
      if (paren === 0 && BLOCK_HEADER.test(buf)) {
        const next = nextMeaningful(src, i + 1);
        if (next && next !== "{" && next !== ";") {
          flush();
          depth += 1;
          pending += 1;
        }
      }
      continue;
    }

    if (ch === "{") {
      // 배열 초기화 `= { 1, 2 }` 처럼 데이터로 쓰인 중괄호는 블록으로 취급하지 않는다.
      if (dataBrace > 0 || /[=,(]\s*$/.test(buf)) {
        dataBrace += 1;
        buf += ch;
        continue;
      }
      buf += ch;
      flush();
      depth += 1;
      continue;
    }

    if (ch === "}") {
      if (dataBrace > 0) {
        dataBrace -= 1;
        buf += ch;
        continue;
      }
      flush();
      depth = Math.max(0, depth - 1);
      buf = "}";
      flush();
      releasePending();
      continue;
    }

    if (ch === ";" && paren === 0 && dataBrace === 0) {
      if (!buf.trim() && lines.length) {
        lines[lines.length - 1].text += ";";
        continue;
      }
      buf += ch;
      flush();
      releasePending();
      continue;
    }

    buf += ch;

    if (
      paren === 0 &&
      dataBrace === 0 &&
      /(?:^|[\s};)])else$/.test(buf) &&
      /\s/.test(src[i + 1] ?? " ")
    ) {
      const rest = src.slice(i + 1).trimStart();
      if (rest && !rest.startsWith("{") && !/^if\b/.test(rest)) {
        flush();
        depth += 1;
        pending += 1;
      }
    }
  }

  flush();
  return renderLines(lines);
}

/* ----------------------------------- Python ---------------------------------- */

const PY_STATEMENT = /^(?:def|class|for|while|if|elif|else|return|print|import|from|break|continue|pass|try|except|finally|with|raise|del|global|assert|yield)\b/;
const PY_ASSIGN = /^[A-Za-z_]\w*(?:\s*\.\s*[A-Za-z_]\w*)*(?:\s*\[[^\]\n]*\])?(?:\s*,\s*[A-Za-z_]\w*)*\s*(?:\+|-|\*\*|\*|\/\/|\/|%)?=(?!=)/;
const PY_METHOD_CALL = /^[A-Za-z_]\w*(?:\s*\.\s*[A-Za-z_]\w*)+\s*\(/;
const PY_BLOCK_KEYWORDS = [
  "def",
  "class",
  "for",
  "while",
  "if",
  "elif",
  "else",
  "try",
  "except",
  "finally",
  "with",
  "return",
];

function splitPythonStatements(src) {
  const out = [];
  let buf = "";
  let bracket = 0;

  const push = () => {
    const text = buf.replace(/\s+/g, " ").trim();
    buf = "";
    if (text) out.push(text);
  };

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (QUOTE_CLOSERS.has(ch)) {
      const end = quoteEnd(src, i);
      if (end > 0) {
        buf += src.slice(i, end + 1);
        i = end;
        continue;
      }
    }

    if (ch === "\n" || ch === ";") {
      push();
      continue;
    }

    if (ch === "(" || ch === "[" || ch === "{") {
      bracket += 1;
      buf += ch;
      continue;
    }

    if (ch === ")" || ch === "]" || ch === "}") {
      bracket = Math.max(0, bracket - 1);
      buf += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      buf += " ";
      continue;
    }

    if (bracket === 0 && buf.trim() && /\s$/.test(buf)) {
      const rest = src.slice(i);
      if (/:\s*$/.test(buf)) {
        push();
      } else if (!/[,+\-*/%=<>&|([{]\s*$/.test(buf)) {
        const startsCall = /[)\]'"\u2019\u201D]\s*$/.test(buf) && PY_METHOD_CALL.test(rest);
        if (PY_STATEMENT.test(rest) || PY_ASSIGN.test(rest) || startsCall) push();
      }
    }

    buf += ch;
  }

  push();
  return out;
}

// 파이썬은 들여쓰기 자체가 문법이지만 원본에 남아 있지 않으므로,
// `:` 로 끝나는 헤더와 형제 def/else 관계만으로 최대한 근사한다.
function formatPythonCode(src) {
  const stack = [];
  const lines = [];
  let prevKind = null;

  for (const text of splitPythonStatements(src)) {
    const first = (/^([A-Za-z_]\w*)/.exec(text) ?? [])[1] ?? "";
    const kind = PY_BLOCK_KEYWORDS.includes(first) ? first : "stmt";

    if (kind === "elif" || kind === "else" || kind === "except" || kind === "finally") {
      stack.pop();
    } else if (kind === "class") {
      stack.length = 0;
    } else if (kind === "def") {
      while (stack.length && stack[stack.length - 1] !== "class") stack.pop();
    } else if (kind === "stmt" && prevKind === "return") {
      stack.length = 0;
    }

    lines.push({ depth: stack.length, text });

    if (/:\s*$/.test(text)) {
      stack.push(kind);
    } else if (kind === "return") {
      while (stack.length && stack[stack.length - 1] !== "def") stack.pop();
      stack.pop();
    }

    prevKind = kind;
  }

  return renderLines(lines);
}

/* ------------------------------------ SQL ------------------------------------ */

const SQL_BREAK = /^(?:SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|CREATE\s+(?:TABLE|VIEW|INDEX)|ALTER\s+TABLE|DROP\s+TABLE|UNION(?:\s+ALL)?|(?:INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN|JOIN|ON|GRANT|REVOKE)\b/i;

function formatSqlCode(src) {
  const lines = [];
  let buf = "";
  let bracket = 0;

  const push = () => {
    const text = buf.replace(/\s+/g, " ").trim();
    buf = "";
    if (text) lines.push({ depth: 0, text });
  };

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (QUOTE_CLOSERS.has(ch)) {
      const end = quoteEnd(src, i);
      if (end > 0) {
        buf += src.slice(i, end + 1);
        i = end;
        continue;
      }
    }

    if (ch === "(") {
      bracket += 1;
      buf += ch;
      continue;
    }

    if (ch === ")") {
      bracket = Math.max(0, bracket - 1);
      buf += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      buf += " ";
      continue;
    }

    if (ch === ";" && bracket === 0) {
      buf += ch;
      push();
      continue;
    }

    if (bracket === 0 && buf.trim() && /\s$/.test(buf) && SQL_BREAK.test(src.slice(i))) push();

    buf += ch;
  }

  push();
  return renderLines(lines);
}

/* ---------------------------------- 감지 로직 --------------------------------- */

const JAVA_START = /(?:(?:public|final|abstract)\s+)*class\s+\w+[^{;:]{0,40}\{|public\s+static\s+void\s+main\s*\(/;
const C_START = /#\s*include\s*[<"]|\b(?:int|void|char|float|double)\s+main\s*\(|\bmain\s*\(\s*(?:void)?\s*\)\s*\{|\bstruct\s+\w+\s*\{/;
const SQL_START = /\b(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+(?:TABLE|VIEW|INDEX)|ALTER\s+TABLE|GRANT\s+\w+)\b/i;
const SQL_TABLE_LABEL = /\s\[[^[\]]{1,24}\]|\(아래 이미지/;
const PY_START = /(?:^|[\s>])(?:import\s+\w|from\s+\w+\s+import|def\s+\w+\s*\(|class\s+\w+\s*:|print\s*\(|while\s*\(?\s*(?:True|\w+\s*[<>=!])|for\s+\w+\s+in\s|[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*\s*=\s*(?:input|map|range|\[|\{|['"\u2018\u201C\d]))/;
const PY_HINT = /파이썬|python/i;

// 프롬프트에 남아 있는 파이썬 셸 표시(`>>`, `>>>`)는 코드 쪽으로 넘긴다.
function pullPromptMarker(text, start) {
  const lead = /[>\s]+$/.exec(text.slice(0, start));
  if (!lead || !lead[0].includes(">")) return start;
  return start - lead[0].length;
}

function detectSql(text) {
  const match = SQL_START.exec(text);
  if (!match) return null;

  const tail = text.slice(match.index);
  // "SELECT 문에 대한 설명으로 옳은 것은?" 같은 산문을 코드로 오인하지 않도록 검증한다.
  const isStatement = /^SELECT$/i.test(match[0])
    ? /\bFROM\b/i.test(tail.slice(0, 300))
    : tail.includes(";");
  if (!isStatement) return null;

  let start = match.index;
  const lead = /\(\s*$/.exec(text.slice(0, start));
  if (lead) start -= lead[0].length;

  let end;
  const semi = text.indexOf(";", match.index);
  if (semi >= 0) {
    end = semi + 1;
    // `ⓐ SELECT ...; ⓑ SELECT ...;` 처럼 문장이 연달아 나오면 함께 묶는다.
    for (;;) {
      const next = SQL_START.exec(text.slice(end, end + 40));
      if (!next || next.index > 6) break;
      const nextSemi = text.indexOf(";", end + next.index);
      if (nextSemi < 0) break;
      end = nextSemi + 1;
    }
  } else {
    const stop = tail.search(SQL_TABLE_LABEL);
    end = stop > 0 ? match.index + stop : text.length;
  }

  return { lang: "sql", start, end };
}

function detectCode(text) {
  const java = JAVA_START.exec(text);
  if (java) {
    const end = text.lastIndexOf("}");
    if (end > java.index) return { lang: "java", start: java.index, end: end + 1 };
  }

  const c = C_START.exec(text);
  if (c) {
    const end = text.lastIndexOf("}");
    return { lang: "c", start: c.index, end: end > c.index ? end + 1 : text.length };
  }

  if (PY_HINT.test(text)) {
    const py = PY_START.exec(text);
    if (py) {
      const start = py.index + (/^[\s>]/.test(py[0]) ? 1 : 0);
      return { lang: "python", start: pullPromptMarker(text, start), end: text.length };
    }
  }

  return detectSql(text);
}

function formatCode(code, lang) {
  if (lang === "python") return formatPythonCode(code);
  if (lang === "sql") return formatSqlCode(code);
  return formatBraceCode(code);
}

/* ---------------------------------- 산문 정리 --------------------------------- */

const LABEL_BREAK = /(^|[^\w가-힣])(\[[^[\]]{1,24}\])/g;

function decorateProse(text) {
  return text
    .replace(LABEL_BREAK, (match, before, label) => {
      const inner = label.slice(1, -1).trim();
      const isLabel = /[가-힣]/.test(inner) || /^[A-Za-z][\w ]{0,8}$/.test(inner);
      return isLabel ? `${before}\n${label}` : match;
    })
    .replace(/\s*(\(아래 이미지[^)]*\))/g, "\n$1")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

/**
 * 문제/보기/해설 텍스트를 텍스트 · 코드 세그먼트 배열로 변환한다.
 * @returns {Array<{type: "text" | "code", lang?: string, content: string}>}
 */
export function parseContent(raw) {
  const text = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00a0]+/g, " ");

  if (!text.trim()) return [];
  if (text.includes("\n")) return [{ type: "text", content: text.trim() }];

  const found = detectCode(text);
  if (!found) return [{ type: "text", content: decorateProse(text) }];

  const code = text.slice(found.start, found.end).trim();
  if (code.length < CODE_MIN_LENGTH) return [{ type: "text", content: decorateProse(text) }];

  const before = text.slice(0, found.start).trim();
  const after = text.slice(found.end).trim();
  const segments = [];

  if (before) segments.push({ type: "text", content: decorateProse(before) });
  segments.push({ type: "code", lang: found.lang, content: formatCode(code, found.lang) });
  if (after) segments.push({ type: "text", content: decorateProse(after) });

  return segments;
}
