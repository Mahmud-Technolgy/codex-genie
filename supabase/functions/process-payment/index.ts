import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentMethodId, amount, currency = "BDT", proofUrl, externalTransactionId, senderNumber } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    // Get payment method details
    const { data: paymentMethod, error: pmError } = await supabaseClient
      .from("payment_methods")
      .select("*")
      .eq("id", paymentMethodId)
      .eq("is_enabled", true)
      .single();

    if (pmError || !paymentMethod) throw new Error("Invalid payment method");

    // Calculate credits (1 BDT = 1 credit for simplicity)
    const creditsToAward = Math.floor(amount);

    // Create payment transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        user_id: userData.user.id,
        payment_method_id: paymentMethodId,
        amount,
        currency,
        status: paymentMethod.name === "manual" ? "pending" : "processing",
        external_transaction_id: externalTransactionId,
        proof_url: proofUrl,
        sender_number: senderNumber,
        credits_awarded: paymentMethod.name === "manual" ? 0 : creditsToAward
      })
      .select()
      .single();

    if (txError) throw new Error(`Transaction creation failed: ${txError.message}`);

    // For non-manual payments, award credits immediately (simplified)
    if (paymentMethod.name !== "manual") {
      // Update user credits
      const { error: creditError } = await supabaseClient
        .from("credits")
        .upsert({
          user_id: userData.user.id,
          amount: creditsToAward
        }, {
          onConflict: "user_id",
          ignoreDuplicates: false
        });

      if (!creditError) {
        // Log transaction
        await supabaseClient
          .from("credit_transactions")
          .insert({
            user_id: userData.user.id,
            amount: creditsToAward,
            type: "purchase",
            description: `Payment via ${paymentMethod.display_name}`,
            reference_id: transaction.id
          });

        // Update transaction status
        await supabaseClient
          .from("payment_transactions")
          .update({ status: "completed", credits_awarded: creditsToAward })
          .eq("id", transaction.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      transaction,
      message: paymentMethod.name === "manual" 
        ? "Payment submitted for review. Credits will be awarded after admin approval."
        : "Payment processed successfully!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});