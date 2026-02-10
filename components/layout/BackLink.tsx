import Link from "next/link";

type BackLinkProps = {
  href: string;
  label: string;
};

export default function BackLink({ href, label }: BackLinkProps) {
  return (
    <div className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-black/10">
      {/* Sticky container keeps the back button visible at the top */}
      <div className="mx-auto w-full max-w-5xl px-4 py-3">
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-medium text-black/80 hover:text-black"
        >
          {/* Simple arrow indicator */}
          <span aria-hidden>←</span>
          <span>{label}</span>
        </Link>
      </div>
    </div>
  );
}
