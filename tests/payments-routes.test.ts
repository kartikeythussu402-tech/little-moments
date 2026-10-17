/**
 * Route-level tests for /api/create-order and /api/verify-payment in demo mode
 * (no Supabase). The Razorpay API is simulated by replacing axios's network
 * adapter (the razorpay SDK uses axios to call api.razorpay.com).
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import Module from "node:module";

const KEY_ID = "rzp_test_unit";
const SECRET = "unit_test_secret";
process.env.RAZORPAY_KEY_ID = KEY_ID;
process.env.RAZORPAY_KEY_SECRET = SECRET;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// "server-only" throws outside the Next.js bundler; neutralise it for unit tests.
const origLoad = (Module as unknown as { _load: (r: string, ...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: (r: string, ...a: unknown[]) => unknown })._load = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return {};
  return origLoad.call(this, request, ...rest);
};

type Route = { POST: (req: Request) => Promise<Response> };
let createOrder: Route;
let verifyPayment: Route;
let ipCounter = 0;
const post = (body: unknown) =>
  new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${++ipCounter}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

// Simulated Razorpay API: the SDK uses axios, so swap axios's network adapter.
let razorpayMode: "ok" | "auth" | "down" = "ok";
let lastOrderRequest: { amount?: number; currency?: string; receipt?: string; auth?: string } = {};

before(async () => {
  // Use the same CommonJS axios instance the SDK requires (the ESM build is a separate copy).
  const axios = Module.createRequire(require.resolve("razorpay"))("axios").default as typeof import("axios").default;
  axios.defaults.adapter = async (config) => {
    const body = config.data ? JSON.parse(String(config.data)) : {};
    const a = config.auth;
    lastOrderRequest = { ...body, auth: a ? `${a.username}:${a.password}` : undefined };
    const reply = (status: number, data: unknown) => ({ data, status, statusText: String(status), headers: {}, config, request: {} });
    if (razorpayMode === "auth") throw { response: reply(401, { error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } }) };
    if (razorpayMode === "down") throw { response: reply(503, { error: { code: "SERVER_ERROR", description: "down" } }) };
    assert.equal(`${config.baseURL}${config.url}`.replace(/\/+/g, "/"), "https:/api.razorpay.com/v1/orders");
    return reply(200, { id: "order_TEST123", entity: "order", amount: body.amount, currency: body.currency, receipt: body.receipt, status: "created" });
  };
  createOrder = (await import("../app/api/create-order/route")) as unknown as Route;
  verifyPayment = (await import("../app/api/verify-payment/route")) as unknown as Route;
});

test("create-order: valid product → Razorpay order with server-side amount", async () => {
  razorpayMode = "ok";
  const res = await createOrder.POST(post({ productId: "gift_experience" }));
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.deepEqual({ order_id: data.order_id, amount: data.amount, currency: data.currency }, { order_id: "order_TEST123", amount: 9900, currency: "INR" });
  assert.equal(lastOrderRequest.amount, 9900);
  assert.ok(lastOrderRequest.receipt && lastOrderRequest.receipt.length <= 40);
  // SDK authenticates with the env credentials (HTTP Basic auth).
  assert.equal(lastOrderRequest.auth, `${KEY_ID}:${SECRET}`);
});

test("create-order: client cannot set its own amount", async () => {
  razorpayMode = "ok";
  const res = await createOrder.POST(post({ productId: "premium_design", amount: 1 }));
  assert.equal(res.status, 201);
  assert.equal(lastOrderRequest.amount, 4900);
});

test("create-order: unknown product / bad JSON → 400", async () => {
  assert.equal((await createOrder.POST(post({ productId: "nope" }))).status, 400);
  assert.equal((await createOrder.POST(post("{not json"))).status, 400);
  assert.equal((await createOrder.POST(post({}))).status, 400);
});

test("create-order: Razorpay auth failure → 401", async () => {
  razorpayMode = "auth";
  const res = await createOrder.POST(post({ productId: "big_surprise" }));
  assert.equal(res.status, 401);
});

test("create-order: Razorpay API error → 500", async () => {
  razorpayMode = "down";
  const res = await createOrder.POST(post({ productId: "big_surprise" }));
  assert.equal(res.status, 500);
  razorpayMode = "ok";
});

test("verify-payment: correct signature → verified", async () => {
  const sig = createHmac("sha256", SECRET).update("order_TEST123|pay_ABC").digest("hex");
  const res = await verifyPayment.POST(post({ razorpay_order_id: "order_TEST123", razorpay_payment_id: "pay_ABC", razorpay_signature: sig }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.verified, true);
});

test("verify-payment: wrong signature → 400, not verified", async () => {
  const res = await verifyPayment.POST(post({ razorpay_order_id: "order_TEST123", razorpay_payment_id: "pay_ABC", razorpay_signature: "0".repeat(64) }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.notEqual(data.verified, true);
});

test("verify-payment: signature signed with a different secret → 400", async () => {
  const sig = createHmac("sha256", "attacker_secret").update("order_TEST123|pay_ABC").digest("hex");
  const res = await verifyPayment.POST(post({ razorpay_order_id: "order_TEST123", razorpay_payment_id: "pay_ABC", razorpay_signature: sig }));
  assert.equal(res.status, 400);
});

test("verify-payment: missing fields → 400", async () => {
  assert.equal((await verifyPayment.POST(post({ razorpay_order_id: "order_TEST123", razorpay_payment_id: "pay_ABC" }))).status, 400);
  assert.equal((await verifyPayment.POST(post({}))).status, 400);
});
