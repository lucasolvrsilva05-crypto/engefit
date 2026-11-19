-- ENGEFIT · número de jogador por ordem de chegada (1, 2, 3...).
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.

create sequence if not exists public.player_no_seq;
alter table public.profiles add column if not exists player_no bigint;

-- quem já tem conta recebe o número pela data de cadastro
with base as (select coalesce(max(player_no), 0) as m from public.profiles),
     fila as (select id, row_number() over (order by created_at, id) as rn
              from public.profiles where player_no is null)
update public.profiles p set player_no = base.m + fila.rn
from base, fila where p.id = fila.id;

-- próximos cadastros continuam a contagem automaticamente
select setval('public.player_no_seq', coalesce((select max(player_no) from public.profiles), 0) + 1, false);
alter table public.profiles alter column player_no set default nextval('public.player_no_seq');
alter table public.profiles alter column player_no set not null;
create unique index if not exists profiles_player_no_key on public.profiles(player_no);

-- o número é permanente: ninguém consegue trocar
create or replace function public.engefit_lock_username()
returns trigger language plpgsql as $$
begin
  if new.username is distinct from old.username then
    raise exception 'ENGEFIT: o nome de usuário não pode ser alterado';
  end if;
  if new.player_no is distinct from old.player_no then
    raise exception 'ENGEFIT: o número de jogador não pode ser alterado';
  end if;
  return new;
end $$;

select player_no, username, created_at from public.profiles order by player_no;
