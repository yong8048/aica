-- 선택 사항: 오답은 로그인 계정의 user_metadata에도 저장됩니다.
-- 테이블이 있으면 함께 동기화되므로, 가능하면 SQL Editor에서 한 번 실행하세요.

create table if not exists public.wrong_questions (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists wrong_questions_user_id_idx on public.wrong_questions (user_id);

alter table public.wrong_questions enable row level security;

drop policy if exists "Users manage own wrong questions" on public.wrong_questions;

create policy "Users manage own wrong questions"
  on public.wrong_questions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
