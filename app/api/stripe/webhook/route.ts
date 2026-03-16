import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Stripe webhook is not connected yet.",
    },
    { status: 501 }
  );
}