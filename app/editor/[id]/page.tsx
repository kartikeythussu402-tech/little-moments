import type { Metadata } from "next";
import { Editor } from "@/components/editor/editor";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };

export default async function EditorPage(props: PageProps<"/editor/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const search: Record<string, string | undefined> = {};
  for (const k of ["format", "template", "occasion", "resume"]) {
    const v = sp[k];
    search[k] = Array.isArray(v) ? v[0] : v;
  }
  return <Editor id={id} search={search} />;
}
