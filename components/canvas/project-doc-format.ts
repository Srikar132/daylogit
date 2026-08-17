/** Link label/host formatting for the project doc card. Pure, so the card and
 *  anything else that renders these links agree on the wording. */
export function formatGithubLabel(url: string, explicitLabel?: string): string {
  if (explicitLabel) return explicitLabel;
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2) {
      return `${pathSegments[0]}/${pathSegments[1]}`;
    }
    if (pathSegments.length === 1) {
      return pathSegments[0];
    }
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function formatLiveHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}
