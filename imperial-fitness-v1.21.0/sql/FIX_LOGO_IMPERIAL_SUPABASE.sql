-- Ejecutar en Supabase > SQL Editor después de desplegar el frontend en Vercel.
-- Reemplaza TU_URL_DE_VERCEL por tu URL real de Vercel.
-- Ejemplo: https://imperial-fitness-app-2-git-main-kebin-zua-s-projects.vercel.app

insert into public.app_settings (key, value)
values ('gym_logo_url', 'https://TU_URL_DE_VERCEL/logo-imperial-fitness.png')
on conflict (key) do update set value = excluded.value;

-- Opcional: dejar el nombre de marca consistente
insert into public.app_settings (key, value)
values ('gym_name', 'IMPERIAL FITNESS')
on conflict (key) do update set value = excluded.value;
