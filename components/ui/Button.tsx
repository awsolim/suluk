import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
};

/**
 * Primary action button used across the app.
 * Provides a consistent filled button style.
 */
export default function Button({ children, href, type = "button" }: Props) {
  const className =
    "inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 active:scale-[0.98]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={className}>
      {children}
    </button>
  );
}