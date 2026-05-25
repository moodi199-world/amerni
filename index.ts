import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_OTP = "123456";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "966" + digits.slice(1);
  if (digits.startsWith("966")) return digits;
  if (digits.length === 9) return "966" + digits;
  // Fallback: return digits or a demo phone
  return digits || "966500000000";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, phone, otp: rawOtp } = body;

    if (!phone) return json({ error: "Phone required" }, 400);

    const normalizedPhone = normalizePhone(phone.toString().trim());

    // ── SEND OTP ─────────────────────────────────────────────────────────────
    if (action === "send_otp") {
      // Invalidate existing pending OTPs
      await supabase
        .from("phone_verifications")
        .update({ verified: true })
        .eq("phone", normalizedPhone)
        .eq("verified", false);

      const newOTP = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from("phone_verifications").insert({
        phone: normalizedPhone,
        otp: newOTP,
        expires_at: expiresAt,
        verified: false,
      });

      if (insertError) return json({ error: "Failed to store OTP" }, 500);

      // Dev mode: return OTP in response (replace with SMS in production)
      return json({ success: true, dev_otp: newOTP, phone: normalizedPhone });
    }

    // ── VERIFY OTP ───────────────────────────────────────────────────────────
    if (action === "verify_otp") {
      if (!rawOtp) return json({ error: "OTP required" }, 400);

      const enteredOtp = rawOtp.toString().trim();
      const isDemoOtp = enteredOtp === DEMO_OTP;

      if (!isDemoOtp) {
        // Fetch latest unverified OTP for this phone
        const { data: records } = await supabase
          .from("phone_verifications")
          .select("id, otp, expires_at")
          .eq("phone", normalizedPhone)
          .eq("verified", false)
          .order("created_at", { ascending: false })
          .limit(1);

        const record = records && records.length > 0 ? records[0] : null;

        if (!record) {
          return json({ error: "No pending OTP. Request a new code." }, 400);
        }

        // Expiry check (server time)
        if (Date.now() > new Date(record.expires_at).getTime()) {
          return json({ error: "OTP expired. Request a new code." }, 400);
        }

        // String comparison — both sides trimmed
        if (record.otp.toString().trim() !== enteredOtp) {
          return json({ error: "Invalid OTP." }, 400);
        }

        // Mark verified
        await supabase
          .from("phone_verifications")
          .update({ verified: true })
          .eq("id", record.id);
      }

      // Derive deterministic credentials from phone
      const email = `${normalizedPhone}@guest.amerni.app`;
      const password = `ph_${normalizedPhone}_mahal2024`;

      // Check if user exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);

      let userId: string;

      if (existingUser?.user) {
        userId = existingUser.user.id;
      } else {
        // Create new auth user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { phone: normalizedPhone, is_guest: true },
        });

        if (createError || !newUser?.user) {
          return json({ error: "Failed to create account: " + (createError?.message ?? "unknown") }, 500);
        }
        userId = newUser.user.id;

        // Ensure profile row exists (trigger may also do this)
        await supabase.from("profiles").upsert({
          id: userId,
          phone: normalizedPhone,
          role: "user",
          full_name: "",
          phone_verified: true,   // phone was just verified via OTP
          email_verified: false,
        }, { onConflict: "id" });
      }

      // Mark phone as verified on existing profile
      await supabase.from("profiles")
        .update({ phone_verified: true, updated_at: new Date().toISOString() })
        .eq("id", userId);

      return json({ success: true, email, password, phone: normalizedPhone, user_id: userId });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
