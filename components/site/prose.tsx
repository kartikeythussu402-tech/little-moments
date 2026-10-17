export function Prose({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="display text-4xl text-ink sm:text-5xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-mute">Last updated {updated}</p>
      <div className="mt-8 flex flex-col gap-4 leading-relaxed text-ink-soft [&_a]:font-semibold [&_a]:text-berry [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
        {children}
      </div>
    </div>
  );
}
