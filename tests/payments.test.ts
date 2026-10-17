import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { expectedSignature, isProductId, isValidSignature, makeReceipt, mapRazorpayError, MIN_AMOUNT_PAISE, PRODUCTS } from "../lib/payments";

const SECRET = "test_secret_for_unit_tests";

test("signature = HMAC-SHA256(order_id|payment_id, secret) in hex", () => {
  const manual = createHmac("sha256", SECRET).update("order_ABC|pay_XYZ").digest("hex");
  assert.equal(expectedSignature("order_ABC", "pay_XYZ", SECRET), manual);
});

test("valid signature passes", () => {
  const sig = expectedSignature("order_1", "pay_1", SECRET);
  assert.equal(isValidSignature("order_1", "pay_1", sig, SECRET), true);
});

test("tampered signature, swapped ids, wrong secret and empty values all fail", () => {
  const sig = expectedSignature("order_1", "pay_1", SECRET);
  assert.equal(isValidSignature("order_1", "pay_1", sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a"), SECRET), false);
  assert.equal(isValidSignature("order_2", "pay_1", sig, SECRET), false);
  assert.equal(isValidSignature("order_1", "pay_2", sig, SECRET), false);
  assert.equal(isValidSignature("order_1", "pay_1", sig, "other_secret"), false);
  assert.equal(isValidSignature("order_1", "pay_1", "short", SECRET), false);
  assert.equal(isValidSignature("", "pay_1", sig, SECRET), false);
  assert.equal(isValidSignature("order_1", "pay_1", "", SECRET), false);
});

test("product catalog: only known ids, all amounts ≥ 100 paise", () => {
  assert.equal(isProductId("gift_experience"), true);
  assert.equal(isProductId("toString"), false);
  assert.equal(isProductId("free_stuff"), false);
  for (const p of Object.values(PRODUCTS)) assert.ok(Number.isInteger(p.amount) && p.amount >= MIN_AMOUNT_PAISE);
});

test("receipt ids fit Razorpay's 40-char limit and are unique", () => {
  const a = makeReceipt();
  const b = makeReceipt();
  assert.ok(a.length <= 40);
  assert.notEqual(a, b);
});

test("Razorpay auth failures map to 401, other API errors to 500", () => {
  assert.equal(mapRazorpayError({ statusCode: 401, error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } }).status, 401);
  assert.equal(mapRazorpayError({ statusCode: 400, error: { description: "amount invalid" } }).status, 500);
  assert.equal(mapRazorpayError({ statusCode: 503 }).status, 500);
  assert.equal(mapRazorpayError(new Error("ECONNRESET")).status, 500);
});
