-- CR-2 (Cooking Reorganisation, Oct 14 2026) — additive only.
alter table planned_cooks add column if not exists stock_deducted jsonb;
alter table shopping_lists add column if not exists kind text not null default 'cook';
alter table shopping_lists add constraint shopping_lists_kind_check check (kind in ('cook','topup'));
