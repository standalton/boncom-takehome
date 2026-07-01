/**
 * FilterSelect.tsx — a URL-driven facet dropdown for list pages.
 *
 * What:        A shadcn Select that sets (or clears) a single query param and
 *              resets page to 1, preserving other params. "All" clears the param.
 * Where used:  The quotes page (status) and products page (unit).
 * Notes:       Client component (writes URL params). Options come from the
 *              caller's closed set so no filtering logic lives here.
 */
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

type Option = { value: string; label: string };
type Props = { param: string; options: Option[]; allLabel: string; className?: string };

export function FilterSelect({ param, options, allLabel, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? ALL;

  function onChange(value: string | null) {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(param);
    else next.set(param, value);
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
