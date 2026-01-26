import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "KAB Group <billing@kabgroup.co.uk>",
    to: "barryfairgrieve@hotmail.com",
    subject: "Test email",
    html: "<p>This is a test from KAB</p>",
  });

  return NextResponse.json({ ok: true });
}

