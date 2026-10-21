import { NextResponse } from "next/server";
import { completeLogin } from "@/lib/chatgpt-auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const port = url.port || "3000";
  const home = `http://127.0.0.1:${port}/`;
  if (url.searchParams.has("error")) return NextResponse.redirect(`${home}?siwc=denied`);
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) throw new Error("Missing sign-in response.");
    await completeLogin(code, state, url.searchParams.get("client_id") || undefined);
    return NextResponse.redirect(`${home}?siwc=connected`);
  } catch {
    return NextResponse.redirect(`${home}?siwc=error`);
  }
}
