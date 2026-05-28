-- Setup: verify pgTAP is available
BEGIN;
SELECT plan(1);
SELECT pass('pgTAP loaded — test infrastructure ready');
SELECT * FROM finish();
ROLLBACK;
