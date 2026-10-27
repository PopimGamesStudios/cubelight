import { classNames } from "@/lib/format";

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={classNames("logo", className)}
      aria-hidden="true"
    >
      <path d="M16 2.5 28.5 9.5 16 16.5 3.5 9.5Z" fill="currentColor" />
      <path d="M3.5 9.5 16 16.5V30L3.5 23Z" fill="currentColor" opacity="0.58" />
      <path d="M28.5 9.5 16 16.5V30L28.5 23Z" fill="currentColor" opacity="0.3" />
      <path d="M16 6.4 23.2 10.2 16 14 8.8 10.2Z" fill="var(--bg)" opacity="0.9" />
      <path d="M16 8.5 20.2 10.6 16 12.8 11.8 10.6Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
