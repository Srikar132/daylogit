/**
 * Wraps an email's HTML body for display inside a sandboxed iframe.
 *
 * Email HTML is hostile input twice over. It can carry scripts — it was being
 * injected straight into the page with `dangerouslySetInnerHTML`, which let any
 * sender run code in this app's origin, with the user's session — and it carries
 * its own CSS, which leaks out and wrecks the surrounding UI when rendered
 * inline. An iframe with no `allow-scripts` in its sandbox solves both: the
 * document gets a unique origin it can't escape, scripts never execute, and its
 * styles stay inside the frame.
 *
 * The sandbox attribute is the actual security boundary. The tag stripping below
 * is only defence in depth, for the day someone renders this string somewhere
 * else — never treat it as a sanitizer.
 */

const DANGEROUS_TAGS = /<\/?(script|iframe|object|embed|link|meta|base)\b[^>]*>/gi;

export function stripDangerousTags(html: string): string {
  return html.replace(DANGEROUS_TAGS, "");
}

export function buildEmailSrcDoc(html: string): string {
  // `base target="_blank"` because the sandbox withholds top-level navigation:
  // without it every link in the email would silently do nothing when clicked.
  return [
    "<!doctype html><html><head><meta charset=\"utf-8\">",
    '<base target="_blank" rel="noopener noreferrer">',
    "<style>",
    "html,body{margin:0;padding:0;background:transparent;color:#d4d4d8;",
    "font:13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
    "word-break:break-word;overflow-wrap:anywhere}",
    "body{padding:2px}",
    // Emails are written for white backgrounds and routinely set dark text on
    // an assumed-white body, so give tables/blocks a light surface rather than
    // fighting each sender's colours.
    "table,td,th,div,p,span{max-width:100%!important}",
    "img{max-width:100%;height:auto}",
    "a{color:#8ab4f8}",
    "blockquote{margin:0.6em 0;padding-left:0.8em;border-left:2px solid rgba(255,255,255,0.15)}",
    "pre{white-space:pre-wrap}",
    "</style></head><body>",
    stripDangerousTags(html),
    "</body></html>",
  ].join("");
}

/** Sandbox tokens for the reader iframe. Deliberately WITHOUT `allow-scripts`
 *  and `allow-same-origin` — together those two would undo the sandbox
 *  entirely. Popups are allowed so links in the email can open in a new tab. */
export const EMAIL_IFRAME_SANDBOX = "allow-popups allow-popups-to-escape-sandbox";
