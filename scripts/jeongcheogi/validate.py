# -*- coding: utf-8 -*-
"""
extract_pdf.py 로 생성된 정처기 JSON 데이터의 구조/품질을 점검하는 스크립트.

사용법:
    python validate.py [public_folder]

기본 대상 폴더는 ../../public 입니다.
"""
import json
import glob
import os
import re
import sys

FALSE_POSITIVE_HINT = "저작권"  # DRM 관련 문항 등 정상 문항에도 등장하는 단어


def main():
    public_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "public"
    )
    issues = []
    total_q = 0
    for path in sorted(glob.glob(os.path.join(public_dir, "jeongcheogi_*.json"))):
        data = json.load(open(path, encoding="utf-8"))
        slug = data["slug"]
        qs = data["questions"]
        total_q += len(qs)
        if len(qs) != 100:
            issues.append(f"{slug}: 문항수 {len(qs)} (기대 100)")
        nums = sorted(q["number"] for q in qs)
        if nums != list(range(1, 101)):
            issues.append(f"{slug}: 번호 불일치")
        for q in qs:
            if not q["question"] or len(q["question"]) < 5:
                issues.append(f"{slug} Q{q['number']}: 질문 텍스트 비정상 ({q['question'][:30]!r})")
            if len(q["options"]) != 4:
                issues.append(f"{slug} Q{q['number']}: 옵션 개수 {len(q['options'])}")
            for i, opt in enumerate(q["options"]):
                if not opt or len(opt.strip()) == 0:
                    issues.append(f"{slug} Q{q['number']}: 옵션{i+1} 비어있음")
            ans = q["answer"]
            if isinstance(ans, list):
                if not ans or any(a < 1 or a > 4 for a in ans):
                    issues.append(f"{slug} Q{q['number']}: 비정상 복수정답 {ans}")
            else:
                if not (1 <= ans <= 4):
                    issues.append(f"{slug} Q{q['number']}: 비정상 정답 {ans}")
            combined = q["question"] + " " + " ".join(q["options"])
            for pat in [
                r"제\d*과목",
                r"정답\s*및?\s*해설",
                r"저작권",
                r"다음\s*문제를\s*읽고",
                r"\b\d{1,3}\.\s*[①②③④]",
            ]:
                if re.search(pat, combined):
                    note = " (DRM 문항 오탐 가능)" if pat == FALSE_POSITIVE_HINT else ""
                    issues.append(f"{slug} Q{q['number']}: 의심 패턴 '{pat}' 발견{note}")

    print(f"총 문항수: {total_q}")
    print(f"이슈 수: {len(issues)}")
    for i in issues:
        print(f"  - {i}")


if __name__ == "__main__":
    main()
