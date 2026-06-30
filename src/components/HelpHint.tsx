/**
 * HelpHint.tsx — the app-wide "what is this?" tooltip.
 *
 * What:        A small info icon that reveals a short explanation on hover or
 *              focus. The one tooltip pattern used across every screen.
 * Where used:  Next to field labels and headers throughout the UI.
 * Notes:       Pass copy from the central src/lib/help-text.ts dictionary.
 *              Relies on the TooltipProvider in the root layout.
 */
"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HelpHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label="More information"
        className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
