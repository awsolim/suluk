"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavIconType =
  | "home"
  | "classes"
  | "programs"
  | "students"
  | "new-program"
  | "settings";

type NavItem = {
  href: string;
  icon: NavIconType;
  label: string;
};

type Props = {
  items: NavItem[];
};

function NavIcon({
  type,
  active,
}: {
  type: NavIconType;
  active: boolean;
}) {
  const className = `h-5 w-5 ${active ? "text-(--primary-color)" : "text-gray-500"}`;

  if (type === "home") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 9.75V21h13.5V9.75" />
      </svg>
    );
  }

  if (type === "classes") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6 3 10.5 12 15l9-4.5L12 6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.75V16.5C7.5 17.74 9.51 18.75 12 18.75s4.5-1.01 4.5-2.25v-3.75" />
      </svg>
    );
  }

  if (type === "programs") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h8.5a2.25 2.25 0 0 1 2.25 2.25V19.5H8.25A2.25 2.25 0 0 0 6 21.75V6.75A2.25 2.25 0 0 1 8.25 4.5Z" />
      </svg>
    );
  }

  if (type === "students") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 19c0-2.76 2.69-5 6-5s6 2.24 6 5" />
      </svg>
    );
  }

  if (type === "new-program") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.33 4.67 12 3l1.67 1.67 2.36-.53.94 2.23 2.36.94-.53 2.36L21 12l-1.67 1.67.53 2.36-2.23.94-.94 2.36-2.36-.53L12 21l-1.67-1.67-2.36.53-.94-2.23-2.36-.94.53-2.36L3 12l1.67-1.67-.53-2.36 2.23-.94.94-2.36 2.36.53Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function BottomNavClient({ items }: Props) {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-4 z-30">
      <div className="mx-auto max-w-md px-4">
        <div
          className="pointer-events-auto rounded-full border border-white/30 px-2 py-2 shadow-lg backdrop-blur-xl"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--primary-color) 12%, white 88%)",
          }}
        >
          <div className="grid grid-cols-4 gap-1">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== pathname && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-14 flex-col items-center justify-center rounded-full px-2 py-2 text-center transition active:scale-[0.97]"
                  style={
                    isActive
                      ? {
                          backgroundColor: "rgba(255, 255, 255, 0.92)",
                          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                        }
                      : undefined
                  }
                >
                  <NavIcon type={item.icon} active={isActive} />

                  <span
                    className={`mt-1 text-[11px] font-medium leading-none ${
                      isActive ? "text-(--primary-color)" : "text-gray-600"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}