"use client";

import { useState } from "react";

type Props = {
  programId: string;
  slug: string;
  primaryColor: string;
  childProfileId?: string;
  label?: string;
};

export default function CheckoutButton({ programId, slug, primaryColor, childProfileId, label }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, slug, childProfileId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading}
      className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      style={{ backgroundColor: primaryColor }}
    >
      {loading ? "Redirecting to payment..." : (label || "Complete Payment and Join Class")}
    </button>
  );
}
