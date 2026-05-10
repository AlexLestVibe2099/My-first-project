import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env");
const envRaw = fs.readFileSync(envPath, "utf8");
const env = {};

for (const line of envRaw.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!match) continue;
  env[match[1]] = match[2];
}

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.log(JSON.stringify({ error: "missing_env" }, null, 2));
  process.exit(1);
}

const out = [];

async function req(name, input, init) {
  try {
    const res = await fetch(input, init);
    const bodyText = await res.text();

    let message = "";
    try {
      const parsed = bodyText ? JSON.parse(bodyText) : null;
      message =
        parsed?.message ||
        parsed?.error_description ||
        parsed?.error ||
        bodyText?.slice(0, 200) ||
        "";
    } catch {
      message = bodyText?.slice(0, 200) || "";
    }

    out.push({ name, status: res.status, ok: res.ok, message });
    return { res, bodyText };
  } catch (error) {
    out.push({ name, status: null, ok: false, message: String(error) });
    return null;
  }
}

const victimId = "95ddfd17-956b-4100-9f9f-b3f0f1f5f4a9";

await req("without_token_insert_cycle_entries", `${url}/rest/v1/cycle_entries`, {
  method: "POST",
  headers: {
    apikey: anon,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  },
  body: JSON.stringify({
    user_id: victimId,
    entry_date: new Date().toISOString().slice(0, 10),
    mood: "ok",
    pain_level: 1,
    sleep_hours: 8,
    energy_level: "mid",
    discharge_type: "normal",
    notes: "test"
  })
});

const badEmail = `bad-email-format-${Date.now()}`;
await req("bad_email_signup", `${url}/auth/v1/signup`, {
  method: "POST",
  headers: {
    apikey: anon,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: badEmail,
    password: "Password123!"
  })
});

await req("signup_missing_password", `${url}/auth/v1/signup`, {
  method: "POST",
  headers: {
    apikey: anon,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: `missing_password_${Date.now()}@example.com`
  })
});

const secondEmail = `user2_${Date.now()}@example.com`;
const secondPass = "Password123!";
const signUpRes = await req("second_user_signup", `${url}/auth/v1/signup`, {
  method: "POST",
  headers: {
    apikey: anon,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: secondEmail,
    password: secondPass
  })
});

let token = null;
if (signUpRes?.bodyText) {
  try {
    const parsed = JSON.parse(signUpRes.bodyText);
    token = parsed?.access_token || parsed?.session?.access_token || null;
  } catch {
    token = null;
  }
}

if (!token) {
  const signInRes = await req("second_user_signin", `${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: secondEmail,
      password: secondPass
    })
  });

  if (signInRes?.bodyText) {
    try {
      const parsed = JSON.parse(signInRes.bodyText);
      token = parsed?.access_token || null;
    } catch {
      token = null;
    }
  }
}

if (token) {
  await req("second_user_update_first_profile", `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(victimId)}`, {
    method: "PATCH",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      display_name: "HACKED_BY_USER2"
    })
  });
} else {
  out.push({
    name: "second_user_update_first_profile",
    status: null,
    ok: false,
    message: "Skipped: no second user token (possibly email confirmation required)"
  });
}

await req("empty_payload_insert_cycle_entries", `${url}/rest/v1/cycle_entries`, {
  method: "POST",
  headers: {
    apikey: anon,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  },
  body: JSON.stringify({})
});

console.log(JSON.stringify(out, null, 2));
