#!/usr/bin/env python3
import json
import os
import re

def fix_choices(choices_array):
    """합쳐진 보기를 분리"""
    fixed = []
    for choice in choices_array:
        # "보기4. 5 보기5" 패턴 찾기 (숫자로 시작하는 경우)
        if re.search(r'\.\s*\d+\s+[^0-9]', choice):
            parts = re.split(r'\.\s*(\d+)\s+', choice)
            if len(parts) >= 3:
                fixed.append(parts[0] + '.')
                for i in range(1, len(parts)-1, 2):
                    if i+1 < len(parts):
                        fixed.append(parts[i+1])
            else:
                fixed.append(choice)
        # "보기 4 보기5" 패턴 (숫자 뒤에 다른 내용)
        elif re.search(r'\s+\d+\s+[가-힣]', choice):
            parts = re.split(r'\s+(\d+)\s+', choice)
            if len(parts) >= 3:
                fixed.append(parts[0])
                for i in range(1, len(parts)-1, 2):
                    if i+1 < len(parts):
                        fixed.append(parts[i+1])
            else:
                fixed.append(choice)
        else:
            fixed.append(choice)
    return fixed

def fix_question(question_text):
    """질문 끝에 있는 보기 제거"""
    # "무엇입니까? 1 보기내용" 패턴
    match = re.search(r'\?\s*\d+\s+[가-힣]', question_text)
    if match:
        return question_text[:match.start()+1]
    return question_text

def fix_passage(passage_text, question_type):
    """passage에서 선택지가 뭉쳐진 경우 분리"""
    if question_type in ['box_multiple', 'ordering']:
        # 선택지 패턴 찾기 (숫자나 기호로 시작하는 뭉쳐진 패턴)
        # "ㄱ. ... ㄹ. ... ① ㄱ ② ㄴ, ㄷ" 같은 패턴 정리
        cleaned = re.sub(r'\s*[①-⑤]\s*[①-⑤]?\s*[ㄱ-ㄹ,\s]*$', '', passage_text)
        cleaned = re.sub(r'\s*\d+\s*\d+\s*[ㄱ-ㄹL,C\-\s\u0590-\u05FF]*$', '', cleaned)
        # 줄바꿈으로 구분
        lines = cleaned.split('\n')
        final_lines = []
        for line in lines:
            line = line.strip()
            if line and (line.startswith('ㄱ.') or line.startswith('ㄴ.') or 
                        line.startswith('ㄷ.') or line.startswith('ㄹ.') or line.startswith('ㅁ.')):
                final_lines.append(line)
        return '\n'.join(final_lines)
    return passage_text

def generate_choices(question_type):
    """question_type에 맞는 기본 choices 생성"""
    if question_type == 'box_multiple':
        return [
            "ㄱ",
            "ㄱ, ㄴ",
            "ㄱ, ㄴ, ㄷ",
            "ㄱ, ㄷ, ㄹ",
            "ㄱ, ㄴ, ㄷ, ㄹ"
        ]
    elif question_type == 'ordering':
        return [
            "ㄱ-ㄴ-ㄷ-ㄹ",
            "ㄴ-ㄱ-ㄷ-ㄹ",
            "ㄱ-ㄷ-ㄴ-ㄹ",
            "ㄷ-ㄱ-ㄴ-ㄹ",
            "ㄷ-ㄴ-ㄱ-ㄹ"
        ]
    return []

def fix_round_file(file_path):
    """한 파일의 모든 문제 수정"""
    print(f"Processing {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    modified = False
    
    for q in data['questions']:
        # 1. 질문 끝에 보기가 있는 경우 제거
        original_q = q['question']
        fixed_q = fix_question(q['question'])
        if fixed_q != original_q:
            q['question'] = fixed_q
            modified = True
            print(f"  Fixed question {q['number']}: removed choice from question text")
        
        # 2. choices 배열 수정
        if q['type'] == '5choice' and len(q['choices']) < 5:
            # 질문에서 추출한 보기를 choices에 추가
            missing_choice_match = re.search(r'\?\s*\d+\s+(.+)$', original_q)
            if missing_choice_match:
                missing_choice = missing_choice_match.group(1).strip()
                q['choices'].insert(0, missing_choice)
                modified = True
                print(f"  Fixed question {q['number']}: added missing first choice")
        
        # 3. 합쳐진 보기 분리
        if q['type'] == '5choice':
            original_choices = q['choices'][:]
            fixed_choices = []
            for choice in q['choices']:
                # "보기4. 5 보기5" 형태 분리
                if re.search(r'\.\s*\d+\s+', choice) or re.search(r'\s+\d+\s+[가-힣]', choice):
                    parts = re.split(r'(?:\.\s*|\s+)(\d+)\s+', choice)
                    if len(parts) > 1:
                        fixed_choices.append(parts[0].strip())
                        for i in range(2, len(parts), 2):
                            if parts[i].strip():
                                fixed_choices.append(parts[i].strip())
                    else:
                        fixed_choices.append(choice)
                else:
                    fixed_choices.append(choice)
            
            if fixed_choices != original_choices:
                q['choices'] = fixed_choices[:5]  # 최대 5개만
                modified = True
                print(f"  Fixed question {q['number']}: split combined choices")
        
        # 4. passage 수정
        if q['type'] in ['box_multiple', 'ordering']:
            original_passage = q['passage']
            fixed_passage = fix_passage(q['passage'], q['type'])
            if fixed_passage != original_passage:
                q['passage'] = fixed_passage
                modified = True
                print(f"  Fixed question {q['number']}: cleaned passage")
            
            # choices가 비어있거나 이상한 경우 기본 choices 생성
            if not q['choices'] or len(q['choices']) < 3:
                default_choices = generate_choices(q['type'])
                if default_choices:
                    q['choices'] = default_choices
                    modified = True
                    print(f"  Fixed question {q['number']}: regenerated choices")
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✓ Saved changes to {file_path}")
    else:
        print(f"  No changes needed for {file_path}")
    
    return modified

# 모든 aica_round 파일 처리
public_dir = '/workspace/public'
files_to_fix = [
    f'aica_round_{i:02d}.json' for i in range(1, 11)
]

total_modified = 0
for filename in files_to_fix:
    file_path = os.path.join(public_dir, filename)
    if os.path.exists(file_path):
        if fix_round_file(file_path):
            total_modified += 1

print(f"\n✓ Complete! Modified {total_modified} files.")
