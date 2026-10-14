-- MD2-10 (Oct 14 2026), applied via Supabase MCP as migration md2_social_money_areas.
-- Routine ticks in the new My Day areas Social and Money pay into the Connector and Steward realms.
do $$
declare d text := pg_get_functiondef('public.xp_on_change'::regproc);
begin
  if position('''social'' then ''connector''' in d) = 0 then
    d := replace(d, $q$when 'mind' then 'mind' else 'life' end;$q$, $q$when 'mind' then 'mind' when 'social' then 'connector' when 'money' then 'steward' else 'life' end;$q$);
    execute d;
  end if;
end $$;
