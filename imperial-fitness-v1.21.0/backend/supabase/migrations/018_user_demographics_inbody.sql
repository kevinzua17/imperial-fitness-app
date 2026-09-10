-- Adds demographic fields needed for BMI/BMR/InBody-style calculations.
alter table public.users add column if not exists age integer;
alter table public.users add column if not exists gender varchar(10);

alter table public.users drop constraint if exists users_age_check;
alter table public.users add constraint users_age_check check (age is null or age between 10 and 100);

alter table public.users drop constraint if exists users_gender_check;
alter table public.users add constraint users_gender_check check (gender is null or gender in ('M', 'F'));

alter table public.body_metrics drop constraint if exists body_metrics_visceral_fat_check;
alter table public.body_metrics add constraint body_metrics_visceral_fat_check check (visceral_fat is null or visceral_fat between 1 and 20);
