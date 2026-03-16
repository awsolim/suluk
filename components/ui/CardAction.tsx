import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  href: string;
};

/**
 * Secondary button used inside cards for small actions.
 * Gives links a clear clickable button appearance.
 */
export default function CardAction({ children, href }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-gray-100"
      style={{ backgroundColor: "var(--primary-color)" }}
    >
      {children}
    </Link>
  );
}