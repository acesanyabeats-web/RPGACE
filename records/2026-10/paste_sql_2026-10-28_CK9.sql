-- Oct 28 2026: Caps and Central Kit CK-9 built. Paste and Run; the editor shows only the last result.
update ceo_plan_items set status='yellow', evidence='Built (CK-9 commit): dead brief helpers removed, SELF_KNOWLEDGE kit + ladder, md5 suite 13/13, CK-5 scan none, tooling map.' where plan_id='dffcc046-41c8-4ffc-883d-6e2b6cffe466' and item_code='CK-9';
-- CHECK (run alone): should print CK-1..CK-9 all yellow
select item_code, status from ceo_plan_items where plan_id='dffcc046-41c8-4ffc-883d-6e2b6cffe466' order by item_code;
