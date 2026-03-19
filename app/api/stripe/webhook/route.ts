import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events from connected accounts.
 * Verifies the signature, then processes checkout and subscription events.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook signature verification failed.` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error handling webhook event ${event.type}: ${message}`);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const programId = session.metadata?.program_id;
  const studentProfileId = session.metadata?.student_profile_id;
  const mosqueId = session.metadata?.mosque_id;

  if (!programId || !studentProfileId || !mosqueId) {
    console.error("Checkout session missing required metadata.", session.id);
    return;
  }

  // Idempotent enrollment creation — safe for duplicate webhook deliveries
  const { error: enrollError } = await supabase
    .from("enrollments")
    .upsert(
      { program_id: programId, student_profile_id: studentProfileId },
      { onConflict: "program_id,student_profile_id", ignoreDuplicates: true }
    );

  if (enrollError) {
    console.error("Failed to create enrollment:", enrollError.message);
  }

  // Update the application status to joined
  await supabase
    .from("program_applications")
    .update({ status: "joined", joined_at: new Date().toISOString() })
    .eq("student_profile_id", studentProfileId)
    .eq("program_id", programId);

  // Create or update the subscription record
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (subscriptionId) {
    const { data: existingSub } = await supabase
      .from("program_subscriptions")
      .select("id")
      .eq("profile_id", studentProfileId)
      .eq("program_id", programId)
      .maybeSingle();

    if (existingSub) {
      await supabase
        .from("program_subscriptions")
        .update({
          stripe_subscription_id: subscriptionId,
          status: "active",
        })
        .eq("id", existingSub.id);
    } else {
      await supabase.from("program_subscriptions").insert({
        profile_id: studentProfileId,
        program_id: programId,
        stripe_subscription_id: subscriptionId,
        status: "active",
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  // In Stripe API v2024+, subscription is under parent.subscription_details
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails) return;

  const subscriptionId =
    typeof subDetails.subscription === "string"
      ? subDetails.subscription
      : subDetails.subscription?.id;

  if (!subscriptionId) return;

  // Keep subscription active on successful payment
  await supabase
    .from("program_subscriptions")
    .update({ status: "active" })
    .eq("stripe_subscription_id", subscriptionId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  await supabase
    .from("program_subscriptions")
    .update({ status: "cancelled" })
    .eq("stripe_subscription_id", subscription.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const updateData: Record<string, unknown> = {
    status: subscription.status === "active" ? "active" : subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  await supabase
    .from("program_subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);
}
