// Seed script — idempotent, safe to re-run.
//
// Step 2: actors + permission_grants only.
// Step 10 will extend this file with the three demo chains.
//
// Usage: deno task seed

import { db, tx } from "./client.ts";

const now = new Date().toISOString();

// ---------------------------------------------------------------------------
// Actors
// Per BUILD_PLAN.md §11. credential_secret is a stand-in HMAC key; in a
// real deployment this would be a proper secret — not hardcoded.
// ---------------------------------------------------------------------------

const actors = [
  // Application actor — used for chain_resolved / cascade_completed audit
  // attribution. No permission grants; its writes are application-initiated.
  {
    actor_ref: "system@demo",
    kind: "application",
    display_name: "System (Demo)",
    credential_public: "pub_system_demo",
    credential_secret: "sec_system_demo_hmac_key_32bytes!",
  },

  // SOX journal-entry walkthrough
  {
    actor_ref: "controller_morgan",
    kind: "human",
    display_name: "Morgan (Controller)",
    credential_public: "pub_controller_morgan",
    credential_secret: "sec_controller_morgan_hmac_32b!!",
  },
  {
    actor_ref: "finance_director_chen",
    kind: "human",
    display_name: "Chen (Finance Director)",
    credential_public: "pub_finance_director_chen",
    credential_secret: "sec_finance_director_chen_32by!!",
  },
  {
    actor_ref: "cfo_park",
    kind: "human",
    display_name: "Park (CFO)",
    credential_public: "pub_cfo_park",
    credential_secret: "sec_cfo_park_hmac_key_32bytes!!!",
  },
  {
    actor_ref: "ceo_walsh",
    kind: "human",
    display_name: "Walsh (CEO)",
    credential_public: "pub_ceo_walsh",
    credential_secret: "sec_ceo_walsh_hmac_key_32bytes!!",
  },

  // FDA Part 11 batch-release walkthrough
  {
    actor_ref: "qa_manager",
    kind: "human",
    display_name: "QA Manager",
    credential_public: "pub_qa_manager",
    credential_secret: "sec_qa_manager_hmac_key_32bytes!",
  },
  {
    actor_ref: "qp_santos",
    kind: "human",
    display_name: "Santos (QP)",
    credential_public: "pub_qp_santos",
    credential_secret: "sec_qp_santos_hmac_key_32bytes!!",
  },
  {
    actor_ref: "qp_lopez",
    kind: "human",
    display_name: "Lopez (QP)",
    credential_public: "pub_qp_lopez",
    credential_secret: "sec_qp_lopez_hmac_key_32bytes!!!",
  },
  {
    actor_ref: "qp_kim",
    kind: "human",
    display_name: "Kim (QP)",
    credential_public: "pub_qp_kim",
    credential_secret: "sec_qp_kim_hmac_key_32bytes!!!!",
  },

  // ICH GCP deviation walkthrough
  {
    actor_ref: "coordinator_lee",
    kind: "human",
    display_name: "Lee (Coordinator)",
    credential_public: "pub_coordinator_lee",
    credential_secret: "sec_coordinator_lee_hmac_32by!!",
  },
  {
    actor_ref: "pi_okafor",
    kind: "human",
    display_name: "Okafor (PI)",
    credential_public: "pub_pi_okafor",
    credential_secret: "sec_pi_okafor_hmac_key_32bytes!",
  },
  {
    actor_ref: "pi_chen",
    kind: "human",
    display_name: "Chen (PI)",
    credential_public: "pub_pi_chen",
    credential_secret: "sec_pi_chen_hmac_key_32bytes!!!",
  },
  {
    actor_ref: "pi_mueller",
    kind: "human",
    display_name: "Müller (PI)",
    credential_public: "pub_pi_mueller",
    credential_secret: "sec_pi_mueller_hmac_key_32bytes!",
  },
  {
    actor_ref: "pi_singh",
    kind: "human",
    display_name: "Singh (PI)",
    credential_public: "pub_pi_singh",
    credential_secret: "sec_pi_singh_hmac_key_32bytes!!!",
  },
];

// ---------------------------------------------------------------------------
// Permission grants
// Per BUILD_PLAN.md §11:
//   - controller_morgan, qa_manager, coordinator_lee → initiate + withdraw
//   - all human actors → read
//   - system@demo → no grants (application actor, not human)
// ---------------------------------------------------------------------------

const initiators = ["controller_morgan", "qa_manager", "coordinator_lee"];
const humanActors = actors
  .filter((a) => a.kind === "human")
  .map((a) => a.actor_ref);

tx(() => {
  const insertActor = db.prepare(`
    INSERT OR IGNORE INTO actor
      (actor_ref, kind, display_name, credential_public, credential_secret, registered_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const a of actors) {
    insertActor.run(
      a.actor_ref,
      a.kind,
      a.display_name,
      a.credential_public,
      a.credential_secret,
      now,
    );
  }

  const insertGrant = db.prepare(`
    INSERT OR IGNORE INTO permission_grant
      (actor_ref, scope, granted_at, granted_by)
    VALUES (?, ?, ?, ?)
  `);

  // initiate + withdraw grants
  for (const ref of initiators) {
    insertGrant.run(ref, "chains:initiate", now, "system@demo");
    insertGrant.run(ref, "chains:withdraw", now, "system@demo");
  }

  // read grants for all humans
  for (const ref of humanActors) {
    insertGrant.run(ref, "chains:read", now, "system@demo");
  }
});

// Verify
const actorCount = db.prepare("SELECT COUNT(*) as n FROM actor").get<{ n: number }>()!;
const grantCount = db.prepare("SELECT COUNT(*) as n FROM permission_grant").get<{ n: number }>()!;

console.log(`✓ Seed complete`);
console.log(`  Actors:            ${actorCount.n}`);
console.log(`  Permission grants: ${grantCount.n}`);
