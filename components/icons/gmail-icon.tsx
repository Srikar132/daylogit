import Image from "next/image";

/** The actual Gmail mark (public/icons/gmail.png) rather than a hand-drawn
 *  recreation — rendered via next/image, sized by the parent through
 *  className same as before. */
export function GmailIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/gmail.png"
      alt="Gmail"
      width={48}
      height={36}
      className={`object-contain ${className ?? ""}`}
    />
  );
}
