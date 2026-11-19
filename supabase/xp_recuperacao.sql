-- ENGEFIT · XP validado pelo servidor + código de recuperação de conta.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- PARTE 1 · XP calculado no servidor
-- O ranking passa a usar xp/lv/rk desta tabela, que só o servidor escreve.
-- =====================================================================
alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles add column if not exists lv integer not null default 1;
alter table public.profiles add column if not exists rk text    not null default 'E';

-- Mesmas regras do app, com limites contra dados inventados:
--  · treino: 40 + 2 por série feita, máx. 100; contam no máximo 2 treinos por dia;
--  · dia: passos 15, água 15, missões obrigatórias 30, desafio 25, penalidade 20;
--  · nada no futuro, nada de mais de 180 dias antes da criação da conta;
--  · passos acima de 100 mil e água acima de 15 L não contam.
create or replace function public.engefit_calc_xp(d jsonb, criado timestamptz)
returns integer language plpgsql stable set search_path = public as $$
declare
  tz constant text := 'America/Sao_Paulo';
  hoje date := (now() at time zone tz)::date;
  inicio date := (coalesce(criado, now()) at time zone tz)::date - 180;
  meta text := coalesce(d #>> '{settings,goal}', 'saude');
  plano jsonb := d #> '{settings,plan}';
  stg integer;
  wg integer;
  kg numeric;
  x integer := 0;
  rec record;
  dias date[];
  r jsonb;
  st numeric; wa numeric;
  ok_st boolean; ok_wa boolean; treina boolean; treinou boolean; req boolean;
begin
  if d is null or jsonb_typeof(d) <> 'object' then return 0; end if;

  stg := case meta when 'emagrecer' then 10000 when 'condicionamento' then 9000
                   when 'massa' then 7000 when 'forca' then 7000 else 8000 end;
  select (e->>'kg')::numeric into kg
    from jsonb_array_elements(case when jsonb_typeof(d->'body') = 'array' then d->'body' else '[]' end) e
   where jsonb_typeof(e->'kg') = 'number' and (e->>'kg')::numeric > 0
   order by e->>'d' desc limit 1;
  wg := greatest(1500, least(4000, round(coalesce(kg * 35, 2000) / 250) * 250));

  -- treinos: dia local de cada um e XP pelo número de séries feitas (no máx. 2 por dia)
  select x + coalesce(sum(px) filter (where n <= 2), 0), coalesce(array_agg(distinct dia), '{}')
    into x, dias
    from (select dia, px, row_number() over (partition by dia order by px desc) n
            from (select (to_timestamp((w->>'start')::numeric / 1000) at time zone tz)::date dia,
                         least(100, 40 + 2 * (
                           select count(*)::int
                             from jsonb_array_elements(case when jsonb_typeof(w->'exs') = 'array' then w->'exs' else '[]' end) e,
                                  jsonb_array_elements(case when jsonb_typeof(e->'sets') = 'array' then e->'sets' else '[]' end) s
                            where s->'done' = 'true'::jsonb)) px
                    from jsonb_array_elements(case when jsonb_typeof(d->'workouts') = 'array' then d->'workouts' else '[]' end) w
                   where jsonb_typeof(w->'start') = 'number' and (w->>'start')::numeric between 0 and 9e12) a
           where dia between inicio and hoje) t;

  -- missões de cada dia registrado
  if jsonb_typeof(d->'daily') = 'object' then
    for rec in select key, value from jsonb_each(d->'daily') loop
      continue when rec.key !~ '^\d{4}-\d{2}-\d{2}$';
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
      treinou := rec.key::date = any(dias);
      req := ok_st and ok_wa and (not treina or treinou);
      if ok_st then x := x + 15; end if;
      if ok_wa then x := x + 15; end if;
      if req   then x := x + 30; end if;
      if jsonb_typeof(r->'ch') = 'array' and jsonb_array_length(r->'ch') >= 4 then x := x + 25; end if;
      if jsonb_typeof(r->'pc') = 'array' and jsonb_array_length(r->'pc') >= 4 then x := x + 20; end if;
    end loop;
  end if;
  return x;
end $$;

-- nível e rank a partir do XP (100 XP no nível 1, +20 a cada nível)
create or replace function public.engefit_nivel(x integer, out lv integer, out rk text)
language plpgsql immutable as $$
declare resto integer := greatest(coalesce(x, 0), 0);
begin
  lv := 1;
  while resto >= 100 + 20 * (lv - 1) loop resto := resto - (100 + 20 * (lv - 1)); lv := lv + 1; end loop;
  rk := case when lv >= 55 then 'S' when lv >= 35 then 'A' when lv >= 20 then 'B'
             when lv >= 10 then 'C' when lv >= 5 then 'D' else 'E' end;
end $$;

-- a cada salvamento dos dados, o servidor recalcula e grava no perfil
create or replace function public.engefit_xp_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare x integer; n record; criado timestamptz;
begin
  select created_at into criado from public.profiles where id = new.user_id;
  x := public.engefit_calc_xp(new.data, criado);
  select * into n from public.engefit_nivel(x);
  perform set_config('engefit.srv', '1', true);
  update public.profiles set xp = x, lv = n.lv, rk = n.rk
   where id = new.user_id and (xp, lv, rk) is distinct from (x, n.lv, n.rk);
  perform set_config('engefit.srv', '', true);
  return new;
end $$;
drop trigger if exists engefit_xp on public.user_data;
create trigger engefit_xp after insert or update of data on public.user_data
  for each row execute function public.engefit_xp_sync();

-- trava: usuário, número de jogador e XP não podem ser alterados pelo app
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
    new.xp := old.xp; new.lv := old.lv; new.rk := old.rk;
  end if;
  return new;
end $$;
-- (o gatilho que usa esta função já existe desde o usuario.sql)

-- cadastro novo não pode nascer com XP
create or replace function public.engefit_xp_novo()
returns trigger language plpgsql as $$
begin new.xp := 0; new.lv := 1; new.rk := 'E'; return new; end $$;
drop trigger if exists engefit_xp_novo on public.profiles;
create trigger engefit_xp_novo before insert on public.profiles
  for each row execute function public.engefit_xp_novo();

-- calcula para quem já tem conta
do $$ declare u record; x integer; n record;
begin
  perform set_config('engefit.srv', '1', true);
  for u in select p.id, p.created_at, d.data from public.profiles p join public.user_data d on d.user_id = p.id loop
    x := public.engefit_calc_xp(u.data, u.created_at);
    select * into n from public.engefit_nivel(x);
    update public.profiles set xp = x, lv = n.lv, rk = n.rk where id = u.id;
  end loop;
  perform set_config('engefit.srv', '', true);
end $$;

-- =====================================================================
-- PARTE 2 · Código de recuperação (sem e-mail)
-- O código só é mostrado uma vez; aqui fica apenas o hash (bcrypt).
-- =====================================================================
create table if not exists public.recovery (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.recovery_attempts (
  username text not null,
  at timestamptz not null default now()
);
create index if not exists recovery_attempts_idx on public.recovery_attempts(username, at);
-- sem políticas: ninguém lê nem escreve direto, só pelas funções abaixo
alter table public.recovery enable row level security;
alter table public.recovery_attempts enable row level security;
revoke all on public.recovery, public.recovery_attempts from anon, authenticated;

create or replace function public.engefit_codigo_aleatorio()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- sem 0/O e 1/I
  b bytea := gen_random_bytes(12);
  c text := '';
begin
  for i in 0..11 loop c := c || substr(abc, (get_byte(b, i) % 32) + 1, 1); end loop;
  return substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4);
end $$;

-- gera (ou troca) o código da própria conta; devolve o código uma única vez
create or replace function public.engefit_novo_codigo()
returns text language plpgsql volatile security definer set search_path = public, extensions as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'ENGEFIT: entre na conta primeiro'; end if;
  c := public.engefit_codigo_aleatorio();
  insert into public.recovery (user_id, code_hash, created_at)
  values (auth.uid(), crypt(replace(c, '-', ''), gen_salt('bf', 10)), now())
  on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return c;
end $$;

-- diz se a conta já tem código (sem revelar nada)
create or replace function public.engefit_tem_codigo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.recovery where user_id = auth.uid());
$$;

-- troca a senha com usuário + código; devolve um código NOVO (o antigo deixa de valer).
-- Responde {"ok":true,"codigo":...} ou {"ok":false,"erro":"invalido"|"tentativas"|"senha"}.
-- Não dispara erro de propósito: assim a tentativa errada fica registrada (limite de 5 por hora).
drop function if exists public.engefit_recuperar(text, text, text);
create or replace function public.engefit_recuperar(p_usuario text, p_codigo text, p_senha text)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  un text := lower(trim(both from replace(coalesce(p_usuario, ''), '@', '')));
  cod text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  uid uuid; h text; novo text;
begin
  if length(coalesce(p_senha, '')) < 6 then return jsonb_build_object('ok', false, 'erro', 'senha'); end if;
  delete from public.recovery_attempts where at < now() - interval '1 day';
  if (select count(*) from public.recovery_attempts where username = un and at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'erro', 'tentativas');
  end if;
  insert into public.recovery_attempts (username) values (un);

  select p.id into uid from public.profiles p where p.username = un;
  if uid is not null then select r.code_hash into h from public.recovery r where r.user_id = uid; end if;
  if h is null then
    perform crypt(cod, gen_salt('bf', 10));  -- mesmo tempo de resposta, exista o usuário ou não
    return jsonb_build_object('ok', false, 'erro', 'invalido');
  end if;
  if length(cod) <> 12 or crypt(cod, h) <> h then
    return jsonb_build_object('ok', false, 'erro', 'invalido');
  end if;

  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf', 10)), updated_at = now() where id = uid;
  delete from auth.sessions where user_id = uid;          -- desconecta os outros aparelhos
  delete from public.recovery_attempts where username = un;
  novo := public.engefit_codigo_aleatorio();
  update public.recovery set code_hash = crypt(replace(novo, '-', ''), gen_salt('bf', 10)), created_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'codigo', novo);
end $$;

-- só para o administrador (no SQL Editor): select public.engefit_admin_senha('usuario', 'senhaNova');
create or replace function public.engefit_admin_senha(p_usuario text, p_senha text)
returns text language plpgsql volatile security definer set search_path = public, extensions as $$
declare uid uuid;
begin
  if length(coalesce(p_senha, '')) < 6 then raise exception 'ENGEFIT: senha curta'; end if;
  select id into uid from public.profiles where username = lower(trim(p_usuario));
  if uid is null then raise exception 'ENGEFIT: usuário não encontrado'; end if;
  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf', 10)), updated_at = now() where id = uid;
  delete from auth.sessions where user_id = uid;
  return 'Senha trocada para @' || lower(trim(p_usuario));
end $$;

revoke all on function public.engefit_calc_xp(jsonb, timestamptz), public.engefit_codigo_aleatorio(),
  public.engefit_admin_senha(text, text), public.engefit_xp_sync() from public, anon, authenticated;
revoke all on function public.engefit_novo_codigo(), public.engefit_tem_codigo() from public, anon;
grant execute on function public.engefit_novo_codigo(), public.engefit_tem_codigo() to authenticated;
revoke all on function public.engefit_recuperar(text, text, text) from public;
grant execute on function public.engefit_recuperar(text, text, text) to anon, authenticated;

select username, player_no, lv, rk, xp from public.profiles order by lv desc, xp desc;
