-- Pega todo esto en Supabase > SQL Editor > Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  titulo text not null default 'Iniciático',
  grado int not null default 0,            -- 0 Iniciático, 1 DeMolay, 2 Caballero del Priorato
  aprobado boolean not null default false,
  es_admin boolean not null default false,
  created_at timestamptz default now()
);
create table public.codigos (codigo text primary key, usado boolean not null default false);
create table public.noticias (
  id bigint generated always as identity primary key,
  titulo text not null, resumen text, cuerpo text, imagen_url text,
  min_grado int not null default 0, created_at timestamptz default now()
);
create table public.eventos (
  id bigint generated always as identity primary key,
  fecha date not null, titulo text not null, lugar text,
  departamental boolean not null default false, min_grado int not null default 0
);

create function public.mi_grado() returns int language sql stable security definer set search_path = public as
$$ select coalesce((select grado from profiles where id = auth.uid() and aprobado), -1) $$;
create function public.soy_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select es_admin from profiles where id = auth.uid() and aprobado), false) $$;

-- Solo se registra quien tenga un código de invitación válido
create function public.nuevo_usuario() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update codigos set usado = true where codigo = new.raw_user_meta_data->>'codigo' and not usado;
  if not found then raise exception 'Codigo de invitacion invalido'; end if;
  insert into profiles (id, nombre) values (new.id, coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'));
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.nuevo_usuario();

-- Seguridad: cada tabla solo responde a quien corresponde
alter table profiles enable row level security;
alter table codigos  enable row level security;
alter table noticias enable row level security;
alter table eventos  enable row level security;

create policy "ver mi perfil"   on profiles for select using (id = auth.uid());
create policy "ver perfiles"    on profiles for select using (mi_grado() >= 0);
create policy "admin perfiles"  on profiles for all using (soy_admin()) with check (soy_admin());
create policy "admin codigos"   on codigos  for all using (soy_admin()) with check (soy_admin());
create policy "leer noticias"   on noticias for select using (mi_grado() >= min_grado);
create policy "admin noticias"  on noticias for all using (soy_admin()) with check (soy_admin());
create policy "leer eventos"    on eventos  for select using (mi_grado() >= min_grado);
create policy "admin eventos"   on eventos  for all using (soy_admin()) with check (soy_admin());

-- Primer código (cámbialo por uno tuyo) y datos de ejemplo
insert into codigos (codigo) values ('PRIMAXC377-2027');
insert into noticias (titulo, resumen, cuerpo, min_grado) values
 ('Bienvenidos', 'La página del capítulo ya está en marcha', 'Texto completo de la noticia de bienvenida.', 0);
insert into eventos (fecha, titulo, lugar, departamental, min_grado) values
 (current_date + 14, 'Ceremonia departamental (ejemplo)', 'Sucre', true, 0);
