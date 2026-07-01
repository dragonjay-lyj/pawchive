import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../login/route";
import { updateAdminPassword, getAdminUsername } from "@/lib/adminStore";

export async function POST(req: NextRequest) {
  // Require valid admin session
  const token = req.cookies.get("pawchive_admin")?.value;
  const claim = token ? verifyToken(token) : null;
  if (!claim) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: { currentPass?: string; newPass?: string; newUser?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const currentPass = String(body?.currentPass ?? "");
  const newPass = String(body?.newPass ?? "");
  const newUser = body?.newUser ? String(body.newUser) : undefined;
  const result = await updateAdminPassword(currentPass, newPass, newUser);

  if (!result.ok) {
    const status = result.error === "current-password-wrong" ? 403 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const nextUser = await getAdminUsername();
  return NextResponse.json({ ok: true, user: nextUser });
}
