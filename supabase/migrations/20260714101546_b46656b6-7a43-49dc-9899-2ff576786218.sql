
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure::text AS sig
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN (
             'analytics_overview','analytics_by_event','analytics_by_department',
             'registration_trends','attendance_analytics','evaluation_analytics',
             'certificate_analytics','attendance_stats','evaluation_stats',
             'event_leaderboard','auto_assign_teams','mark_attendance_by_qr',
             'mark_attendance_manual','save_evaluation_score','submit_evaluation',
             'upsert_evaluation','set_evaluation_lock','publish_event_evaluations',
             'publish_results','unpublish_results','hide_results','archive_results',
             'generate_certificates','generate_scorecards','db_health',
             'recompute_evaluation_totals','next_certificate_code',
             'generate_registration_code'
           )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
