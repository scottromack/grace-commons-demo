// Audit tamper-detection tests.
//
// Verifies that verify_record catches every class of mutation named in
// BUILD_PLAN.md §12 (audit_tamper.test.ts):
//   - data_json mutated
//   - attestation mutated
//   - row_hash mutated
//   - a row spliced out (chain break)
//   - a forged row spliced in
//
// Each test uses an isolated in-memory SQLite DB. The schema is the full
// audit_event + actor schema WITHOUT the immutable UPDATE/DELETE triggers —
// those triggers enforce runtime integrity; here we want to test that the
// application-layer verify_record function catches what the triggers prevent
// at runtime.

import { assertEquals } from "jsr:@std/assert";
import { Database } from "@db/sqlite";
import {
  record_action,
  verify_record,
  type RetentionPolicy,
} from "../src/domain/audit_trail.ts";

// ---------------------------------------------------------------------------
// Test DB setup
// ---------------------------------------------------------------------------

const TEST_ACTOR_REF = "test_actor";
const TEST_SECRET = "test_secret_hmac_key_32_bytes!!!";
const TEST_RETENTION: RetentionPolicy = "sox_7_year";

function makeTestDb(): Database {
  const db = new Database(":memory:");

  // Minimal schema: actor + audit_event WITHOUT immutable triggers.
  // The triggers enforce runtime writes; verify_record catches what
  // they would have prevented.
  db.exec(`
    CREATE TABLE actor (
      actor_ref          TEXT PRIMARY KEY,
      kind               TEXT NOT NULL,
      display_name       TEXT NOT NULL,
      credential_public  TEXT NOT NULL,
      credential_secret  TEXT NOT NULL,
      registered_at      TEXT NOT NULL
    );

    CREATE TABLE audit_event (
      event_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      seq              INTEGER NOT NULL UNIQUE,
      action_ref       TEXT NOT NULL,
      actor_ref        TEXT NOT NULL REFERENCES actor(actor_ref),
      chain_id         TEXT NULL,
      step_id          TEXT NULL,
      recorded_at      TEXT NOT NULL,
      data_json        TEXT NOT NULL,
      retention_policy TEXT NOT NULL,
      retention_until  TEXT NOT NULL,
      attestation      TEXT NOT NULL,
      prev_row_hash    TEXT NOT NULL,
      row_hash         TEXT NOT NULL
    );

    INSERT INTO actor VALUES (
      '${TEST_ACTOR_REF}', 'human', 'Test Actor',
      'pub_test', '${TEST_SECRET}', '2024-01-01T00:00:00.000Z'
    );
  `);

  return db;
}

function insertThreeEvents(db: Database): void {
  for (let i = 0; i < 3; i++) {
    record_action(
      {
        action_ref: "chain_initiated",
        actor_ref: TEST_ACTOR_REF,
        credential_secret: TEST_SECRET,
        chain_id: `chain-00${i + 1}`,
        data: { subject_ref: `subject-${i + 1}`, seq_label: i + 1 },
        retention_policy: TEST_RETENTION,
      },
      db,
    );
  }
}

// ---------------------------------------------------------------------------
// Baseline — three clean rows must verify
// ---------------------------------------------------------------------------

Deno.test("verify_record: clean chain verifies", () => {
  const db = makeTestDb();
  insertThreeEvents(db);

  const rows = db.prepare("SELECT event_id FROM audit_event ORDER BY seq").all() as { event_id: number }[];
  assertEquals(rows.length, 3);

  for (const { event_id } of rows) {
    assertEquals(verify_record(event_id, db), "verified");
  }
});

// ---------------------------------------------------------------------------
// data_json mutated
// ---------------------------------------------------------------------------

Deno.test("verify_record: detects data_json mutation", () => {
  const db = makeTestDb();
  insertThreeEvents(db);

  // Mutate row 2
  db.exec(`UPDATE audit_event SET data_json = '{"tampered":true}' WHERE seq = 2`);

  const { event_id } = db.prepare(
    "SELECT event_id FROM audit_event WHERE seq = 2",
  ).get() as { event_id: number };

  const result = verify_record(event_id, db);
  assertEquals(result.startsWith("failed-verification"), true, `expected failure, got: ${result}`);
});

// ---------------------------------------------------------------------------
// attestation mutated (leaves data intact, breaks HMAC)
// ---------------------------------------------------------------------------

Deno.test("verify_record: detects attestation mutation", () => {
  const db = makeTestDb();
  insertThreeEvents(db);

  db.exec(`UPDATE audit_event SET attestation = 'deadbeef' WHERE seq = 2`);

  const { event_id } = db.prepare(
    "SELECT event_id FROM audit_event WHERE seq = 2",
  ).get() as { event_id: number };

  const result = verify_record(event_id, db);
  assertEquals(result.startsWith("failed-verification"), true, `expected failure, got: ${result}`);
});

// ---------------------------------------------------------------------------
// row_hash mutated (breaks the chain at that link)
// ---------------------------------------------------------------------------

Deno.test("verify_record: detects row_hash mutation", () => {
  const db = makeTestDb();
  insertThreeEvents(db);

  // Mutate row 1's row_hash — this breaks the chain at row 2
  // (row 2's prev_row_hash no longer matches)
  const badHash = "a".repeat(64);
  db.exec(`UPDATE audit_event SET row_hash = '${badHash}' WHERE seq = 1`);

  // Verify row 3 — must walk from seq 1 and fail at seq 2
  const { event_id } = db.prepare(
    "SELECT event_id FROM audit_event WHERE seq = 3",
  ).get() as { event_id: number };

  const result = verify_record(event_id, db);
  assertEquals(result.startsWith("failed-verification"), true, `expected failure, got: ${result}`);
});

// ---------------------------------------------------------------------------
// Row spliced out (seq gap breaks the chain)
// ---------------------------------------------------------------------------

Deno.test("verify_record: detects spliced-out row (seq gap)", () => {
  const db = makeTestDb();
  insertThreeEvents(db);

  // Remove row 2 — row 3's prev_row_hash now points at row 1's hash,
  // but verify_record will see row 1 then row 3 and the prev_row_hash
  // on row 3 won't match row 1's row_hash.
  db.exec(`DELETE FROM audit_event WHERE seq = 2`);

  const { event_id } = db.prepare(
    "SELECT event_id FROM audit_event WHERE seq = 3",
  ).get() as { event_id: number };

  const result = verify_record(event_id, db);
  assertEquals(result.startsWith("failed-verification"), true, `expected failure, got: ${result}`);
});

// ---------------------------------------------------------------------------
// Forged row spliced in (mismatched hashes)
// ---------------------------------------------------------------------------

Deno.test("verify_record: detects forged row spliced in", () => {
  const db = makeTestDb();
  insertThreeEvents(db);

  // Insert a forged row between seq 1 and 2 by renumbering and inserting
  // a crafted row with a fake hash chain — the attestation will be wrong
  db.exec(`UPDATE audit_event SET seq = 99 WHERE seq = 2`);
  db.exec(`UPDATE audit_event SET seq = 100 WHERE seq = 3`);

  // Insert a forged row at seq 2 with a plausible-looking but wrong hash
  const prevHash = (db.prepare("SELECT row_hash FROM audit_event WHERE seq = 1").get() as { row_hash: string }).row_hash;
  const fakeHash = "b".repeat(64);
  db.prepare(`
    INSERT INTO audit_event
      (seq, action_ref, actor_ref, chain_id, step_id, recorded_at,
       data_json, retention_policy, retention_until,
       attestation, prev_row_hash, row_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    2, "chain_initiated", TEST_ACTOR_REF, "forged-chain", null,
    "2024-01-01T00:00:00.000Z", '{"forged":true}',
    "sox_7_year", "2031-01-01T00:00:00.000Z",
    "fake_attestation_not_valid_hmac",
    prevHash,
    fakeHash,
  );

  // Verify row at seq 99 (original row 2) — chain breaks at the forged seq 2
  const { event_id } = db.prepare(
    "SELECT event_id FROM audit_event WHERE seq = 99",
  ).get() as { event_id: number };

  const result = verify_record(event_id, db);
  assertEquals(result.startsWith("failed-verification"), true, `expected failure, got: ${result}`);
});
