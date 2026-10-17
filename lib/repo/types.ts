import type { GiftConfig, GiftRecord } from "../gift";

export interface UploadedPhoto {
  id: string;
  ref: string;
}

/** Everything the UI needs from persistence. Two implementations:
 *  ApiRepo (live Supabase backend) and LocalRepo (demo mode, browser only). */
export interface GiftRepo {
  readonly mode: "live" | "demo";
  list(): Promise<GiftRecord[]>;
  get(id: string): Promise<GiftRecord | null>;
  create(config: GiftConfig): Promise<GiftRecord>;
  update(id: string, config: GiftConfig): Promise<GiftRecord>;
  publish(id: string, config: GiftConfig): Promise<GiftRecord>;
  setSharing(id: string, enabled: boolean): Promise<GiftRecord>;
  duplicate(id: string): Promise<GiftRecord>;
  remove(id: string): Promise<void>;
  uploadPhoto(giftId: string, file: File): Promise<UploadedPhoto>;
  removePhoto(giftId: string, photoId: string): Promise<void>;
  /** Owner-side preview URL for a photo ref (signed URL or data URL). */
  photoUrls(refs: string[]): Promise<Record<string, string>>;
}

export class RepoError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
