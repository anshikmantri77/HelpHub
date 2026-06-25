-- Migration 0004: Enforce status transitions at the database level via trigger.
-- Matches the TRANSITIONS object in packages/shared/src/stateMachine.ts exactly:
--   open       → in_progress only
--   in_progress→ resolved only
--   resolved   → closed OR reopened
--   reopened   → in_progress only
--   closed     → no transitions allowed

CREATE OR REPLACE FUNCTION enforce_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fires when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'open' AND NEW.status NOT IN ('in_progress') THEN
    RAISE EXCEPTION 'Invalid transition from open to %', NEW.status;
  ELSIF OLD.status = 'in_progress' AND NEW.status NOT IN ('resolved') THEN
    RAISE EXCEPTION 'Invalid transition from in_progress to %', NEW.status;
  ELSIF OLD.status = 'resolved' AND NEW.status NOT IN ('closed', 'reopened') THEN
    RAISE EXCEPTION 'Invalid transition from resolved to %', NEW.status;
  ELSIF OLD.status = 'reopened' AND NEW.status NOT IN ('in_progress') THEN
    RAISE EXCEPTION 'Invalid transition from reopened to %', NEW.status;
  ELSIF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'No transitions allowed from closed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists (idempotent migration)
DROP TRIGGER IF EXISTS status_transition_trigger ON tickets;

CREATE TRIGGER status_transition_trigger
BEFORE UPDATE OF status ON tickets
FOR EACH ROW
EXECUTE FUNCTION enforce_status_transition();
