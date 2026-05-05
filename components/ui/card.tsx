import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline bg-gradient-to-b from-surface-container to-surface p-6 shadow-elev-2",
        className,
      )}
      {...props}
    />
  );
}
