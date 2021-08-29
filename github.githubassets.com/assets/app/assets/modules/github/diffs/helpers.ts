// Detect if location Hash matches a diff anchor with line numbers.
// Use this to check whether a location should be routed to a diff expander element.
export function matchHash(hash: string): RegExpMatchArray | null {
  const diffAnchorMatch = hash.match(/^#?(diff-[a-f0-9]+)(L|R)(\d+)(?:-(L|R)(\d+))?$/i)
  if (diffAnchorMatch != null && diffAnchorMatch.length === 6) {
    return diffAnchorMatch
  }

  const discussionAnchorMatch = hash.match(/^#?(discussion-diff-[0-9]+)(L|R)(\d+)(?:-(L|R)(\d+))?$/i)
  if (discussionAnchorMatch != null && discussionAnchorMatch.length === 6) {
    return discussionAnchorMatch
  }

  return null
}
