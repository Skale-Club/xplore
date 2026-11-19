"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/** Must remain a descendant of the Link whose navigation it describes. */
export function NavigationPending({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={cn("inline-flex size-4 shrink-0 items-center justify-center", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin",
          pending ? "opacity-100" : "opacity-0"
        )}
      />
      <span role="status" className="sr-only">
        {pending ? label : ""}
      </span>
    </span>
  );
}
