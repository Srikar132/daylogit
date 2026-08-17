import { describe, expect, it } from "vitest";
import { boardKey, inviteSuggestionsKey, workspaceMembersKey } from "@/lib/query-keys";

/**
 * These keys exist because the workspace was missing from them. Two workspaces
 * sharing one cache entry meant switching workspaces by client-side navigation
 * served the previous one's members, board, and NAME — including the name the
 * delete dialog asks you to retype, which it then rejected because the server
 * checked the real one. Only a full reload cleared it.
 */
describe("workspace-scoped query keys", () => {
  it("gives two workspaces different member keys", () => {
    expect(workspaceMembersKey("mahis-desk")).not.toEqual(workspaceMembersKey("maheswaris-desk"));
  });

  it("gives two workspaces different board keys for identical filters", () => {
    expect(boardKey("mahis-desk", "", "")).not.toEqual(boardKey("maheswaris-desk", "", ""));
  });

  it("gives two workspaces different suggestion keys for identical typing", () => {
    // Suggestions are filtered against the active workspace's members and
    // pending invites, so the same text means different results.
    expect(inviteSuggestionsKey("mahis-desk", "ali")).not.toEqual(inviteSuggestionsKey("maheswaris-desk", "ali"));
  });

  it("is stable for the same inputs, so a refetch reuses its own entry", () => {
    expect(workspaceMembersKey("mahis-desk")).toEqual(workspaceMembersKey("mahis-desk"));
    expect(boardKey("mahis-desk", "bug", "code")).toEqual(boardKey("mahis-desk", "bug", "code"));
  });

  it("still separates board filters within one workspace", () => {
    expect(boardKey("mahis-desk", "bug", "")).not.toEqual(boardKey("mahis-desk", "", ""));
    expect(boardKey("mahis-desk", "", "code")).not.toEqual(boardKey("mahis-desk", "", "review"));
  });

  it("puts the workspace ahead of the variable parts, so invalidating by prefix hits one workspace only", () => {
    // queryClient.invalidateQueries({ queryKey: ["board", slug] }) must not
    // reach another workspace's cached boards.
    expect(boardKey("mahis-desk", "bug", "code").slice(0, 2)).toEqual(["board", "mahis-desk"]);
    expect(inviteSuggestionsKey("mahis-desk", "ali").slice(0, 2)).toEqual(["inviteSuggestions", "mahis-desk"]);
    expect(workspaceMembersKey("mahis-desk")).toEqual(["workspaceMembers", "mahis-desk"]);
  });
});
