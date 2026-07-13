# -*- coding: utf-8 -*-
"""
정보처리기사 필기 기출문제 PDF -> JSON 변환 스크립트

사용법:
    python extract_pdf.py "C:\\Users\\User\\Downloads\\정처기" "D:\\test\\aica\\public\\jeongcheogi"

각 PDF(회차)마다 100문항을 파싱하여
  jeongcheogi_<slug>.json
파일과, 문항에 포함된 다이어그램/그림이 있으면
  images/jeongcheogi/<slug>_qNN.png
파일을 생성합니다.
"""
import sys
import os
import re
import json
import unicodedata
from collections import defaultdict

import fitz  # PyMuPDF

CIRCLE_DIGITS = "①②③④⑤⑥"
CIRCLE_MAP = {c: i + 1 for i, c in enumerate(CIRCLE_DIGITS)}

JUNK_LINE_PATTERNS = [
    r"^\d+\s*,?\s*\d*\s*회$",
    r"^\s*-\s*\d+\s*-\s*$",
    r"^\s*※?\s*다음\s*문제를\s*읽고\s*알맞은\s*것을\s*골라\s*답안카드의\s*$",
    r"^\s*답란\s*\(.*\)\s*에\s*표기하시오\.?\s*$",
    r"^\s*기출문제\s*&?\s*정답.*$",
    r"^\s*\d{4}년\s*\d+\s*회\s*정보처리기사\s*필기\s*$",
    r"^\s*정답\s*및?\s*해설\s*$",
    r"^\s*정답\s*$",
]
JUNK_RE = [re.compile(p) for p in JUNK_LINE_PATTERNS]

# 페이지 어딘가에 부분적으로 섞여 들어올 수 있는 상용구(저작권 안내, 과목 구분자 등)는
# 줄 전체를 버리지 않고 해당 부분 문자열만 제거한다.
JUNK_SUBSTRING_PATTERNS = [
    r"저작권\s*안내",
    r"이\s*자료는\s*시나공\s*카페\s*회원을\s*대상으로\s*하는\s*자료로서\s*개인적인\s*용도로만\s*사용할\s*수\s*있습니다\.?",
    r"허락\s*없이\s*복제하거나",
    r"다른\s*매체에\s*옮겨\s*실을\s*수\s*없으며\s*,?",
    r"상업적\s*용도로\s*사용할\s*수\s*없습니다\.?",
    r"제\s*\d*\s*과목\s*\d*\s*[:：]?\s*[가-힣]+\s*구축\s*관리\s*\d*",
    r"제\s*\d*\s*과목\s*\d*\s*[:：]?\s*소프트웨어\s*설계\s*\d*",
    r"제\s*\d*\s*과목\s*\d*\s*[:：]?\s*소프트웨어\s*개발\s*\d*",
    r"제\s*\d*\s*과목\s*\d*\s*[:：]?\s*데이터베이스\s*구축\s*\d*",
    r"제\s*\d*\s*과목\s*\d*\s*[:：]?\s*프로그래밍\s*언어\s*활용\s*\d*",
    r"제\s*\d*\s*과목\s*\d*\s*[:：]?\s*정보시스템\s*구축\s*관리\s*\d*",
]
JUNK_SUBSTRING_RE = [re.compile(p) for p in JUNK_SUBSTRING_PATTERNS]

# 정보처리기사 필기는 5과목 x 20문항 순서가 항상 고정되어 있어, 텍스트로 과목 헤더를
# 파싱하는 대신 문항 번호 구간으로 과목명을 매긴다(2단 컬럼 PDF에서는 과목 헤더의
# 숫자 위치가 뒤섞여 나오는 경우가 많아 훨씬 안정적이다).
CATEGORY_BY_RANGE = [
    (1, 20, "소프트웨어 설계"),
    (21, 40, "소프트웨어 개발"),
    (41, 60, "데이터베이스 구축"),
    (61, 80, "프로그래밍 언어 활용"),
    (81, 100, "정보시스템 구축 관리"),
]


def category_for(num):
    for lo, hi, name in CATEGORY_BY_RANGE:
        if lo <= num <= hi:
            return name
    return ""


QSTART_RE = re.compile(r"^(\d{1,3})\.\s+(.*)$")
# 정답표는 보통 "37.② 38.① 39.①" 형태로 여러 문항이 한 줄에 나열되고,
# 정답이 복수(정정)인 경우 "4. ②④ ," 처럼 쉼표가 뒤에 붙는 경우가 있어
# 다음 문항 번호가 나오기 전까지 순환기호를 느슨하게 모두 수집한다.
ANSWER_ENTRY_RE = re.compile(
    r"(\d{1,3})\.\s*((?:[①②③④⑤⑥,\s])+?)(?=[^①②③④⑤⑥,\s]|$)"
)
ALL_CORRECT_RE = re.compile(r"(\d{1,3})\.\s*전항\s*정답")

# 원본 PDF 정답표 자체에 정답 표기가 누락된 경우를 위한 보정값.
# (2022년 2회차 문항 5는 정답표에 인쇄가 빠져 있으나, 동일 문항이 실린
#  2024년 1회차 해설에서 정답이 ②번으로 명시되어 있어 이를 근거로 보정)
MANUAL_ANSWER_OVERRIDES = {
    ("2022_02", 5): 2,
}

# SQL 실행결과/다이어그램 표기법처럼 선택지 자체가 표(그리드) 형태로 조판되어
# 텍스트 추출로는 정상적으로 분리할 수 없는 문항들. 이 문항들은 지문+선택지 전체를
# 이미지로 캡처해서 보여주고, 선택지는 원형기호 라벨만 클릭용으로 남겨둔다.
FULL_CAPTURE_QUESTIONS = {
    ("2020_03", 44), ("2020_04", 51), ("2021_01", 48), ("2021_03", 43),
    ("2022_01", 44), ("2022_01", 57), ("2022_01", 79), ("2023_01", 46),
    ("2025_02", 56),
}


def strip_junk_substrings(line):
    for r in JUNK_SUBSTRING_RE:
        line = r.sub(" ", line)
    return re.sub(r"\s+", " ", line).strip()


LONE_PAGE_MARK_RE = re.compile(r"^\d{1,3}([,.]\s*\d{1,3})?$")
PUNCT_ONLY_RE = re.compile(r"^[.,;:·ㆍ\-–—\s]*$")


def is_stray_fragment(line):
    """페이지 상단 회차/쪽 번호 잔여물이나 상용구 제거 후 남은 구두점 파편"""
    return bool(LONE_PAGE_MARK_RE.match(line) or PUNCT_ONLY_RE.match(line))

CONTENT_TOP_Y = 55  # 이 y값보다 위쪽(쪽 번호/헤더 배지)은 텍스트로 취급하지 않음
IMAGE_TOP_Y = 150  # 이 y값보다 위쪽(제목 배너/로고)은 이미지로 취급하지 않음
FOOTER_Y = 792  # 이 y값보다 아래쪽(쪽번호)은 콘텐츠로 취급하지 않음


def is_junk_line(line):
    for r in JUNK_RE:
        if r.match(line):
            return True
    return False


def cluster_lines(runs, tol=3.0):
    runs = sorted(runs, key=lambda r: r["y0"])
    clusters = []
    for r in runs:
        placed = False
        for c in clusters:
            if abs(c[0]["y0"] - r["y0"]) < tol:
                c.append(r)
                placed = True
                break
        if not placed:
            clusters.append([r])
    return clusters


def build_runs(words):
    groups = defaultdict(list)
    for w in words:
        x0, y0, x1, y1, text, block, lineno, wordno = w
        groups[(block, lineno)].append(w)
    runs = []
    for _, ws in groups.items():
        ws_sorted = sorted(ws, key=lambda w: w[7])
        x0 = min(w[0] for w in ws_sorted)
        x1 = max(w[2] for w in ws_sorted)
        y0 = min(w[1] for w in ws_sorted)
        y1 = max(w[3] for w in ws_sorted)
        text = " ".join(w[4] for w in ws_sorted)
        runs.append({"x0": x0, "y0": y0, "x1": x1, "y1": y1, "text": text})
    return runs


def find_watermark_bboxes(doc):
    counts = defaultdict(int)
    for page in doc:
        d = page.get_text("dict")
        for b in d["blocks"]:
            if b["type"] == 1:
                bbox = tuple(round(v) for v in b["bbox"])
                counts[bbox] += 1
    return {bbox for bbox, c in counts.items() if c >= 2}


def get_content_images(page, watermark_bboxes):
    d = page.get_text("dict")
    out = []
    for b in d["blocks"]:
        if b["type"] != 1:
            continue
        bbox = b["bbox"]
        rbbox = tuple(round(v) for v in bbox)
        if rbbox in watermark_bboxes:
            continue
        x0, y0, x1, y1 = bbox
        if y1 <= IMAGE_TOP_Y:
            continue
        if y0 >= FOOTER_Y:
            continue
        w = x1 - x0
        h = y1 - y0
        if w > 400 and h < 60:
            continue
        if w < 15 or h < 15:
            continue
        out.append({"x0": x0, "y0": y0, "x1": x1, "y1": y1})
    return out


def page_events(page, watermark_bboxes):
    """페이지의 텍스트 라인과 이미지를 2단 컬럼 순서(왼쪽 위->아래, 오른쪽 위->아래)로 반환"""
    words = page.get_text("words")
    runs = build_runs(words)
    runs = [r for r in runs if CONTENT_TOP_Y < r["y0"] < FOOTER_Y]

    images = get_content_images(page, watermark_bboxes)

    mid = page.rect.width / 2

    image_events = [
        {
            "type": "image",
            "x0": img["x0"],
            "y0": img["y0"],
            "bbox": (img["x0"], img["y0"], img["x1"], img["y1"]),
        }
        for img in images
    ]

    def build_column(col_runs, col_images):
        line_events = []
        for cluster in cluster_lines(col_runs):
            cluster.sort(key=lambda r: r["x0"])
            x0 = min(r["x0"] for r in cluster)
            y0 = min(r["y0"] for r in cluster)
            x1 = max(r["x1"] for r in cluster)
            y1 = max(r["y1"] for r in cluster)
            text = " ".join(r["text"] for r in cluster)
            line_events.append(
                {"type": "line", "x0": x0, "y0": y0, "x1": x1, "y1": y1, "text": text}
            )
        events = line_events + col_images
        events.sort(key=lambda e: e["y0"])
        return events

    left_runs = [r for r in runs if r["x0"] < mid]
    right_runs = [r for r in runs if r["x0"] >= mid]
    left_images = [e for e in image_events if e["x0"] < mid]
    right_images = [e for e in image_events if e["x0"] >= mid]

    return build_column(left_runs, left_images) + build_column(right_runs, right_images)


def clean_text(text):
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.?!:;)])", r"\1", text)
    text = re.sub(r"([(])\s+", r"\1", text)
    text = re.sub(r"([,.]){1}(\s*\1)+", r"\1", text)
    text = text.strip()
    return text


def split_options(text):
    parts = re.split(r"[①②③④⑤⑥]", text)
    return [p.strip() for p in parts]


def extract_answer_key(doc, question_page_count, watermark_bboxes):
    answers = {}
    for page_index in range(question_page_count, len(doc)):
        page = doc[page_index]
        text_parts = [
            ev["text"] for ev in page_events(page, watermark_bboxes) if ev["type"] == "line"
        ]
        full_text = " ".join(text_parts)
        for m in ANSWER_ENTRY_RE.finditer(full_text):
            num = int(m.group(1))
            if not (1 <= num <= 100):
                continue
            circles = [c for c in m.group(2) if c in CIRCLE_MAP]
            if circles:
                answers[num] = [CIRCLE_MAP[c] for c in circles]
        for m in ALL_CORRECT_RE.finditer(full_text):
            num = int(m.group(1))
            if 1 <= num <= 100:
                answers[num] = [1, 2, 3, 4]
    return answers


def find_answer_key_start_page(doc):
    for i, page in enumerate(doc):
        text = page.get_text()
        matches = [
            m for m in re.finditer(r"(\d{1,3})\.\s*([①②③④⑤⑥])", text)
        ]
        if len(matches) > 50:
            return i
    return len(doc)


def extract_round(pdf_path, out_dir, images_dir, slug):
    doc = fitz.open(pdf_path)
    watermark_bboxes = find_watermark_bboxes(doc)
    answer_page_start = find_answer_key_start_page(doc)
    answers = extract_answer_key(doc, answer_page_start, watermark_bboxes)

    questions = {}
    current_qnum = None

    pending_images = []

    def flush_image(qnum, page_index, bbox):
        if qnum is None:
            return None
        pad = 3
        rect = fitz.Rect(
            bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad
        )
        page = doc[page_index]
        pix = page.get_pixmap(clip=rect, dpi=220)
        fname = f"{slug}_q{qnum:03d}.png"
        pix.save(os.path.join(images_dir, fname))
        return f"images/jeongcheogi/{fname}"

    def update_bbox(qnum, page_index, x0, y0, x1, y1):
        if qnum is None or qnum not in questions:
            return
        b = questions[qnum].get("_bbox")
        if b is None or b[0] != page_index:
            questions[qnum]["_bbox"] = [page_index, x0, y0, x1, y1]
        else:
            b[1] = min(b[1], x0)
            b[2] = min(b[2], y0)
            b[3] = max(b[3], x1)
            b[4] = max(b[4], y1)

    for page_index in range(answer_page_start):
        page = doc[page_index]
        for ev in page_events(page, watermark_bboxes):
            if ev["type"] == "image":
                update_bbox(current_qnum, page_index, *ev["bbox"])
                img_path = flush_image(current_qnum, page_index, ev["bbox"])
                if img_path and current_qnum in questions:
                    questions[current_qnum]["_images"].append(img_path)
                continue

            line = ev["text"].strip()
            if not line or is_junk_line(line):
                continue
            line = strip_junk_substrings(line)
            if not line or is_stray_fragment(line):
                continue

            q_m = QSTART_RE.match(line)
            if q_m:
                num = int(q_m.group(1))
                if 1 <= num <= 100:
                    current_qnum = num
                    questions[num] = {
                        "number": num,
                        "_raw": [q_m.group(2)],
                        "_images": [],
                        "_bbox": None,
                    }
                    update_bbox(num, page_index, ev["x0"], ev["y0"], ev["x1"], ev["y1"])
                    continue

            if current_qnum is not None and current_qnum in questions:
                questions[current_qnum]["_raw"].append(line)
                update_bbox(
                    current_qnum, page_index, ev["x0"], ev["y0"], ev["x1"], ev["y1"]
                )

    result_questions = []
    issues = []
    for num in range(1, 101):
        q = questions.get(num)
        if not q:
            issues.append(f"Q{num} 없음")
            continue
        raw_text = clean_text(" ".join(q["_raw"]))
        parts = split_options(raw_text)
        if len(parts) > 5:
            # 컬럼 재조립 과정에서 마지막 선택지 몇 개가 중복 출력되는 경우가 있어
            # (예: 페이지/컬럼 경계에서 동일 문단이 두 번 잡히는 경우) 뒤쪽의
            # 중복 항목을 제거해 정상적으로 4개만 남긴다.
            opts_only = parts[1:]
            deduped = []
            for o in opts_only:
                if o in deduped:
                    continue
                deduped.append(o)
            if len(deduped) == 4:
                stem = parts[0]
                options = deduped
            else:
                issues.append(f"Q{num} 옵션 개수={len(parts)-1} (기대 4)")
                stem = parts[0]
                options = (deduped + ["", "", "", ""])[:4]
        elif len(parts) != 5:
            issues.append(f"Q{num} 옵션 개수={len(parts)-1} (기대 4)")
            stem = parts[0] if parts else raw_text
            options = (parts[1:] + ["", "", "", ""])[:4]
        else:
            stem = parts[0]
            options = parts[1:]

        answer_list = answers.get(num)
        override = MANUAL_ANSWER_OVERRIDES.get((slug, num))
        if override is not None:
            answer_list = [override]
            issues.append(f"Q{num} 수동 보정 적용 (answer={override})")

        if not answer_list:
            issues.append(f"Q{num} 정답 없음")
            answer_value = 0
        elif len(answer_list) == 1:
            answer_value = answer_list[0]
        else:
            answer_value = answer_list
            issues.append(f"Q{num} 복수 정답={answer_list}")

        image_path = q["_images"][0] if q["_images"] else None

        if (slug, num) in FULL_CAPTURE_QUESTIONS and q.get("_bbox"):
            page_index, x0, y0, x1, y1 = q["_bbox"]
            pad = 6
            rect = fitz.Rect(x0 - pad, y0 - pad, x1 + pad, y1 + pad)
            page = doc[page_index]
            pix = page.get_pixmap(clip=rect, dpi=220)
            fname = f"{slug}_q{num:03d}_full.png"
            pix.save(os.path.join(images_dir, fname))
            image_path = f"images/jeongcheogi/{fname}"
            options = ["①", "②", "③", "④"]
            if "이미지" not in stem and "아래" not in stem[-10:]:
                stem = stem.rstrip(". ") + " (아래 이미지의 표를 참고하세요)"
            issues.append(f"Q{num} 표 형태 선택지 -> 전체 캡처 이미지로 대체")

        result_questions.append(
            {
                "number": num,
                "category": category_for(num),
                "type": "4choice",
                "question": stem,
                "passage": "",
                "options": options,
                "answer": answer_value,
                "explanation": "",
                "image": image_path,
            }
        )

    out = {
        "source": os.path.basename(pdf_path),
        "slug": slug,
        "total": len(result_questions),
        "questions": result_questions,
    }
    out_path = os.path.join(out_dir, f"jeongcheogi_{slug}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    return issues


ROUND_SLUG_RE = re.compile(r"(\d{4})년\s*(\d+)회차")


def slug_for_filename(fn):
    m = ROUND_SLUG_RE.search(fn)
    if not m:
        base = os.path.splitext(fn)[0]
        return re.sub(r"\s+", "_", base)
    year, round_no = m.group(1), m.group(2)
    return f"{year}_{int(round_no):02d}"


def main():
    if len(sys.argv) < 3:
        print("usage: extract_pdf.py <pdf_folder> <out_public_folder>")
        sys.exit(1)
    pdf_folder = sys.argv[1]
    out_public = sys.argv[2]
    images_dir = os.path.join(out_public, "images", "jeongcheogi")
    os.makedirs(out_public, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    only = sys.argv[3] if len(sys.argv) > 3 else None

    all_issues = {}
    files = sorted(f for f in os.listdir(pdf_folder) if f.lower().endswith(".pdf"))
    for fn in files:
        if only and only not in fn:
            continue
        slug = slug_for_filename(fn)
        pdf_path = os.path.join(pdf_folder, fn)
        print(f"처리 중: {fn} -> {slug}")
        try:
            issues = extract_round(pdf_path, out_public, images_dir, slug)
            all_issues[slug] = issues
        except Exception as e:
            all_issues[slug] = [f"예외 발생: {e}"]
            print(f"  오류: {e}")

    print("\n=== 결과 요약 ===")
    for slug, issues in all_issues.items():
        status = "OK" if not issues else f"{len(issues)}건 이슈"
        print(f"{slug}: {status}")
        for issue in issues[:15]:
            print(f"   - {issue}")


if __name__ == "__main__":
    main()
