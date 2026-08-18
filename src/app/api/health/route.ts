import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseClient } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  const brevoKey = (process.env.BREVO_API_KEY || "").trim();
  const brevoSender = (process.env.BREVO_SENDER_EMAIL || "").trim();

  let supabaseTableStatus = "Not tested";
  let dbError: string | null = null;

  if (isSupabaseConfigured && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("users").select("count", { count: "exact", head: true });
      if (error) {
        supabaseTableStatus = "Error querying users table";
        dbError = error.message;
      } else {
        supabaseTableStatus = "OK - Connected and users table exists";
      }
    } catch (e: any) {
      supabaseTableStatus = "Exception querying users table";
      dbError = e?.message || String(e);
    }
  } else {
    supabaseTableStatus = "Supabase NOT configured (environment variables missing)";
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      supabaseUrlPrefix: supabaseUrl ? supabaseUrl.slice(0, 15) + "..." : "Missing",
      hasSupabaseKey: Boolean(supabaseKey),
      supabaseKeyPrefix: supabaseKey ? supabaseKey.slice(0, 10) + "..." : "Missing",
      isSupabaseConfigured,
      hasBrevoApiKey: Boolean(brevoKey),
      brevoSenderEmail: brevoSender || "Missing",
    },
    database: {
      supabaseTableStatus,
      dbError,
    },
  });
}
