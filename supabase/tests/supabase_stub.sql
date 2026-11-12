-- Nachbildung der Supabase-Umgebung für lokale Tests
drop database if exists qhtest;
create database qhtest;
\c qhtest
create role anon nologin; create role authenticated nologin;
create schema extensions; create extension pgcrypto with schema extensions;
create schema auth;
create table auth.users (instance_id uuid, id uuid primary key, aud text, role text, email text unique, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
  confirmation_token text, email_change text, email_change_token_new text, recovery_token text);
create table auth.identities (id uuid primary key, user_id uuid references auth.users(id) on delete cascade, identity_data jsonb, provider text,
  provider_id text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
