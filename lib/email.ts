import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound app email (invitations today, anything transactional later).
 *
 * SMTP rather than an API provider on purpose: this app has no custom domain
 * yet, and every API provider (Resend included) will only deliver to arbitrary
 * recipients from a DNS-verified domain — `*.vercel.app` can't be verified,
 * since we don't control that zone. SMTP with a real mailbox's app password
 * sends to anyone today with no DNS at all. When a domain does exist, swapping
 * in an API provider means reimplementing `deliver()` and nothing else: every
 * caller only ever sees `sendEmail`.
 *
 * With no SMTP credentials configured this becomes a no-op that logs what it
 * would have sent — same graceful-degradation choice as lib/rate-limit.ts, so
 * local dev, tests and CI never need secrets, and an invite still works
 * through its copy-link.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Always send one — HTML-only mail scores worse with
   *  spam filters and breaks text-only clients. */
  text: string;
};

export type SendEmailResult = { delivered: boolean; skippedReason?: string };

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function readSmtpConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return {
    host: SMTP_HOST,
    // 587 = STARTTLS, the port virtually every provider wants for submission.
    port: Number(SMTP_PORT ?? 587),
    user: SMTP_USER,
    pass: SMTP_PASS,
    // Gmail rejects a From that isn't the authenticated mailbox, so default to it.
    from: EMAIL_FROM ?? SMTP_USER,
  };
}

let cachedTransport: Transporter | null = null;

function getTransport(config: SmtpConfig): Transporter {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      // Implicit TLS on 465, STARTTLS upgrade on everything else.
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }
  return cachedTransport;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  const config = readSmtpConfig();
  if (!config) {
    console.info(`[email] SMTP not configured — would have sent "${subject}" to ${to}`);
    return { delivered: false, skippedReason: "SMTP not configured" };
  }

  await getTransport(config).sendMail({ from: config.from, to, subject, html, text });
  return { delivered: true };
}
