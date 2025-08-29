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
    const { transactionId, status, adminNotes, creditsToAward } = await req.json();

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

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (profile?.role !== "admin") throw new Error("Admin access required");

    // Get transaction details
    const { data: transaction, error: txError } = await supabaseClient
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) throw new Error("Transaction not found");

    // Update transaction status
    const { error: updateError } = await supabaseClient
      .from("payment_transactions")
      .update({
        status,
        admin_notes: adminNotes,
        credits_awarded: status === "approved" ? creditsToAward : 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", transactionId);

    if (updateError) throw new Error(`Update failed: ${updateError.message}`);

    // If approved, award credits
    if (status === "approved" && creditsToAward > 0) {
      // Get current credits
      const { data: currentCredits, error: creditsError } = await supabaseClient
        .from("credits")
        .select("amount")
        .eq("user_id", transaction.user_id)
        .single();

      if (creditsError) {
        console.error("Error fetching current credits:", creditsError);
        // Create credits record if it doesn't exist
        await supabaseClient
          .from("credits")
          .insert({
            user_id: transaction.user_id,
            amount: creditsToAward
          });
      } else {
        // Update existing credits
        const { error: updateCreditsError } = await supabaseClient
          .from("credits")
          .update({
            amount: (currentCredits?.amount || 0) + creditsToAward,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", transaction.user_id);

        if (updateCreditsError) {
          console.error("Error updating credits:", updateCreditsError);
          throw new Error("Failed to award credits");
        }
      }

      // Log credit transaction
      await supabaseClient
        .from("credit_transactions")
        .insert({
          user_id: transaction.user_id,
          amount: creditsToAward,
          type: "purchase",
          description: `Payment approved by admin - ${adminNotes || 'Manual payment'}`,
          reference_id: transactionId
        });
    }

    // Log admin action
    await supabaseClient
      .from("admin_logs")
      .insert({
        admin_id: userData.user.id,
        action: `payment_${status}`,
        target_user_id: transaction.user_id,
        details: {
          transaction_id: transactionId,
          credits_awarded: creditsToAward,
          admin_notes: adminNotes
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Payment ${status} successfully. ${status === "approved" ? `${creditsToAward} credits awarded.` : ""}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment approval error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});