-- Oct 28 2026, BT-1: builder updates in Chronicles grow one "🛠 Building RPGACE" block on your timeline (no extra XP).
-- Paste ALL of this into the Supabase SQL editor and Run. The XP side is already live (xp_on_doing_now skips details.auto).
create or replace function public.builder_time_on_update()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_last record; v_prev timestamptz; v_start timestamptz; v_mins int; v_local timestamp;
begin
  begin
    select * into v_last from rpgace_agendas
      where source_type = 'doing_now' and details->>'auto' = 'builder' and completed and ended_at <= new.created_at
      order by ended_at desc limit 1;
    if v_last.id is not null and new.created_at - v_last.ended_at <= interval '45 minutes'
       and not exists (select 1 from rpgace_agendas a where a.source_type = 'doing_now' and a.completed
                       and coalesce(a.details->>'auto', '') <> 'builder' and a.ended_at > v_last.ended_at and a.ended_at <= new.created_at)
       and not exists (select 1 from quest_log q where q.status = 'completed' and q.quest_kind in ('task', 'routine', 'block')
                       and q.completed_at > v_last.ended_at and q.completed_at <= new.created_at) then
      v_mins := greatest(1, round(extract(epoch from (new.created_at - v_last.started_at)) / 60)::int);
      update rpgace_agendas set ended_at = new.created_at, actual_mins = v_mins, estimated_mins = v_mins,
        details = details || jsonb_build_object('updates', coalesce((details->>'updates')::int, 1) + 1, 'last_update', new.title)
        where id = v_last.id;
    else
      select max(ended_at) into v_prev from rpgace_agendas
        where source_type = 'doing_now' and completed and ended_at <= new.created_at;
      v_start := greatest(new.created_at - interval '15 minutes', coalesce(v_prev, new.created_at - interval '15 minutes'));
      v_mins := greatest(1, round(extract(epoch from (new.created_at - v_start)) / 60)::int);
      v_local := v_start at time zone 'Europe/London';
      insert into rpgace_agendas (id, date, hour, minute, title, description, category, xp, estimated_mins, actual_mins, completed,
                                  started_at, ended_at, source_type, realms, details)
      values ('sa_bt_' || (extract(epoch from new.created_at) * 1000)::bigint, v_local::date, extract(hour from v_local)::int,
              extract(minute from v_local)::int, '🛠 Building RPGACE', 'Auto from Chronicles builder updates', 'personal', 0, v_mins, v_mins,
              true, v_start, new.created_at, 'doing_now', array['builder'],
              jsonb_build_object('auto', 'builder', 'updates', 1, 'last_update', new.title, 'notes', '[]'::jsonb))
      on conflict (id) do nothing;
    end if;
  exception when others then
    raise warning 'builder_time_on_update failed: %', sqlerrm;
  end;
  return new;
end $$;
create trigger builder_time_on_update after insert on system_updates for each row execute function public.builder_time_on_update();
-- CHECK (run alone afterwards): should print builder_time_on_update
select tgname from pg_trigger where tgname = 'builder_time_on_update';
