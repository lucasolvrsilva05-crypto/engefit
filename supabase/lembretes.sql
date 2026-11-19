-- ENGEFIT · Lembretes no celular (Web Push).
-- Rode DEPOIS do dungeon.sql e DEPOIS de publicar a Edge Function "engefit-push".
-- Pode rodar de novo sem problema.
--
-- Segurança: as chaves de envio (VAPID) são geradas pela própria Edge Function na primeira execução e
-- ficam na tabela push_cfg, que só o servidor lê. A senha que o agendador usa para chamar a função
-- também é gerada aqui dentro. Nenhuma chave secreta precisa ser copiada por ninguém.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------- tabelas (fechadas: o app só mexe pelas funções abaixo) ----------
create table if not exists public.push_cfg (
  id integer primary key default 1 check (id = 1),
  vapid_pub text,
  vapid_priv text,
  cron_secret text not null default encode(extensions.gen_random_bytes(24), 'hex')
);
insert into public.push_cfg (id) values (1) on conflict (id) do nothing;

create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  prefs jsonb not null default '{"agua":[10,14,18],"missao":20,"dungeon":true}',
  tz text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subs(user_id);

create table if not exists public.push_log (
  endpoint text not null,
  kind text not null,
  ref text not null,
  at timestamptz not null default now(),
  primary key (endpoint, kind, ref)
);

alter table public.push_cfg enable row level security;
alter table public.push_subs enable row level security;
alter table public.push_log enable row level security;
revoke all on public.push_cfg, public.push_subs, public.push_log from anon, authenticated;

-- ---------- funções que o app usa ----------
-- chave pública de envio (é pública por natureza; null enquanto a Edge Function não rodou)
create or replace function public.engefit_push_chave()
returns text language sql stable security definer set search_path = public as $$
  select vapid_pub from public.push_cfg where id = 1;
$$;

-- registra (ou atualiza) este aparelho e as preferências de lembrete
create or replace function public.engefit_push_salvar(p_endpoint text, p_p256dh text, p_auth text, p_prefs jsonb, p_tz text)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare pr jsonb; ag jsonb; mi integer;
begin
  if auth.uid() is null then raise exception 'ENGEFIT: entre na conta primeiro'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(coalesce(p_p256dh, '')) not between 20 and 200
     or length(coalesce(p_auth, '')) not between 8 and 100 then
    raise exception 'ENGEFIT: inscrição inválida';
  end if;
  -- só aceita horas inteiras de 6 a 23
  select coalesce(jsonb_agg(distinct v order by v), '[]') into ag
    from (select (x #>> '{}')::int v from jsonb_array_elements(case when jsonb_typeof(p_prefs->'agua') = 'array' then p_prefs->'agua' else '[]' end) x
           where jsonb_typeof(x) = 'number') t
   where v between 6 and 23;
  if jsonb_array_length(ag) > 8 then ag := '[]'; end if;
  mi := case when jsonb_typeof(p_prefs->'missao') = 'number' and (p_prefs->>'missao')::int between 6 and 23 then (p_prefs->>'missao')::int end;
  pr := jsonb_build_object('agua', ag, 'missao', mi, 'dungeon', coalesce(p_prefs->'dungeon' = 'true'::jsonb, false));
  if (select count(*) from public.push_subs where user_id = auth.uid() and endpoint <> p_endpoint) >= 10 then
    delete from public.push_subs where endpoint = (select endpoint from public.push_subs where user_id = auth.uid() order by updated_at limit 1);
  end if;
  insert into public.push_subs (endpoint, user_id, p256dh, auth, prefs, tz, updated_at)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, pr,
          case when exists (select 1 from pg_timezone_names where name = p_tz) then p_tz else 'America/Sao_Paulo' end, now())
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    prefs = excluded.prefs, tz = excluded.tz, updated_at = now();
  return true;
end $$;

create or replace function public.engefit_push_remover(p_endpoint text)
returns boolean language sql volatile security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid() returning true;
$$;

-- ---------- situação de hoje (mesmas regras do app e do XP) ----------
create or replace function public.engefit_hoje(d jsonb, tz text)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  hoje date := (now() at time zone tz)::date;
  meta text := coalesce(d #>> '{settings,goal}', 'saude');
  plano jsonb := d #> '{settings,plan}';
  r jsonb := d -> 'daily' -> hoje::text;
  stg integer; wg integer; kg numeric; st numeric; wa numeric; treina boolean; treinou boolean;
begin
  stg := case meta when 'emagrecer' then 10000 when 'condicionamento' then 9000
                   when 'massa' then 7000 when 'forca' then 7000 else 8000 end;
  select (b->>'kg')::numeric into kg
    from jsonb_array_elements(case when jsonb_typeof(d->'body') = 'array' then d->'body' else '[]' end) b
   where jsonb_typeof(b->'kg') = 'number' and (b->>'kg')::numeric > 0 order by b->>'d' desc limit 1;
  wg := greatest(1500, least(4000, round(coalesce(kg * 35, 2000) / 250) * 250));
  st := case when jsonb_typeof(r->'st') = 'number' then (r->>'st')::numeric else 0 end;
  wa := case when jsonb_typeof(r->'w') = 'number' then (r->>'w')::numeric else 0 end;
  treina := jsonb_typeof(plano->'map') = 'object'
            and coalesce(plano->'map'->>(extract(dow from hoje)::int::text), '') <> ''
            and (plano->>'at' is null or hoje::text >= plano->>'at');
  treinou := exists (select 1 from jsonb_array_elements(case when jsonb_typeof(d->'workouts') = 'array' then d->'workouts' else '[]' end) w
                      where jsonb_typeof(w->'start') = 'number'
                        and (to_timestamp((w->>'start')::numeric / 1000) at time zone tz)::date = hoje);
  return jsonb_build_object('st', st, 'stg', stg, 'w', wa, 'wg', wg, 'treina', treina, 'treinou', treinou,
    'req', st >= stg and st <= 100000 and wa >= wg and (not treina or treinou));
end $$;

create or replace function public.engefit_litros(ml numeric)
returns text language sql immutable as $$
  select case when round(ml / 1000.0, 2) = trunc(round(ml / 1000.0, 2)) then trunc(round(ml / 1000.0, 2))::text
              else replace(rtrim(round(ml / 1000.0, 2)::text, '0'), '.', ',') end || ' L'
$$;
create or replace function public.engefit_lista(a text[])
returns text language sql immutable as $$
  select case when cardinality(a) <= 1 then coalesce(a[1], '')
              else array_to_string(a[1:cardinality(a) - 1], ', ') || ' e ' || a[cardinality(a)] end
$$;

-- ---------- quem precisa receber lembrete agora (a Edge Function chama a cada 15 min) ----------
create or replace function public.engefit_lembretes()
returns table (endpoint text, p256dh text, auth text, title text, body text, tag text, url text)
language plpgsql volatile security definer set search_path = public as $$
declare
  s record; loc timestamp; h integer; dia date; t jsonb; v jsonb; falta text[]; g jsonb; prog jsonb; pre integer;
  ri integer; nv record; n_ok integer; nomes text[] := array['Caverna dos Goblins','Masmorra de Gelo','Ninho das Aranhas',
  'Fortaleza de Ferro','Templo Submerso','Cripta Sombria','Floresta dos Lobos','Vulcão Adormecido'];
begin
  delete from public.push_log where at < now() - interval '3 days';
  for s in select ps.*, ud.data, p.created_at from public.push_subs ps
             join public.user_data ud on ud.user_id = ps.user_id
             join public.profiles p on p.id = ps.user_id
  loop
    loc := now() at time zone s.tz; h := extract(hour from loc)::int; dia := loc::date;
    t := null;

    -- missão diária pendente, no horário escolhido
    if jsonb_typeof(s.prefs->'missao') = 'number' and h = (s.prefs->>'missao')::int then
      t := public.engefit_hoje(s.data, s.tz);
      if not (t->>'req')::boolean then
        insert into public.push_log values (s.endpoint, 'missao', dia::text) on conflict do nothing;
        if found then
          falta := '{}';
          if (t->>'st')::numeric < (t->>'stg')::numeric then
            falta := falta || (replace(to_char((t->>'stg')::numeric - (t->>'st')::numeric, 'FM999,999,999'), ',', '.') || ' passos'); end if;
          if (t->>'w')::numeric < (t->>'wg')::numeric then
            falta := falta || (public.engefit_litros((t->>'wg')::numeric - (t->>'w')::numeric) || ' de água'); end if;
          if (t->>'treina')::boolean and not (t->>'treinou')::boolean then falta := falta || 'o treino de hoje'::text; end if;
          endpoint := s.endpoint; p256dh := s.p256dh; auth := s.auth; tag := 'missao'; url := '/#inicio';
          title := 'Missão diária pendente';
          body := 'Faltam ' || public.engefit_lista(falta) || '. Você tem até a meia-noite.';
          return next;
        end if;
      end if;
    end if;

    -- água, nos horários escolhidos
    if jsonb_typeof(s.prefs->'agua') = 'array' and (s.prefs->'agua') @> to_jsonb(h) then
      t := coalesce(t, public.engefit_hoje(s.data, s.tz));
      if (t->>'w')::numeric < (t->>'wg')::numeric then
        insert into public.push_log values (s.endpoint, 'agua', dia::text || ':' || h) on conflict do nothing;
        if found then
          endpoint := s.endpoint; p256dh := s.p256dh; auth := s.auth; tag := 'agua'; url := '/#inicio';
          title := 'Hora da água';
          body := 'Hoje: ' || public.engefit_litros((t->>'w')::numeric) || ' de ' || public.engefit_litros((t->>'wg')::numeric)
                  || '. Beba um copo e registre no app.';
          return next;
        end if;
      end if;
    end if;

    -- dungeon: domingo às 18 h, se ainda não foi concluída
    if coalesce(s.prefs->'dungeon' = 'true'::jsonb, false) and extract(isodow from dia) = 7 and h = 18 then
      v := public.engefit_avaliar(s.data, s.created_at);
      pre := (v->>'xp')::int - (v->>'wxp')::int;                -- XP de antes desta semana
      select * into nv from public.engefit_nivel(pre);
      ri := position(nv.rk in 'EDCBAS') - 1;
      g := public.engefit_dungeon((v->>'wk')::date, ri);
      prog := coalesce(v->'wkm'->(v->>'wk'), '{}');
      select count(*) into n_ok from jsonb_array_elements(g->'obj') o
       where coalesce((prog->>(o->>'t'))::numeric, 0) >= (o->>'meta')::numeric;
      if n_ok < 3 then
        insert into public.push_log values (s.endpoint, 'dungeon', v->>'wk') on conflict do nothing;
        if found then
          endpoint := s.endpoint; p256dh := s.p256dh; auth := s.auth; tag := 'dungeon'; url := '/#inicio';
          title := 'A dungeon termina hoje';
          body := nomes[(g->>'n')::int + 1] || ': faltam ' || (3 - n_ok) || ' de 3 objetivos até 23h59. +150 XP se concluir.';
          return next;
        end if;
      end if;
    end if;
  end loop;
end $$;

-- a Edge Function apaga inscrições que o celular cancelou
create or replace function public.engefit_push_descartar(p_endpoint text)
returns void language sql volatile security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;

revoke all on function public.engefit_lembretes(), public.engefit_push_descartar(text),
  public.engefit_hoje(jsonb, text) from public, anon, authenticated;
grant execute on function public.engefit_lembretes(), public.engefit_push_descartar(text) to service_role;
revoke all on function public.engefit_push_chave(), public.engefit_push_salvar(text, text, text, jsonb, text),
  public.engefit_push_remover(text) from public, anon;
grant execute on function public.engefit_push_chave(), public.engefit_push_salvar(text, text, text, jsonb, text),
  public.engefit_push_remover(text) to authenticated;
grant all on public.push_cfg, public.push_subs, public.push_log to service_role;

-- ---------- agendador: chama a Edge Function a cada 15 minutos ----------
-- A chave "anon" abaixo é a chave PÚBLICA do site (a mesma que está no index.html), não é segredo.
-- A proteção de verdade é o cabeçalho x-engefit-cron, com a senha gerada nesta tabela.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'engefit-lembretes') then perform cron.unschedule('engefit-lembretes'); end if;
end $$;
select cron.schedule('engefit-lembretes', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://udgfuryjojspxeofcwbu.supabase.co/functions/v1/engefit-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer sb_publishable_iGzoPW7N-MmF_YMHOYNMfA_KDWgxIqN',
                                  'x-engefit-cron', (select cron_secret from public.push_cfg where id = 1)),
    body := '{}'::jsonb, timeout_milliseconds := 20000);
$cron$);

-- primeira chamada agora: a função gera as chaves de envio
select net.http_post(
  url := 'https://udgfuryjojspxeofcwbu.supabase.co/functions/v1/engefit-push?setup=1',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer sb_publishable_iGzoPW7N-MmF_YMHOYNMfA_KDWgxIqN'),
  body := '{}'::jsonb, timeout_milliseconds := 20000) as chamada;

select jobname, schedule, active from cron.job where jobname = 'engefit-lembretes';
