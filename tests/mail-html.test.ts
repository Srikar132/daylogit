import { describe, expect, it } from "vitest";
import { buildEmailSrcDoc, EMAIL_IFRAME_SANDBOX, stripDangerousTags } from "@/lib/mail-html";

describe("email iframe sandbox", () => {
  // These two tokens together would defeat the sandbox: a frame with both can
  // reach into the parent document and its storage. Email bodies are untrusted
  // input from anyone who knows the user's address, so neither may appear.
  it("never grants scripts or same-origin", () => {
    expect(EMAIL_IFRAME_SANDBOX).not.toContain("allow-scripts");
    expect(EMAIL_IFRAME_SANDBOX).not.toContain("allow-same-origin");
  });

  it("allows popups so links in an email still open", () => {
    // Without top-level navigation, a sandboxed link click silently does nothing.
    expect(EMAIL_IFRAME_SANDBOX).toContain("allow-popups");
  });
});

describe("stripDangerousTags", () => {
  // Defence in depth only — the sandbox is the real boundary. Asserted so the
  // string stays safe if it is ever rendered somewhere without one.
  it("removes script tags and their closing tags", () => {
    expect(stripDangerousTags('<p>hi</p><script>alert(1)</script>')).toBe("<p>hi</p>alert(1)");
  });

  it("removes nested frames and plugin embeds", () => {
    for (const tag of ["iframe", "object", "embed"]) {
      expect(stripDangerousTags(`<${tag} src="x"></${tag}>`)).toBe("");
    }
  });

  it("removes base and link tags, which could retarget urls or pull styles", () => {
    expect(stripDangerousTags('<base href="https://evil.example.com/">')).toBe("");
    expect(stripDangerousTags('<link rel="stylesheet" href="https://evil.example.com/x.css">')).toBe("");
  });

  it("keeps ordinary email markup intact", () => {
    const html = '<table><tr><td style="color:red">Hello <b>there</b></td></tr></table>';
    expect(stripDangerousTags(html)).toBe(html);
  });

  it("is case insensitive", () => {
    expect(stripDangerousTags("<SCRIPT>x</SCRIPT>")).toBe("x");
  });
});

describe("buildEmailSrcDoc", () => {
  it("produces a complete document so the frame doesn't inherit quirks mode", () => {
    const doc = buildEmailSrcDoc("<p>hi</p>");
    expect(doc.startsWith("<!doctype html>")).toBe(true);
    expect(doc).toContain("</html>");
  });

  it("targets links outside the frame, which the sandbox otherwise blocks", () => {
    expect(buildEmailSrcDoc("<p>hi</p>")).toContain('<base target="_blank"');
  });

  it("embeds the body content", () => {
    expect(buildEmailSrcDoc("<p>unique-marker</p>")).toContain("<p>unique-marker</p>");
  });

  it("strips scripts from the embedded body", () => {
    expect(buildEmailSrcDoc('<script>alert(1)</script><p>hi</p>')).not.toContain("<script>");
  });

  it("drops a sender's own <base>, so relative urls can't be retargeted", () => {
    const doc = buildEmailSrcDoc('<base href="https://evil.example.com/"><p>hi</p>');
    expect(doc).not.toContain("evil.example.com");
    expect(doc.match(/<base /g)).toHaveLength(1);
  });

  it("constrains images so a huge one can't blow out the layout", () => {
    expect(buildEmailSrcDoc("<p>hi</p>")).toContain("img{max-width:100%");
  });

  it("handles an empty body", () => {
    expect(() => buildEmailSrcDoc("")).not.toThrow();
    expect(buildEmailSrcDoc("")).toContain("<body>");
  });
});
