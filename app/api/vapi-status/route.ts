import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey) {
    return NextResponse.json({
      connected: false,
      reason: "VAPI_API_KEY not set",
    });
  }

  try {
    // Validate the key by listing phone numbers (lightweight GET)
    const res = await fetch("https://api.vapi.ai/phone-number?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        reason: `Vapi API returned ${res.status}`,
      });
    }

    return NextResponse.json({
      connected: true,
      hasPhoneNumberId: !!phoneNumberId,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
