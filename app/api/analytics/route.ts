import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Client-side Google Analytics handles visitor tracking.",
  });
}
