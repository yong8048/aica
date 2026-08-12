import { useMemo } from "react";
import { parseContent } from "../utils/questionText.js";

// button/h2 안에서도 쓰이므로 블록 요소 대신 span 을 display:block 으로 사용한다.
export default function RichContent({ text, className = "" }) {
  const segments = useMemo(() => parseContent(text), [text]);
  if (!segments.length) return null;

  return (
    <span className={`rich ${className}`.trim()}>
      {segments.map((segment, i) =>
        segment.type === "code" ? (
          <span key={i} className="code-block" data-lang={segment.lang}>
            {segment.content}
          </span>
        ) : (
          <span key={i} className="rich-text">
            {segment.content}
          </span>
        )
      )}
    </span>
  );
}
