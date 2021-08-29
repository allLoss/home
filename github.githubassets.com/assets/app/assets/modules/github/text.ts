// Gets the length of code-points from a String.
//
// This is different to `string.length` which returns the amount of utf-8
// bytes, which is a different metric as - for example - the poo emoji is 2
// utf-8 bytes, but 1 unicode code point.
//
// See http://blog.jonnew.com/posts/poo-dot-length-equals-two for more.
export function getUtf8StringLength(str: string): number {
  const joiner = '\u200D'
  const split = str.split(joiner)
  let count = 0

  for (const s of split) {
    // removing the variation selectors
    const num = Array.from(s.split(/[\ufe00-\ufe0f]/).join('')).length
    count += num
  }

  // assuming the joiners are used appropriately
  return count / split.length
}

export function replaceText(
  textarea: HTMLInputElement | HTMLTextAreaElement,
  oldText: string,
  newText: string
): string {
  let beginning = textarea.value.substring(0, textarea.selectionEnd || 0)
  let remaining = textarea.value.substring(textarea.selectionEnd || 0)
  beginning = beginning.replace(oldText, newText)
  remaining = remaining.replace(oldText, newText)

  textarea.value = beginning + remaining
  textarea.selectionStart = beginning.length
  textarea.selectionEnd = beginning.length
  textarea.dispatchEvent(new CustomEvent('change', {bubbles: true, cancelable: false}))

  return newText
}

type InsertOptions = {
  appendNewline?: boolean
}
/**
 * Inserts text into a text input and moves the cursor appropriately.
 * If the cursor happens to be in the middle of a line, or the textarea isn't empty,
 * we add a newline character before the inserted text. We also advance the cursor
 * appropriately
 * @param textarea an `<input>` or `<textarea>` element
 * @param text The text to add
 * @param appendNewline optionally adds a `\n` character after `text`
 */
export function insertText(
  textarea: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  options: InsertOptions = {}
): string {
  const point = textarea.selectionEnd || 0
  const beginning = textarea.value.substring(0, point)
  const remaining = textarea.value.substring(point)
  const newline = textarea.value === '' || beginning.match(/\n$/) ? '' : '\n'
  const trailingNewline = options.appendNewline ? '\n' : ''
  const insertedText = newline + text + trailingNewline

  textarea.value = beginning + insertedText + remaining
  const newPoint = point + insertedText.length
  textarea.selectionStart = newPoint
  textarea.selectionEnd = newPoint
  textarea.dispatchEvent(new CustomEvent('change', {bubbles: true, cancelable: false}))
  textarea.focus()
  return insertedText
}
