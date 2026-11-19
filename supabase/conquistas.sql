-- ENGEFIT · Conquistas validadas pelo servidor (32 medalhas) + XP.
-- Rode DEPOIS do xp_recuperacao.sql. Pode rodar de novo sem problema.
-- O servidor recalcula XP, nível, rank e a lista de conquistas a cada salvamento; o app não consegue alterar.

alter table public.profiles add column if not exists conq text[] not null default '{}';

-- Avalia os dados de um jogador. Mesmas regras do app (index.html, ACH / achEval).
-- Limites contra dados inventados: até 2 treinos por dia, nada no futuro, nada > 180 dias antes da conta,
-- carga máx. 500 kg por série, 100 repetições, passos até 100 mil, água até 15 L.
create or replace function public.engefit_avaliar(d jsonb, criado timestamptz)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  tz constant text := 'America/Sao_Paulo';
  hoje date := (now() at time zone tz)::date;
  inicio date := (coalesce(criado, now()) at time zone tz)::date - 180;
  meta text := coalesce(d #>> '{settings,goal}', 'saude');
  plano jsonb := d #> '{settings,plan}';
  stg integer; wg integer; kg numeric;
  x integer := 0;
  dias date[] := '{}';
  -- treinos
  w record; e jsonb; s jsonb; mx numeric; k numeric; rp numeric; exid text;
  bests jsonb := '{}'; n_wk integer := 0; vol numeric := 0; n_pr integer := 0;
  madr integer := 0; coru integer := 0; maxsets integer := 0;
  -- dias
  rec record; r jsonb; st numeric; wa numeric;
  ok_st boolean; ok_wa boolean; treina boolean; req boolean;
  n_req integer := 0; n_wa integer := 0; n_st integer := 0; n_ch integer := 0; pen boolean := false;
  run integer := 0; best integer := 0; prev date;
  -- corpo e dieta
  medida boolean; kg0 numeric; kg1 numeric; delta numeric := 0; diario integer := 0;
  nv record; c text[] := '{}';
begin
  if d is null or jsonb_typeof(d) <> 'object' then d := '{}'; end if;

  stg := case meta when 'emagrecer' then 10000 when 'condicionamento' then 9000
                   when 'massa' then 7000 when 'forca' then 7000 else 8000 end;
  select (b->>'kg')::numeric into kg
    from jsonb_array_elements(case when jsonb_typeof(d->'body') = 'array' then d->'body' else '[]' end) b
   where jsonb_typeof(b->'kg') = 'number' and (b->>'kg')::numeric > 0
   order by b->>'d' desc limit 1;
  wg := greatest(1500, least(4000, round(coalesce(kg * 35, 2000) / 250) * 250));

  -- ---------- treinos (em ordem cronológica, no máx. 2 por dia: os com mais séries) ----------
  for w in
    select wj, ts, dia, ns from (
      select wj, ts, dia, ns, row_number() over (partition by dia order by ns desc, ts) n from (
        select wj, ts, (ts at time zone tz)::date dia,
               (select count(*)::int
                  from jsonb_array_elements(case when jsonb_typeof(wj->'exs') = 'array' then wj->'exs' else '[]' end) e2,
                       jsonb_array_elements(case when jsonb_typeof(e2->'sets') = 'array' then e2->'sets' else '[]' end) s2
                 where s2->'done' = 'true'::jsonb) ns
          from (select wj, to_timestamp((wj->>'start')::numeric / 1000) ts
                  from jsonb_array_elements(case when jsonb_typeof(d->'workouts') = 'array' then d->'workouts' else '[]' end) wj
                 where jsonb_typeof(wj->'start') = 'number' and (wj->>'start')::numeric between 0 and 9e12) a0
      ) a1 where dia between inicio and hoje
    ) a2 where n <= 2 order by ts
  loop
    x := x + least(100, 40 + 2 * w.ns);
    n_wk := n_wk + 1;
    dias := dias || w.dia;
    if extract(hour from (w.ts at time zone tz)) < 7 then madr := madr + 1; end if;
    if extract(hour from (w.ts at time zone tz)) >= 22 then coru := coru + 1; end if;
    maxsets := greatest(maxsets, w.ns);
    for e in select * from jsonb_array_elements(case when jsonb_typeof(w.wj->'exs') = 'array' then w.wj->'exs' else '[]' end) loop
      exid := coalesce(e->>'ex', ''); mx := 0;
      for s in select * from jsonb_array_elements(case when jsonb_typeof(e->'sets') = 'array' then e->'sets' else '[]' end) loop
        continue when coalesce(s->'done', 'false'::jsonb) <> 'true'::jsonb or coalesce(s->>'t', '') = 'W';
        k  := case when jsonb_typeof(s->'kg') = 'number' then (s->>'kg')::numeric else 0 end;
        rp := case when jsonb_typeof(s->'reps') = 'number' then (s->>'reps')::numeric else 0 end;
        continue when k <= 0 or k > 500 or rp <= 0 or rp > 100;
        vol := vol + k * rp;
        mx := greatest(mx, k);
      end loop;
      if mx > 0 and exid <> '' then
        if bests ? exid and mx > (bests->>exid)::numeric then n_pr := n_pr + 1; end if;
        if not (bests ? exid) or mx > (bests->>exid)::numeric then bests := bests || jsonb_build_object(exid, mx); end if;
      end if;
    end loop;
  end loop;

  -- ---------- missões de cada dia (em ordem, para a maior sequência) ----------
  if jsonb_typeof(d->'daily') = 'object' then
    for rec in select key, value from jsonb_each(d->'daily') where key ~ '^\d{4}-\d{2}-\d{2}$' order by key loop
      continue when rec.key::date > hoje or rec.key::date < inicio;
      r := rec.value;
      continue when jsonb_typeof(r) <> 'object';
      st := case when jsonb_typeof(r->'st') = 'number' then (r->>'st')::numeric else 0 end;
      wa := case when jsonb_typeof(r->'w')  = 'number' then (r->>'w')::numeric  else 0 end;
      ok_st := st >= stg and st <= 100000;
      ok_wa := wa >= wg and wa <= 15000;
      treina := jsonb_typeof(plano->'map') = 'object'
                and coalesce(plano->'map'->>(extract(dow from rec.key::date)::int::text), '') <> ''
                and (plano->>'at' is null or rec.key >= plano->>'at');
      req := ok_st and ok_wa and (not treina or rec.key::date = any(dias));
      if ok_st then x := x + 15; n_st := n_st + 1; end if;
      if ok_wa then x := x + 15; n_wa := n_wa + 1; end if;
      if req then
        x := x + 30; n_req := n_req + 1;
        if prev is not null and rec.key::date = prev + 1 then run := run + 1; else run := 1; end if;
        prev := rec.key::date; best := greatest(best, run);
      else run := 0; prev := null; end if;
      if jsonb_typeof(r->'ch') = 'array' and jsonb_array_length(r->'ch') >= 4 then x := x + 25; n_ch := n_ch + 1; end if;
      if jsonb_typeof(r->'pc') = 'array' and jsonb_array_length(r->'pc') >= 4 then x := x + 20; pen := true; end if;
    end loop;
  end if;

  -- ---------- corpo ----------
  select exists (select 1 from jsonb_array_elements(case when jsonb_typeof(d->'body') = 'array' then d->'body' else '[]' end) b,
                       unnest(array['kg','cin','qua','pei','bra','cox','gor']) f
                  where jsonb_typeof(b->f) = 'number' and (b->>f)::numeric > 0) into medida;
  select (array_agg((b->>'kg')::numeric order by b->>'d'))[1], (array_agg((b->>'kg')::numeric order by b->>'d' desc))[1]
    into kg0, kg1
    from jsonb_array_elements(case when jsonb_typeof(d->'body') = 'array' then d->'body' else '[]' end) b
   where jsonb_typeof(b->'kg') = 'number' and (b->>'kg')::numeric between 20 and 400;
  if kg0 is not null then delta := case when meta in ('massa', 'forca') then kg1 - kg0 else kg0 - kg1 end; end if;

  -- ---------- dieta: dias com 3 refeições diferentes anotadas ----------
  if jsonb_typeof(d #> '{nutri,days}') = 'object' then
    select count(*) into diario from jsonb_each(d #> '{nutri,days}') nd
     where nd.key ~ '^\d{4}-\d{2}-\d{2}$' and nd.key::date between inicio and hoje
       and jsonb_typeof(nd.value->'items') = 'array'
       and (select count(distinct it->>'m') from jsonb_array_elements(nd.value->'items') it where coalesce(it->>'m', '') <> '') >= 3;
  end if;

  select * into nv from public.engefit_nivel(x);

  -- ---------- conquistas ----------
  if n_wk >= 1   then c := c || 't1'::text; end if;
  if n_wk >= 10  then c := c || 't10'::text; end if;
  if n_wk >= 50  then c := c || 't50'::text; end if;
  if n_wk >= 100 then c := c || 't100'::text; end if;
  if n_wk >= 250 then c := c || 't250'::text; end if;
  if vol >= 1000    then c := c || 'v1'::text; end if;
  if vol >= 10000   then c := c || 'v10'::text; end if;
  if vol >= 100000  then c := c || 'v100'::text; end if;
  if vol >= 500000  then c := c || 'v500'::text; end if;
  if n_pr >= 1   then c := c || 'r1'::text; end if;
  if n_pr >= 25  then c := c || 'r25'::text; end if;
  if n_pr >= 100 then c := c || 'r100'::text; end if;
  if best >= 3   then c := c || 's3'::text; end if;
  if best >= 7   then c := c || 's7'::text; end if;
  if best >= 30  then c := c || 's30'::text; end if;
  if best >= 100 then c := c || 's100'::text; end if;
  if n_req >= 1  then c := c || 'm1'::text; end if;
  if n_wa >= 30  then c := c || 'agua'::text; end if;
  if n_st >= 30  then c := c || 'passos'::text; end if;
  if n_ch >= 10  then c := c || 'desafio'::text; end if;
  if pen         then c := c || 'redencao'::text; end if;
  if nv.lv >= 5  then c := c || 'rD'::text; end if;
  if nv.lv >= 10 then c := c || 'rC'::text; end if;
  if nv.lv >= 20 then c := c || 'rB'::text; end if;
  if nv.lv >= 35 then c := c || 'rA'::text; end if;
  if nv.lv >= 55 then c := c || 'rS'::text; end if;
  if madr >= 10  then c := c || 'madrug'::text; end if;
  if coru >= 10  then c := c || 'coruja'::text; end if;
  if maxsets >= 30 then c := c || 'maratona'::text; end if;
  if medida      then c := c || 'medida'::text; end if;
  if delta >= 5  then c := c || 'transf'::text; end if;
  if diario >= 7 then c := c || 'diario'::text; end if;

  return jsonb_build_object('xp', x, 'lv', nv.lv, 'rk', nv.rk, 'conq', to_jsonb(c));
end $$;

-- compatibilidade: o XP vem da mesma avaliação
create or replace function public.engefit_calc_xp(d jsonb, criado timestamptz)
returns integer language sql stable set search_path = public as $$
  select (public.engefit_avaliar(d, criado)->>'xp')::int;
$$;

create or replace function public.engefit_xp_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare v jsonb; criado timestamptz; cq text[];
begin
  select created_at into criado from public.profiles where id = new.user_id;
  v := public.engefit_avaliar(new.data, criado);
  cq := array(select jsonb_array_elements_text(v->'conq'));
  perform set_config('engefit.srv', '1', true);
  update public.profiles set xp = (v->>'xp')::int, lv = (v->>'lv')::int, rk = v->>'rk', conq = cq
   where id = new.user_id and (xp, lv, rk, conq) is distinct from ((v->>'xp')::int, (v->>'lv')::int, v->>'rk', cq);
  perform set_config('engefit.srv', '', true);
  return new;
end $$;

create or replace function public.engefit_lock_username()
returns trigger language plpgsql as $$
begin
  if new.username is distinct from old.username then
    raise exception 'ENGEFIT: o nome de usuário não pode ser alterado';
  end if;
  if new.player_no is distinct from old.player_no then
    raise exception 'ENGEFIT: o número de jogador não pode ser alterado';
  end if;
  if coalesce(current_setting('engefit.srv', true), '') <> '1' then
    new.xp := old.xp; new.lv := old.lv; new.rk := old.rk; new.conq := old.conq;
  end if;
  return new;
end $$;

create or replace function public.engefit_xp_novo()
returns trigger language plpgsql as $$
begin new.xp := 0; new.lv := 1; new.rk := 'E'; new.conq := '{}'; return new; end $$;

revoke all on function public.engefit_avaliar(jsonb, timestamptz) from public, anon, authenticated;

-- recalcula todo mundo
do $$ declare u record; v jsonb;
begin
  perform set_config('engefit.srv', '1', true);
  for u in select p.id, p.created_at, d.data from public.profiles p join public.user_data d on d.user_id = p.id loop
    v := public.engefit_avaliar(u.data, u.created_at);
    update public.profiles set xp = (v->>'xp')::int, lv = (v->>'lv')::int, rk = v->>'rk',
           conq = array(select jsonb_array_elements_text(v->'conq'))
     where id = u.id;
  end loop;
  perform set_config('engefit.srv', '', true);
end $$;

select username, lv, rk, xp, cardinality(conq) as conquistas, conq from public.profiles order by lv desc, xp desc;
