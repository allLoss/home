import {observe} from 'selector-observer'

// Sets the text of the avatar reset button depending on whether or not the
// user has a gravatar associated with their GitHub account.
async function detectGravatar(el: Element) {
  const gravitarUrl = el.getAttribute('data-url') || ''
  const hasGravitar = await fetchGravatarInfo(gravitarUrl)

  if (hasGravitar) {
    const gravatarText = el.getAttribute('data-gravatar-text')
    if (gravatarText != null) {
      el.textContent = gravatarText
    }
  }
}

observe('.js-detect-gravatar', function (el) {
  detectGravatar(el)
})

// Fetch the gravitarUrl, and check the `has_gravatar` property from the returning JSON.
async function fetchGravatarInfo(gravitarUrl: string): Promise<boolean> {
  const url = gravitarUrl
  if (!url) return false

  try {
    const response = await fetch(url, {headers: {Accept: 'application/json'}})
    if (!response.ok) return false
    const data = (await response.json()) as {has_gravatar: boolean}
    return data.has_gravatar
  } catch {
    return false
  }
}
