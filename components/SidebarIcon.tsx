import type { NavIconType } from "@/lib/nav";

export default function SidebarIcon({ type }: { type: NavIconType }) {
  const className = "h-5 w-5 shrink-0";

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

  if (type === "members") {
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
        <circle cx="9" cy="8" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 19c0-2.76 2.69-5 6-5s6 2.24 6 5" />
        <circle cx="17" cy="9" r="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 18c0-1.66-1.34-3-3-3-1.12 0-2.1.62-2.6 1.53" />
      </svg>
    );
  }

  // settings (default)
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
