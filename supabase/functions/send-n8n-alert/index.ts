import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  status: string;
  previousStatus?: string;
  error?: string;
  responseTime?: number;
  circuitBreakerState?: string;
  reason?: string;
  isTest?: boolean;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body: AlertRequest = await req.json();
    const {
      status,
      previousStatus,
      error,
      responseTime,
      circuitBreakerState,
      reason,
      isTest = false,
      timestamp
    } = body;

    console.log("N8N Alert Request:", { status, reason, isTest });

    // Get notification preferences from all super admins
    const { data: superAdmins, error: adminError } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("is_active", true);

    if (adminError) {
      console.error("Error fetching super admins:", adminError);
    }

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from("user_preferences")
      .select("user_id, notification_preferences")
      .in("user_id", superAdmins?.map(a => a.user_id) || []);

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
    }

    // Get user profiles for emails
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", superAdmins?.map(a => a.user_id) || []);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
    }

    // Prepare notification content
    const statusEmoji = status === "down" ? "🔴" : status === "healthy" ? "✅" : "⚠️";
    const subject = isTest 
      ? "🧪 Test: N8N Health Alert"
      : `${statusEmoji} N8N Alert: ${reason || status.toUpperCase()}`;

    const emailBody = `
      <h2>${subject}</h2>
      <p><strong>Timestamp:</strong> ${timestamp || new Date().toISOString()}</p>
      <p><strong>Current Status:</strong> ${status.toUpperCase()}</p>
      ${previousStatus ? `<p><strong>Previous Status:</strong> ${previousStatus.toUpperCase()}</p>` : ''}
      ${circuitBreakerState ? `<p><strong>Circuit Breaker:</strong> ${circuitBreakerState}</p>` : ''}
      ${responseTime ? `<p><strong>Response Time:</strong> ${responseTime}ms</p>` : ''}
      ${error ? `<p><strong>Error:</strong> ${error}</p>` : ''}
      <p><strong>Reason:</strong> ${reason || 'N/A'}</p>
      ${isTest ? '<p><em>This is a test notification. No action required.</em></p>' : ''}
      <hr />
      <p>View the <a href="https://your-app.com/n8n-monitoring">N8N Monitoring Dashboard</a> for more details.</p>
    `;

    const notifications: Promise<any>[] = [];

    // Send email notifications
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      for (const profile of profiles || []) {
        const userPref = preferences?.find(p => p.user_id === profile.id);
        const n8nAlerts = userPref?.notification_preferences?.n8n_alerts;

        // Send if: test mode OR (alerts enabled and email channel enabled)
        if (isTest || (n8nAlerts?.enabled && n8nAlerts?.channels?.includes('email'))) {
          const emailPromise = resend.emails.send({
            from: "N8N Monitor <onboarding@resend.dev>",
            to: [profile.email],
            subject,
            html: emailBody,
          }).then(() => {
            // Log successful notification
            return supabase.from("notification_logs").insert({
              notification_type: "email",
              recipient: profile.email,
              subject,
              message: emailBody,
              status: "sent",
              metadata: { isTest, status, reason }
            });
          }).catch((err) => {
            console.error("Email send error:", err);
            // Log failed notification
            return supabase.from("notification_logs").insert({
              notification_type: "email",
              recipient: profile.email,
              subject,
              message: emailBody,
              status: "failed",
              error_message: err.message,
              metadata: { isTest, status, reason }
            });
          });

          notifications.push(emailPromise);
        }
      }
    }

    // Wait for all notifications to complete
    await Promise.allSettled(notifications);

    console.log(`Sent ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        message: isTest ? "Test notification sent" : "Alert notifications sent"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-n8n-alert:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});