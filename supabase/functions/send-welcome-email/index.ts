import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type WebhookPayload = {
  id?: string;
  event_id?: string;
  type?: string;
  table?: string;
  record?: {
    id?: string;
    user_id?: string;
  };
};

const TEXT_ENCODER = new TextEncoder();
const UNISENDER_ENDPOINT = "https://api.unisender.com/ru/api/sendEmail";
const EVENT_STORE_TABLE = "webhook_processed_events";

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(payload));
  return toHex(signature);
}

async function hmacSha256Base64(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(payload));
  return toBase64(signature);
}

async function sha256Hex(payload: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", TEXT_ENCODER.encode(payload));
  return toHex(hash);
}

function parseSignatureHeader(signatureHeader: string | null): string[] {
  if (!signatureHeader) return [];
  const trimmed = signatureHeader.trim();
  if (!trimmed) return [];

  return trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("sha256=")) return part.slice("sha256=".length);
      if (part.startsWith("v1=")) return part.slice("v1=".length);
      return part;
    });
}

async function verifyWebhookSignature(rawBody: string, req: Request): Promise<boolean> {
  const secret = Deno.env.get("WEBHOOK_SIGNING_SECRET")?.trim();
  if (!secret) return false;

  const signatures = parseSignatureHeader(
    req.headers.get("x-webhook-signature") ?? req.headers.get("x-signature"),
  );
  if (!signatures.length) return false;

  const expectedHex = await hmacSha256Hex(secret, rawBody);
  const expectedBase64 = await hmacSha256Base64(secret, rawBody);

  return signatures.some((signature) =>
    timingSafeEqual(expectedHex, signature) || timingSafeEqual(expectedBase64, signature)
  );
}

function verifyWebhookSharedToken(req: Request): boolean {
  const expectedToken = Deno.env.get("WEBHOOK_SHARED_TOKEN")?.trim();
  if (!expectedToken) return false;

  const authorization = req.headers.get("authorization");
  const bearerToken = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : null;
  const headerToken = req.headers.get("x-webhook-token")?.trim();
  const providedToken = headerToken || bearerToken;
  if (!providedToken) return false;

  return timingSafeEqual(expectedToken, providedToken);
}

async function resolveEventId(
  rawBody: string,
  req: Request,
  payload: WebhookPayload,
): Promise<string> {
  const headerId =
    req.headers.get("x-event-id") ??
    req.headers.get("x-webhook-id") ??
    req.headers.get("x-supabase-event-id") ??
    req.headers.get("svix-id");

  if (headerId?.trim()) return headerId.trim();
  if (payload.event_id?.trim()) return payload.event_id.trim();
  if (payload.id?.trim()) return payload.id.trim();

  return `sha256:${await sha256Hex(rawBody)}`;
}

function logRequestMeta(args: {
  action: string;
  endpoint: string;
  status: number;
  durationMs: number;
  eventId?: string;
  providerOk?: boolean;
  providerErrorCode?: string;
  providerErrorHint?: string;
}) {
  console.log(
    JSON.stringify({
      action: args.action,
      endpoint: args.endpoint,
      status: args.status,
      duration_ms: args.durationMs,
      event_id: args.eventId ?? "n/a",
      provider_ok: args.providerOk ?? undefined,
      provider_error_code: args.providerErrorCode ?? undefined,
      provider_error_hint: args.providerErrorHint ?? undefined,
    }),
  );
}

function isMissingEventStoreTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    String(error.message || "").includes("webhook_processed_events")
  );
}

async function isAlreadyProcessed(
  adminClient: ReturnType<typeof createClient>,
  eventId: string,
): Promise<boolean> {
  const { data, error } = await adminClient
    .from(EVENT_STORE_TABLE)
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    if (isMissingEventStoreTable(error)) return false;
    throw error;
  }
  return Boolean(data);
}

async function markProcessed(
  adminClient: ReturnType<typeof createClient>,
  eventId: string,
  source: string,
): Promise<void> {
  const { error } = await adminClient.from(EVENT_STORE_TABLE).insert({
    event_id: eventId,
    source,
  });

  if (error && error.code !== "23505" && !isMissingEventStoreTable(error)) {
    throw error;
  }
}

function buildWelcomeBodyHtml(): string {
  return `
    <h2>Добро пожаловать в CycleCare!</h2>
    <p>Регистрация прошла успешно, и ваш профиль уже готов к работе.</p>
    <p>Спасибо, что выбрали наш трекер женского цикла.</p>
  `.trim();
}

function getWelcomeSubject(): string {
  return Deno.env.get("UNISENDER_WELCOME_SUBJECT")?.trim() || "Регистрация в CycleCare завершена";
}

function parseProviderErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const rec = data as Record<string, unknown>;
  const code = rec.code ?? rec.error_code ?? rec.error;
  if (typeof code === "string") return code;
  if (typeof code === "number") return String(code);

  const result = rec.result;
  if (Array.isArray(result)) {
    for (const item of result) {
      if (!item || typeof item !== "object") continue;
      const errors = (item as Record<string, unknown>).errors;
      if (!Array.isArray(errors) || errors.length === 0) continue;
      const first = errors[0];
      if (!first || typeof first !== "object") continue;
      const itemCode = (first as Record<string, unknown>).code;
      if (typeof itemCode === "string") return itemCode;
      if (typeof itemCode === "number") return String(itemCode);
    }
  }

  return undefined;
}

function parseProviderErrorHint(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const rec = data as Record<string, unknown>;
  const result = rec.result;
  if (!Array.isArray(result)) return undefined;

  const messages: string[] = [];
  for (const item of result) {
    if (!item || typeof item !== "object") continue;
    const errors = (item as Record<string, unknown>).errors;
    if (!Array.isArray(errors)) continue;
    for (const err of errors) {
      if (!err || typeof err !== "object") continue;
      const msg = (err as Record<string, unknown>).message;
      if (typeof msg === "string") messages.push(msg.toLowerCase());
    }
  }

  if (!messages.length) return undefined;
  if (messages.some((msg) => msg.includes("free plan"))) return "free_plan_restriction";
  if (messages.some((msg) => msg.includes("custom domain"))) return "domain_auth_required";
  if (messages.some((msg) => msg.includes("confirmed emails only"))) return "recipient_must_be_confirmed";
  if (messages.some((msg) => msg.includes("unchecked sender email"))) return "sender_not_confirmed";
  return "provider_validation_error";
}

Deno.serve(async (req) => {
  const webhookStart = Date.now();

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const rawBody = await req.text();
  const signatureOk = await verifyWebhookSignature(rawBody, req);
  const sharedTokenOk = verifyWebhookSharedToken(req);
  if (!signatureOk && !sharedTokenOk) {
    logRequestMeta({
      action: "verify_webhook_auth",
      endpoint: "/functions/v1/send-welcome-email",
      status: 401,
      durationMs: Date.now() - webhookStart,
    });
    return jsonResponse(401, { error: "Invalid webhook authentication" });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    logRequestMeta({
      action: "parse_webhook_payload",
      endpoint: "/functions/v1/send-welcome-email",
      status: 400,
      durationMs: Date.now() - webhookStart,
    });
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const eventId = await resolveEventId(rawBody, req, payload);

  let supabaseUrl: string;
  let serviceRoleKey: string;
  let unisenderApiKey: string;
  let senderEmail: string;
  let senderName: string;
  try {
    supabaseUrl = getRequiredEnv("SUPABASE_URL");
    serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    unisenderApiKey = getRequiredEnv("UNISENDER_API_KEY");
    senderEmail = getRequiredEnv("UNISENDER_SENDER_EMAIL");
    senderName = getRequiredEnv("UNISENDER_SENDER_NAME");
  } catch {
    logRequestMeta({
      action: "load_env",
      endpoint: "/functions/v1/send-welcome-email",
      status: 500,
      durationMs: Date.now() - webhookStart,
      eventId,
    });
    return jsonResponse(500, { error: "Function is not configured" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const alreadyProcessed = await isAlreadyProcessed(adminClient, eventId);
    if (alreadyProcessed) {
      logRequestMeta({
        action: "dedupe_webhook_event",
        endpoint: "/functions/v1/send-welcome-email",
        status: 200,
        durationMs: Date.now() - webhookStart,
        eventId,
      });
      return jsonResponse(200, { ok: true, duplicate: true });
    }

    const userId = payload.record?.id ?? payload.record?.user_id;
    if (!userId) {
      await markProcessed(adminClient, eventId, "profiles_insert_webhook_invalid_payload");
      logRequestMeta({
        action: "extract_user_id",
        endpoint: "/functions/v1/send-welcome-email",
        status: 200,
        durationMs: Date.now() - webhookStart,
        eventId,
      });
      return jsonResponse(200, { ok: true, skipped: "missing_user_id" });
    }

    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      await markProcessed(adminClient, eventId, "profiles_insert_webhook_missing_email");
      logRequestMeta({
        action: "fetch_user_email",
        endpoint: "supabase.auth.admin.getUserById",
        status: 200,
        durationMs: Date.now() - webhookStart,
        eventId,
      });
      return jsonResponse(200, { ok: true, skipped: "user_email_not_found" });
    }

    const formData = new URLSearchParams({
      format: "json",
      api_key: unisenderApiKey,
      email: userData.user.email,
      sender_email: senderEmail,
      sender_name: senderName,
      subject: getWelcomeSubject(),
      body: buildWelcomeBodyHtml(),
      error_checking: "1",
    });

    const unisenderStart = Date.now();
    let unisenderStatus = 0;
    let unisenderOk = false;
    let providerErrorCode: string | undefined;
    let providerErrorHint: string | undefined;
    try {
      const response = await fetch(UNISENDER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      unisenderStatus = response.status;
      const rawResponse = await response.text();
      let parsedResponse: unknown = null;
      try {
        parsedResponse = rawResponse ? JSON.parse(rawResponse) : null;
      } catch {
        parsedResponse = null;
      }
      providerErrorCode = parseProviderErrorCode(parsedResponse);
      providerErrorHint = parseProviderErrorHint(parsedResponse);
      unisenderOk = response.ok && !providerErrorCode;

      logRequestMeta({
        action: "send_welcome_email",
        endpoint: UNISENDER_ENDPOINT,
        status: response.status,
        durationMs: Date.now() - unisenderStart,
        eventId,
        providerOk: unisenderOk,
        providerErrorCode,
        providerErrorHint,
      });
    } catch {
      logRequestMeta({
        action: "send_welcome_email",
        endpoint: UNISENDER_ENDPOINT,
        status: 503,
        durationMs: Date.now() - unisenderStart,
        eventId,
        providerOk: false,
        providerErrorCode: "network_error",
        providerErrorHint: "provider_unreachable",
      });
    }

    await markProcessed(adminClient, eventId, "profiles_insert_webhook");
    return jsonResponse(200, {
      ok: true,
      event_id: eventId,
      unisender_status: unisenderStatus,
      unisender_ok: unisenderOk,
      unisender_error_code: providerErrorCode ?? null,
      unisender_error_hint: providerErrorHint ?? null,
    });
  } catch {
    logRequestMeta({
      action: "handle_webhook",
      endpoint: "/functions/v1/send-welcome-email",
      status: 500,
      durationMs: Date.now() - webhookStart,
      eventId,
    });
    return jsonResponse(500, { error: "Internal processing error" });
  }
});
