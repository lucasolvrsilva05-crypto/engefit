-- ENGEFIT social: perfis, seguidores, treinos publicados e curtidas.
-- Rode uma vez no SQL Editor do Supabase (pode rodar de novo sem problema).

-- ---------- Tabelas ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  name text not null default '' check (char_length(name) <= 60),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id text not null,
  name text not null check (char_length(name) <= 120),
  started_at timestamptz not null,
  duration_s integer not null default 0,
  volume_kg numeric not null default 0,
  sets integer not null default 0,
  prs integer not null default 0,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, workout_id)
);
create index if not exists posts_user_started_idx on public.posts(user_id, started_at desc);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists likes_post_idx on public.likes(post_id);

-- ---------- Funções ----------
-- Quem pode ver os treinos de "owner": o próprio dono, qualquer um se o perfil for público,
-- ou seguidores aceitos se o perfil for privado.
create or replace function public.can_see(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
    or exists (select 1 from profiles p where p.id = owner and not p.is_private)
    or exists (select 1 from follows f
               where f.follower_id = auth.uid() and f.following_id = owner and f.status = 'accepted');
$$;

-- Contadores do perfil (aparecem mesmo em perfis privados, como no Hevy).
create or replace function public.profile_stats(uid uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'followers', (select count(*) from follows where following_id = uid and status = 'accepted'),
    'following', (select count(*) from follows where follower_id = uid and status = 'accepted'),
    'workouts',  (select count(*) from posts where user_id = uid));
$$;

-- Ao seguir: perfil privado vira pedido pendente; público é aceito na hora.
-- O próprio banco decide, então ninguém consegue se auto-aprovar.
create or replace function public.follows_set_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := case when coalesce((select is_private from profiles where id = new.following_id), false)
                     then 'pending' else 'accepted' end;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists follows_status on public.follows;
create trigger follows_status before insert on public.follows
  for each row execute function public.follows_set_status();

-- Ao deixar o perfil público, os pedidos pendentes são aceitos.
create or replace function public.profiles_open_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.is_private and not new.is_private then
    update follows set status = 'accepted' where following_id = new.id and status = 'pending';
  end if;
  return new;
end $$;
drop trigger if exists profiles_open on public.profiles;
create trigger profiles_open after update of is_private on public.profiles
  for each row execute function public.profiles_open_requests();

-- ---------- Regras de acesso (RLS) ----------
alter table public.profiles enable row level security;
alter table public.follows  enable row level security;
alter table public.posts    enable row level security;
alter table public.likes    enable row level security;

drop policy if exists "perfis visiveis para usuarios logados" on public.profiles;
drop policy if exists "criar o proprio perfil" on public.profiles;
drop policy if exists "editar o proprio perfil" on public.profiles;
create policy "perfis visiveis para usuarios logados" on public.profiles
  for select to authenticated using (true);
create policy "criar o proprio perfil" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "editar o proprio perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "ver as proprias relacoes" on public.follows;
drop policy if exists "seguir alguem" on public.follows;
drop policy if exists "aceitar pedidos" on public.follows;
drop policy if exists "deixar de seguir ou remover seguidor" on public.follows;
create policy "ver as proprias relacoes" on public.follows
  for select to authenticated using (follower_id = auth.uid() or following_id = auth.uid());
create policy "seguir alguem" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());
create policy "aceitar pedidos" on public.follows
  for update to authenticated using (following_id = auth.uid()) with check (following_id = auth.uid());
create policy "deixar de seguir ou remover seguidor" on public.follows
  for delete to authenticated using (follower_id = auth.uid() or following_id = auth.uid());

drop policy if exists "ver treinos permitidos" on public.posts;
drop policy if exists "publicar os proprios treinos" on public.posts;
drop policy if exists "editar os proprios treinos" on public.posts;
drop policy if exists "apagar os proprios treinos" on public.posts;
create policy "ver treinos permitidos" on public.posts
  for select to authenticated using (public.can_see(user_id));
create policy "publicar os proprios treinos" on public.posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "editar os proprios treinos" on public.posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "apagar os proprios treinos" on public.posts
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "ver curtidas de treinos visiveis" on public.likes;
drop policy if exists "curtir treinos visiveis" on public.likes;
drop policy if exists "descurtir" on public.likes;
create policy "ver curtidas de treinos visiveis" on public.likes
  for select to authenticated using (exists (select 1 from public.posts p where p.id = likes.post_id));
create policy "curtir treinos visiveis" on public.likes
  for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = likes.post_id));
create policy "descurtir" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Permissões ----------
grant select, insert, update, delete on public.profiles, public.posts, public.likes to authenticated;
grant select, insert, delete on public.follows to authenticated;
revoke update on public.follows from authenticated;
grant update (status) on public.follows to authenticated;   -- quem é seguido só pode mudar o status
revoke all on public.profiles, public.follows, public.posts, public.likes from anon;
revoke execute on function public.profile_stats(uuid) from anon, public;
grant execute on function public.profile_stats(uuid) to authenticated;
revoke execute on function public.can_see(uuid) from anon, public;
grant execute on function public.can_see(uuid) to authenticated;
