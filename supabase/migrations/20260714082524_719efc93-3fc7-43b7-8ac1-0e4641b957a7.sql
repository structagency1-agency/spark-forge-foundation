REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO service_role;