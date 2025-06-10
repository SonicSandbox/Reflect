import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log the raw request for debugging
    console.log("Raw request method:", req.method);
    console.log(
      "Raw request headers:",
      Object.fromEntries(req.headers.entries()),
    );

    let requestBody;
    try {
      const rawBody = await req.text();
      console.log("Raw request body:", rawBody);
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      throw new Error("Invalid JSON in request body");
    }

    const { user_id, return_url } = requestBody;

    console.log("Parsed request data:", { user_id, return_url });

    if (!user_id || !return_url) {
      console.error("Missing parameters:", {
        user_id: !!user_id,
        return_url: !!return_url,
      });
      throw new Error(
        "Missing required parameters: user_id and return_url are required",
      );
    }

    // Verify environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      throw new Error(
        "Server configuration error: Missing Supabase credentials",
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Looking for subscription for user_id:", user_id);

    // First, let's check all subscriptions for this user to debug
    const { data: allSubs, error: allSubsError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user_id);

    console.log("All subscriptions for user:", {
      allSubs: allSubs?.length || 0,
      subscriptions: allSubs,
      allSubsError,
    });

    if (allSubsError) {
      console.error("Error fetching all subscriptions:", allSubsError);
      throw new Error(
        `Database error while fetching subscriptions: ${allSubsError.message}`,
      );
    }

    // Get user's active subscription to find customer_id
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("customer_id, status, user_id, stripe_id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .single();

    console.log("Active subscription query result:", {
      subscription,
      subError,
    });

    if (subError) {
      console.error("Active subscription query error:", subError);

      // If no rows found, provide more helpful error
      if (subError.code === "PGRST116") {
        console.log(
          "No active subscription found. Total subscriptions for user:",
          allSubs?.length || 0,
        );
        if (allSubs && allSubs.length > 0) {
          console.log(
            "User has subscriptions but none are active:",
            allSubs.map((s) => ({ id: s.id, status: s.status })),
          );
          throw new Error(
            "You have subscriptions but none are currently active. Please contact support or renew your subscription.",
          );
        } else {
          throw new Error(
            "No subscription found for this user. Please subscribe first.",
          );
        }
      }

      throw new Error(
        `Database error while fetching active subscription: ${subError.message}`,
      );
    }

    if (!subscription) {
      throw new Error(
        "No active subscription found for this user. Please subscribe first.",
      );
    }

    // Check if customer_id exists
    if (!subscription.customer_id) {
      console.error("Subscription found but no customer_id:", subscription);
      throw new Error(
        "Subscription exists but no Stripe customer ID found. Please contact support.",
      );
    }

    console.log(
      "Creating Stripe portal session for customer:",
      subscription.customer_id,
    );

    // Verify the customer exists in Stripe before creating portal session
    try {
      const customer = await stripe.customers.retrieve(
        subscription.customer_id,
      );
      console.log("Stripe customer found:", {
        id: customer.id,
        email: customer.email,
      });
    } catch (stripeError) {
      console.error("Stripe customer not found:", stripeError);
      throw new Error("Stripe customer not found. Please contact support.");
    }

    // Create Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer_id,
      return_url: return_url,
    });

    console.log("Portal session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating customer portal session:", error);

    // Determine appropriate status code
    let statusCode = 400;
    let errorMessage = error.message || "Unknown error occurred";

    // Handle specific error types
    if (errorMessage.includes("Server configuration error")) {
      statusCode = 500;
    } else if (
      errorMessage.includes("No subscription found") ||
      errorMessage.includes("No active subscription")
    ) {
      statusCode = 404;
    } else if (
      errorMessage.includes("Invalid JSON") ||
      errorMessage.includes("Missing required parameters")
    ) {
      statusCode = 400;
    }

    console.log("Returning error response:", { statusCode, errorMessage });

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.stack || "No stack trace available",
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
