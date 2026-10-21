import { NextResponse } from "next/server";
import { modelCatalog } from "@/lib/chatgpt-auth";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json(await modelCatalog(), { headers: { "cache-control": "no-store" } }); }
