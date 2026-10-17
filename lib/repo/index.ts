"use client";
import { isSupabaseConfigured } from "../config";
import { ApiRepo } from "./api-repo";
import { LocalRepo } from "./local-repo";
import type { GiftRepo } from "./types";

let repo: GiftRepo | null = null;

export function getRepo(): GiftRepo {
  if (!repo) repo = isSupabaseConfigured ? new ApiRepo() : new LocalRepo();
  return repo;
}

export { RepoError } from "./types";
export type { GiftRepo, UploadedPhoto } from "./types";

/* Unsaved visitor draft (before sign-in), kept in this browser only. */
const DRAFT_KEY = "lm.visitor-draft.v1";
export function saveVisitorDraft(config: unknown) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ config, savedAt: Date.now() }));
  } catch {
    /* storage unavailable (private mode) — the editor keeps state in memory */
  }
}
export function loadVisitorDraft(): unknown | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as { config: unknown }).config : null;
  } catch {
    return null;
  }
}
export function clearVisitorDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
