-- Optional extended guidance is independent of the short step description.
alter table public.checklist_items
  add column details text,
  add column details_i18n jsonb not null default '{}'::jsonb;
