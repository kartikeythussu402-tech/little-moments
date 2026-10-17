import { totalStems, type GiftConfig } from "./gift";

/** Checks shared by the editor (instant feedback) and the publish API (enforcement). */
export function validateForPublish(c: GiftConfig): string[] {
  const problems: string[] = [];
  if (!c.recipientName.trim()) problems.push("Add their name (Details tab).");
  if (c.blocks.includes("letter") && !c.letter.body.trim()) problems.push("Your letter is empty (Message tab).");
  if (c.blocks.includes("bouquet") && totalStems(c.bouquet.stems) === 0) problems.push("Add at least one flower (Bouquet tab).");
  if (c.blocks.includes("countdown") && !c.countdown.target) problems.push("Choose when the countdown opens (Message tab).");
  if (c.blocks.includes("reasons") && !c.reasons.items.some((r) => r.trim())) problems.push("Add at least one reason (Message tab).");
  if (c.blocks.includes("greeting") && !c.greeting.headline.trim() && !c.greeting.message.trim() && !c.stickers.length) problems.push("Write a greeting (Message tab).");
  return problems;
}
