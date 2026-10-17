"use client";
import type { GiftConfig, GiftRecord } from "../gift";
import { RepoError, type GiftRepo, type UploadedPhoto } from "./types";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new RepoError("You seem to be offline. Your changes are still here — try again in a moment.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new RepoError(data.error || "Something went wrong. Please try again.", res.status);
  return data;
}

/** Live mode: talks to the validated Next.js API routes, which talk to Supabase. */
export class ApiRepo implements GiftRepo {
  readonly mode = "live" as const;

  async list() {
    return (await call<{ gifts: GiftRecord[] }>("/api/gifts")).gifts;
  }
  async get(id: string) {
    try {
      return (await call<{ gift: GiftRecord }>(`/api/gifts/${id}`)).gift;
    } catch (e) {
      if (e instanceof RepoError && e.status === 404) return null;
      throw e;
    }
  }
  async create(config: GiftConfig) {
    return (await call<{ gift: GiftRecord }>("/api/gifts", { method: "POST", body: JSON.stringify({ config }) })).gift;
  }
  async update(id: string, config: GiftConfig) {
    return (await call<{ gift: GiftRecord }>(`/api/gifts/${id}`, { method: "PATCH", body: JSON.stringify({ config }) })).gift;
  }
  async publish(id: string, config: GiftConfig) {
    return (await call<{ gift: GiftRecord }>(`/api/gifts/${id}/publish`, { method: "POST", body: JSON.stringify({ config }) })).gift;
  }
  async setSharing(id: string, enabled: boolean) {
    return (await call<{ gift: GiftRecord }>(`/api/gifts/${id}/sharing`, { method: "POST", body: JSON.stringify({ enabled }) })).gift;
  }
  async duplicate(id: string) {
    return (await call<{ gift: GiftRecord }>(`/api/gifts/${id}/duplicate`, { method: "POST" })).gift;
  }
  async remove(id: string) {
    await call(`/api/gifts/${id}`, { method: "DELETE" });
  }
  async uploadPhoto(giftId: string, file: File): Promise<UploadedPhoto> {
    const form = new FormData();
    form.set("giftId", giftId);
    form.set("file", file);
    return (await call<{ photo: UploadedPhoto }>("/api/media", { method: "POST", body: form })).photo;
  }
  async removePhoto(giftId: string, photoId: string) {
    await call(`/api/media?giftId=${encodeURIComponent(giftId)}&id=${encodeURIComponent(photoId)}`, { method: "DELETE" });
  }
  async photoUrls(refs: string[]) {
    if (!refs.length) return {};
    return (await call<{ urls: Record<string, string> }>("/api/media/sign", { method: "POST", body: JSON.stringify({ refs }) })).urls;
  }
}
