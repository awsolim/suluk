"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
};

export default function SubmitButton({
  children,
  pendingText,
  className = "",
}: SubmitButtonProps) {
  const { pending } = useFormStatus(); // Tracks whether the parent form is currently submitting.

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      style={{ backgroundColor: "var(--primary-color)" }} // Use the mosque theme color automatically.
    >
      {pending ? pendingText : children}
    </button>
  );
}