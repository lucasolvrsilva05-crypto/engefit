-- ENGEFIT · login só com nome de usuário e senha (sem e-mail).
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- Como funciona: o Supabase exige um "e-mail" interno em cada conta. O app usa um endereço
-- técnico montado a partir do @usuário (ex.: lucas.fit -> lucas-fit@engefit.vercel.app).
-- Esse endereço não existe e não recebe nada; nenhum e-mail real fica guardado no banco.

-- 1) Cadastro cria o perfil na mesma operação. Se o @usuário já existir, o cadastro inteiro é recusado.
--    Também recusa qualquer conta criada com e-mail de verdade.
create or replace function public.engefit_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  un text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
begin
  if un !~ '^[a-z0-9_.]{3,20}$' then
    raise exception 'ENGEFIT: nome de usuário inválido';
  end if;
  if new.email is distinct from replace(un, '.', '-') || '@engefit.vercel.app' then
    raise exception 'ENGEFIT: cadastro só com nome de usuário';
  end if;
  insert into public.profiles (id, username, name, is_private)
  values (new.id, un,
          left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Atleta'), 60),
          coalesce((new.raw_user_meta_data->>'private')::boolean, false));
  return new;
end $$;

drop trigger if exists engefit_on_auth_user_created on auth.users;
create trigger engefit_on_auth_user_created
  after insert on auth.users
  for each row execute function public.engefit_new_user();

-- 2) Saber se um @usuário está livre (só responde sim/não).
create or replace function public.username_available(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(trim(u)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- 3) O @usuário é o login: não pode ser trocado depois.
create or replace function public.engefit_lock_username()
returns trigger language plpgsql as $$
begin
  if new.username is distinct from old.username then
    raise exception 'ENGEFIT: o nome de usuário não pode ser alterado';
  end if;
  return new;
end $$;
drop trigger if exists engefit_lock_username on public.profiles;
create trigger engefit_lock_username
  before update on public.profiles
  for each row execute function public.engefit_lock_username();

-- 4) Contas que já existem: troca o e-mail real pelo endereço técnico do @usuário
--    (quem já tem conta passa a entrar com @usuário e a mesma senha) e apaga o e-mail real.
update auth.users u
set email = replace(p.username, '.', '-') || '@engefit.vercel.app',
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    email_change = '', email_change_token_new = '', email_change_token_current = '',
    raw_user_meta_data = (coalesce(u.raw_user_meta_data, '{}'::jsonb) - 'email') || jsonb_build_object('username', p.username)
from public.profiles p
where p.id = u.id;

update auth.identities i
set identity_data = (coalesce(i.identity_data, '{}'::jsonb) - 'email') || jsonb_build_object('email', u.email, 'email_verified', true),
    provider_id = u.id::text
from auth.users u
where i.user_id = u.id and i.provider = 'email';

-- 5) O registro de atividade do login também guarda e-mails antigos: limpa.
delete from auth.audit_log_entries;

-- 6) Confira: contas que nunca escolheram @usuário continuam com e-mail real e não conseguem entrar.
--    Veja quantas são; se forem só testes, apague em Authentication > Users.
select id, created_at from auth.users
where id not in (select id from public.profiles);
