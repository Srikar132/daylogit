import { describe, expect, it } from "vitest";
import {
  filterInviteSuggestions,
  SUGGESTION_LIMIT,
  type SuggestionCandidate,
} from "@/lib/invite-suggestions";

const CANDIDATES: SuggestionCandidate[] = [
  { id: "u1", email: "alice@example.com", name: "Alice Anderson" },
  { id: "u2", email: "bob@example.com", name: "Bob Brown" },
  { id: "u3", email: "carol@other.com", name: null },
];

const EMPTY = { memberUserIds: [], invitedEmails: [] };

describe("filterInviteSuggestions", () => {
  it("matches on the email", () => {
    expect(filterInviteSuggestions(CANDIDATES, { query: "ali", ...EMPTY })).toEqual([
      { email: "alice@example.com", name: "Alice Anderson" },
    ]);
  });

  it("matches on the display name too, so you can type a person not an address", () => {
    expect(filterInviteSuggestions(CANDIDATES, { query: "brown", ...EMPTY })).toEqual([
      { email: "bob@example.com", name: "Bob Brown" },
    ]);
  });

  it("matches on a domain fragment", () => {
    const emails = filterInviteSuggestions(CANDIDATES, { query: "example.com", ...EMPTY }).map((s) => s.email);
    expect(emails).toEqual(["alice@example.com", "bob@example.com"]);
  });

  it("is case insensitive", () => {
    expect(filterInviteSuggestions(CANDIDATES, { query: "ALICE", ...EMPTY })).toHaveLength(1);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterInviteSuggestions(CANDIDATES, { query: "  bob  ", ...EMPTY })).toHaveLength(1);
  });

  it("returns nothing below the minimum query length", () => {
    // A one-character search is closer to "list everyone" than autocomplete.
    expect(filterInviteSuggestions(CANDIDATES, { query: "a", ...EMPTY })).toEqual([]);
    expect(filterInviteSuggestions(CANDIDATES, { query: "", ...EMPTY })).toEqual([]);
  });

  it("never suggests someone already in the workspace", () => {
    const result = filterInviteSuggestions(CANDIDATES, {
      query: "example.com",
      memberUserIds: ["u1"],
      invitedEmails: [],
    });
    expect(result.map((s) => s.email)).toEqual(["bob@example.com"]);
  });

  it("never suggests an address already invited, whatever its casing", () => {
    const result = filterInviteSuggestions(CANDIDATES, {
      query: "example.com",
      memberUserIds: [],
      invitedEmails: ["ALICE@EXAMPLE.COM"],
    });
    expect(result.map((s) => s.email)).toEqual(["bob@example.com"]);
  });

  it("handles candidates with no name", () => {
    expect(filterInviteSuggestions(CANDIDATES, { query: "carol", ...EMPTY })).toEqual([
      { email: "carol@other.com", name: null },
    ]);
  });

  it("caps the list so the dropdown can't swallow the panel", () => {
    const many: SuggestionCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      id: `u${i}`,
      email: `person${i}@example.com`,
      name: null,
    }));
    expect(filterInviteSuggestions(many, { query: "person", ...EMPTY })).toHaveLength(SUGGESTION_LIMIT);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterInviteSuggestions(CANDIDATES, { query: "zzz", ...EMPTY })).toEqual([]);
  });
});
