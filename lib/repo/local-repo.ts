"use client";
import { LIMITS } from "../config";
import { parseConfig, type GiftConfig, type GiftRecord } from "../gift";
import { RepoError, type GiftRepo, type UploadedPhoto } from "./types";

/* DEMO MODE ONLY. Used when Supabase is not configured.
   Data lives in this browser's localStorage: no accounts, links only open
   on this same browser. The UI says so wherever it matters. */

const KEY = "lm.demo.gifts.v1";

export function randomSlug(len = 22): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function readAll(): GiftRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GiftRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(gifts: GiftRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(gifts));
  } catch {
    throw new RepoError("Demo storage is full on this browser. Delete an old gift or use smaller photos.", 507);
  }
}

function validate(config: GiftConfig): GiftConfig {
  const res = parseConfig(config);
  if (!res.ok) throw new RepoError(res.error, 422);
  return res.config;
}

/** Downscale an image to keep demo storage small. */
async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export class LocalRepo implements GiftRepo {
  readonly mode = "demo" as const;

  private find(id: string) {
    const all = readAll();
    const idx = all.findIndex((g) => g.id === id);
    if (idx < 0) throw new RepoError("Gift not found", 404);
    return { all, idx };
  }

  private save(id: string, patch: Partial<GiftRecord>) {
    const { all, idx } = this.find(id);
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    writeAll(all);
    return all[idx];
  }

  async list() {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string) {
    return readAll().find((g) => g.id === id) ?? null;
  }
  async getBySlug(slug: string) {
    return readAll().find((g) => g.slug === slug && g.status === "published" && g.sharingEnabled) ?? null;
  }
  async create(config: GiftConfig) {
    const now = new Date().toISOString();
    const gift: GiftRecord = {
      id: crypto.randomUUID(),
      slug: randomSlug(),
      status: "draft",
      sharingEnabled: true,
      config: validate(config),
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };
    writeAll([gift, ...readAll()]);
    return gift;
  }
  async update(id: string, config: GiftConfig) {
    return this.save(id, { config: validate(config) });
  }
  async publish(id: string, config: GiftConfig) {
    const current = this.find(id);
    const gift = current.all[current.idx];
    return this.save(id, { config: validate(config), status: "published", publishedAt: gift.publishedAt ?? new Date().toISOString() });
  }
  async setSharing(id: string, enabled: boolean) {
    return this.save(id, { sharingEnabled: enabled });
  }
  async duplicate(id: string) {
    const original = await this.get(id);
    if (!original) throw new RepoError("Gift not found", 404);
    return this.create({ ...original.config, recipientName: original.config.recipientName });
  }
  async remove(id: string) {
    writeAll(readAll().filter((g) => g.id !== id));
  }
  async uploadPhoto(giftId: string, file: File): Promise<UploadedPhoto> {
    const gift = await this.get(giftId);
    if (!gift) throw new RepoError("Save your gift first", 404);
    if (!LIMITS.photoTypes.includes(file.type as (typeof LIMITS.photoTypes)[number])) throw new RepoError("Photos must be JPG, PNG or WebP.", 415);
    if (file.size > LIMITS.photoMaxBytes) throw new RepoError("Each photo must be 5 MB or smaller.", 413);
    if (gift.config.photos.items.length >= LIMITS.photosPerGiftFree) throw new RepoError(`You can add up to ${LIMITS.photosPerGiftFree} photos.`, 409);
    return { id: crypto.randomUUID(), ref: await compress(file) };
  }
  async removePhoto() {
    /* data URLs are removed together with the config entry */
  }
  async photoUrls(refs: string[]) {
    return Object.fromEntries(refs.map((r) => [r, r]));
  }
}
