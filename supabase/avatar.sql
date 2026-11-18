-- ENGEFIT · avatar público no perfil (personagem, pele, cabelo, rank e forma do corpo).
-- Rode uma vez no SQL Editor do Supabase. Sem isso o app funciona, mas os outros veem só a inicial.
alter table public.profiles
  add column if not exists avatar jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_avatar_size;
alter table public.profiles
  add constraint profiles_avatar_size check (pg_column_size(avatar) < 1024);
