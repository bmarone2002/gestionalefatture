import Image from "next/image";
import { cn } from "cn";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { width: 140, height: 56, className: "h-8" },
  md: { width: 189, height: 77, className: "h-10" },
  lg: { width: 220, height: 90, className: "h-14" },
} as const;

/** Official Archivia Solution wordmark (PNG has light background — use on light surfaces). */
export function BrandLogo({ className, priority, size = "md" }: BrandLogoProps) {
  const s = sizes[size];
  return (
    <Image
      src="/logo-archivia.png"
      alt="Archivia Solution SpA"
      width={s.width}
      height={s.height}
      priority={priority}
      className={cn("w-auto object-contain object-left", s.className, className)}
    />
  );
}

/** Three gold squares from the Archivia mark (staircase). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7 text-brand", className)}>
      <rect x="2" y="14" width="10" height="10" rx="1.5" fill="currentColor" />
      <rect x="14" y="14" width="10" height="10" rx="1.5" fill="currentColor" />
      <rect x="14" y="2" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/** Wordmark for dark surfaces (sidebar / drawer) — no white plate. */
export function BrandWordmarkDark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className="size-8 shrink-0" />
      <div className="min-w-0 leading-none">
        <div className="text-[11px] font-medium tracking-[0.18em] text-white/90">ARCHIVIA</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-[15px] font-bold tracking-wide text-brand">SOLUTION</span>
          <span className="text-[10px] font-semibold text-brand/80">SpA</span>
        </div>
      </div>
    </div>
  );
}

/** Wordmark for light surfaces (mobile top bar). */
export function BrandWordmarkLight({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandMark className="size-7 shrink-0" />
      <div className="min-w-0 leading-none">
        <div className="text-[10px] font-medium tracking-[0.16em] text-primary">ARCHIVIA</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[13px] font-bold tracking-wide text-brand">SOLUTION</span>
          <span className="text-[9px] font-semibold text-brand/80">SpA</span>
        </div>
      </div>
    </div>
  );
}
