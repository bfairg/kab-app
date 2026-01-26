// lib/email.ts

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSignupConfirmationEmail(args: {
  to: string;
  fullName?: string | null;
  planLabel: string;
  prorataPounds?: string;
  subscriptionStartDate: string; // YYYY-MM-DD
  monthlyPricePounds: string; // "10.00" or "15.00"
  reference: string;
}) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("Missing EMAIL_FROM");

  const name = (args.fullName || "").trim() || "there";
  const subject = "Your Direct Debit is set up";

  const hasProrata =
    typeof args.prorataPounds === "string" && Number(args.prorataPounds) > 0;

  const prorataBlock = hasProrata
    ? `
      <p>
        <strong>Pro-rata charge:</strong><br/>
        £${escapeHtml(args.prorataPounds)} will be collected shortly. This covers the period before your regular monthly payments begin.
      </p>
    `
    : `
      <p>
        <strong>Pro-rata charge:</strong><br/>
        No pro-rata charge applies.
      </p>
    `;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
      <p>Hi ${escapeHtml(name)},</p>

      <p>
        Your Direct Debit has been successfully set up and your subscription is confirmed.
      </p>

      <p>
        <strong>Plan:</strong> ${escapeHtml(args.planLabel)}<br/>
        <strong>Monthly price:</strong> £${escapeHtml(args.monthlyPricePounds)} per month
      </p>

      ${prorataBlock}

      <p>
        <strong>Subscription start date:</strong><br/>
        Your regular monthly subscription will start on
        <strong>${escapeHtml(args.subscriptionStartDate)}</strong>.
      </p>

      <p>
        Monthly payments are normally taken on the 1st of each month. In some cases, the start date may be slightly later due to bank processing rules around new Direct Debit mandates.
      </p>

      <p>
        <strong>Reference:</strong> ${escapeHtml(args.reference)}
      </p>

      <p>
        If you have any questions, just reply to this email and we will be happy to help.
      </p>

      <p>
        Thanks,<br/>
        KAB Group
      </p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: args.to,
    subject,
    html,
  });
}

function escapeHtml(input: string | null | undefined) {
  const s = input ?? "";
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
