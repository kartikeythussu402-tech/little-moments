import type { Metadata } from "next";
import { TemplateLibrary } from "./template-library";

export const metadata: Metadata = { title: "Templates", description: "Letters, bouquets, gift boxes, timelines and festive greetings, all fully editable." };

export default function TemplatesPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Template library</p>
      <h1 className="display mt-2 text-4xl text-ink sm:text-5xl">Find a starting point</h1>
      <p className="mb-8 mt-3 max-w-xl text-lg text-ink-soft">Every template is fully editable. Pick one and make it yours.</p>
      <TemplateLibrary />
    </div>
  );
}
