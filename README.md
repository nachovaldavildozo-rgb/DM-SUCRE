# Página del Capítulo Primax Charcas 377

Sitio sin compilación: HTML + JS + Supabase. Acceso solo con cuenta aprobada.

## Puesta en marcha (todo gratis)
1. **Supabase**: crea un proyecto. En *SQL Editor*, pega todo `supabase/schema.sql` y ejecútalo.
   En *Authentication > Providers > Email*, desactiva "Confirm email" (la aprobación manual ya protege el acceso).
2. En *Project Settings > API* copia la **URL** y la clave **pública** (anon / publishable) a `config.js`.
   Nunca uses ahí la clave `service_role` / secret.
3. **GitHub**: crea un repositorio **privado** y sube estos archivos.
4. **Vercel**: *Add New > Project*, importa el repositorio y pulsa *Deploy*.
5. Abre la dirección que te da Vercel, elige "Crear cuenta" y regístrate con el código `CAMBIA-ESTE-CODIGO`
   (cámbialo antes en el SQL por uno tuyo).
6. Hazte administrador: en Supabase *SQL Editor* ejecuta
   `update profiles set aprobado = true, es_admin = true, grado = 2, titulo = 'Tu título' where id = (select id from auth.users where email = 'TU-CORREO');`
7. Para cada hermano nuevo: crea un código en la tabla `codigos`, entrégaselo, y cuando se registre aprueba su cuenta en *Table Editor > profiles* (`aprobado = true`, su `grado` y su `titulo`).

## Seguridad
- Activa la verificación en dos pasos en GitHub, Supabase y Vercel.
- Las reglas de acceso viven en la base de datos (Row Level Security), no en el navegador.
- Noticias y eventos se cargan desde *Table Editor* por ahora; el panel de administración viene en la siguiente etapa.
