import { en } from "@/i18n/dictionaries/en";
import { pt } from "@/i18n/dictionaries/pt";

/** Synchronous fallback: language follows the existing document, without cookies or I/O. */
export function PageLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <p role="status" className="text-sm text-muted-foreground">
        <span lang="en" className="[[lang=pt]_&]:hidden">{en.common.loading}</span>
        <span lang="pt" className="hidden [[lang=pt]_&]:inline">{pt.common.loading}</span>
      </p>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-8 w-2/3 max-w-sm rounded bg-muted" />
        <div className="h-4 w-1/2 max-w-xs rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-40 rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
