
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS downloaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS download_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.track_certificate_download(_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.certificates
     SET downloaded_at = now(), download_count = download_count + 1
   WHERE certificate_code = _code;
$$;

CREATE OR REPLACE FUNCTION public.track_certificate_verification(_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.certificates
     SET verified_at = now(), verification_count = verification_count + 1
   WHERE certificate_code = _code;
$$;
