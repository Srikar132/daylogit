export type SuggestionCandidate = { id: string; email: string; name: string | null };
export type InviteSuggestion = { email: string; name: string | null };

export const SUGGESTION_LIMIT = 5;
/** Below this, a suggestion list is noise — and a one-character prefix search
 *  is closer to "list everyone" than to autocomplete. */
export const MIN_SUGGESTION_QUERY_LENGTH = 2;

/**
 * Picks which of the viewer's existing collaborators to suggest for an invite.
 *
 * Pure so the rules that matter — never suggest someone already in the
 * workspace, never someone already invited, match on name as well as email —
 * are testable without a database.
 */
export function filterInviteSuggestions(
  candidates: SuggestionCandidate[],
  {
    query,
    memberUserIds,
    invitedEmails,
  }: { query: string; memberUserIds: Iterable<string>; invitedEmails: Iterable<string> },
): InviteSuggestion[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < MIN_SUGGESTION_QUERY_LENGTH) return [];

  const alreadyIn = new Set(memberUserIds);
  const alreadyInvited = new Set([...invitedEmails].map((email) => email.toLowerCase()));

  return candidates
    .filter((candidate) => !alreadyIn.has(candidate.id))
    .filter((candidate) => !alreadyInvited.has(candidate.email.toLowerCase()))
    .filter(
      (candidate) =>
        candidate.email.toLowerCase().includes(needle) || (candidate.name ?? "").toLowerCase().includes(needle),
    )
    .slice(0, SUGGESTION_LIMIT)
    .map((candidate) => ({ email: candidate.email, name: candidate.name }));
}
