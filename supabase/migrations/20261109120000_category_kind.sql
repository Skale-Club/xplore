-- What a checklist category is: main story, a side quest, or collectibles.
-- The walkthrough groups the chapter index by kind, keeps "Next up" and the
-- auto-advance on the story, and shows story progress separately from the
-- 100% total. Existing rows default to 'story', so nothing changes until a
-- content file (or the editor) says otherwise.
--
-- Idempotent so `supabase db push` can re-run it harmlessly.
alter table public.checklist_categories
  add column if not exists kind text not null default 'story';

alter table public.checklist_categories
  drop constraint if exists checklist_categories_kind_check;

alter table public.checklist_categories
  add constraint checklist_categories_kind_check
  check (kind in ('story', 'side', 'collectible'));
