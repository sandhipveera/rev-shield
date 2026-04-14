import { NextRequest, NextResponse } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD || "revshield2026";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === SITE_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("revshield_auth", SITE_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
