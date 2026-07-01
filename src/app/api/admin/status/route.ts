import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../login/route";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("pawchive_admin")?.value;
  if (!token) return NextResponse.json({ ok: false });
  const claim = verifyToken(token);
  if (!claim) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, user: claim.user });
}
