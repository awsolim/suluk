"use client";

import { useState } from "react";

type Props = {
  mosqueId: string;
  slug: string;
  stripeStatus: "not_started" | "pending" | "connected";
  primaryColor: string;
};

export default function StripeConnectButton({
  mosqueId,
  slug,
  stripeStatus,
  primaryColor,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mosqueId, slug }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start Stripe onboarding.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (stripeStatus === "connected") {
    return (
      <div className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
        Stripe account connected
      </div>
    );
  }

  const buttonLabel =
    stripeStatus === "pending" ? "Continue Stripe Setup" : "Connect Stripe Account";

  return (
    <div className="space-y-2">
      {stripeStatus === "pending" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Stripe onboarding is incomplete. Please continue setup to accept payments.
        </p>
      )}
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? "Connecting..." : buttonLabel}
      </button>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
