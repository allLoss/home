// More robust version of Range.surroundContents().
export function surroundContents(range: Range, newNode: Node) {
  newNode.appendChild(range.extractContents())
  range.insertNode(newNode)
}
