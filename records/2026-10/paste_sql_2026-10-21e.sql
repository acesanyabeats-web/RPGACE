-- AC-2 (Oct 21 2026): Alex confirmed "Delete both" + "Drop the tables".
-- The connector cancelled this, so paste it into the Supabase SQL editor.
-- Rows: the 2 lock-in records (Tue 20 Oct, Wed 21 Oct). No saved templates existed.
-- Checked first: no foreign keys, triggers, views or functions use either table.
delete from day_templates where id in ('9df1ca51-0054-4040-a977-1c03f56bef1e','ded1c518-5d9a-401a-86e6-2aec2782efdf');
drop table day_templates;
drop table week_templates;
-- Check: this should return 0 rows.
select table_name from information_schema.tables where table_name in ('day_templates','week_templates');
