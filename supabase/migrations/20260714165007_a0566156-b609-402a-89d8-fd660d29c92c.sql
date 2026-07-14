-- Cancel pre-existing duplicates (keep earliest active per event/regno)
WITH ranked AS (
  SELECT r.id AS reg_id,
         row_number() OVER (
           PARTITION BY r.event_id, lower(tm.registration_number)
           ORDER BY r.registered_at
         ) AS rn
  FROM public.registrations r
  JOIN public.team_members tm ON tm.team_id = r.team_id
  WHERE tm.registration_number IS NOT NULL
    AND btrim(tm.registration_number) <> ''
    AND r.status <> 'cancelled'
)
UPDATE public.registrations r
   SET status = 'cancelled'
  FROM ranked
 WHERE ranked.rn > 1 AND r.id = ranked.reg_id;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_regno_per_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_conflict int;
BEGIN
  IF NEW.registration_number IS NULL OR btrim(NEW.registration_number) = '' THEN
    RETURN NEW;
  END IF;

  SELECT event_id INTO v_event_id
    FROM public.registrations
   WHERE team_id = NEW.team_id
   LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_conflict
    FROM public.team_members tm
    JOIN public.registrations r ON r.team_id = tm.team_id
   WHERE r.event_id = v_event_id
     AND r.status <> 'cancelled'
     AND lower(tm.registration_number) = lower(NEW.registration_number)
     AND tm.id <> NEW.id;

  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'regno_already_registered_for_event' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_regno ON public.team_members;
CREATE TRIGGER trg_prevent_duplicate_regno
  BEFORE INSERT OR UPDATE OF registration_number ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_regno_per_event();
