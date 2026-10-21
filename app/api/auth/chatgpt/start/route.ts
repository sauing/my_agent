import { NextResponse } from "next/server";
import { beginLogin } from "@/lib/chatgpt-auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const callback = `http://127.0.0.1:${url.port || "3000"}/api/auth/chatgpt/callback`;
  return NextResponse.redirect(await beginLogin(callback));
}
