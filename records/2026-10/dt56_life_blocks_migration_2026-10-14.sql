-- DT-5/6 cooking + shopping blocks (Oct 14 2026). The one block table (chore_blocks) gains a kind,
-- a checklist (items) and a link to Cooking's planned cook. Additive only.
-- items: [{src:'recipe'|'cook'|'list'|'wishlist'|'routine'|'own', ref_id, ingredient_id, label, done}]
alter table public.chore_blocks add column if not exists kind text not null default 'chores';
alter table public.chore_blocks add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.chore_blocks add column if not exists planned_cook_id uuid references public.planned_cooks(id) on delete set null;
alter table public.chore_blocks add constraint chore_blocks_kind_chk check (kind in ('chores','cooking','shopping'));
