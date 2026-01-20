import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-white/40 placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-white/50 backdrop-blur-sm flex field-sizing-content min-h-16 w-full rounded-2xl border bg-transparent px-4 py-3 text-base shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-slate-800",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
