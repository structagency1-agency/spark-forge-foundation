
-- Extend app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'iedc_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ecell_member';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'participant';
