import {observe} from 'selector-observer'

// Load team members to display in the mention's tooltip from the server on hover.
async function members(event: Event) {
  const target = event.currentTarget as HTMLElement
  if (teamHovercardEnabled(target)) {
    target.classList.remove('tooltipped')
    return
  }
  const url = target.getAttribute('data-url')
  if (!url) return

  const response = await fetch(url, {headers: {Accept: 'application/json'}})
  if (!response.ok) return
  const data = (await response.json()) as {total: number; members: string[]}

  const id = target.getAttribute('data-id')!
  const mentions = document.querySelectorAll(`.js-team-mention[data-id='${id}']`)
  for (const el of mentions) {
    el.removeAttribute('data-url')
  }

  try {
    if (data.total === 0) {
      // eslint-disable-next-line i18n-text/no-en
      data.members.push('This team has no members')
    } else if (data.total > data.members.length) {
      data.members.push(`${data.total - data.members.length} more`)
    }
    tip(mentions, sentence(data.members))
  } catch (error) {
    const status = error.response ? error.response.status : 500
    const message = target.getAttribute(status === 404 ? 'data-permission-text' : 'data-error-text')!
    tip(mentions, message)
  }
}

// Add a tooltip to the elements. Adds the text just before the tooltip classes so
// the tooltip appears fully formed on mouse hover.
function tip(elements: NodeList, text: string): void {
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue
    el.setAttribute('aria-label', text)
    el.classList.add('tooltipped', 'tooltipped-s', 'tooltipped-multiline')
  }
}

// Comma separate a list of strings with `and` at the end, like
// Rails' to_sentence.
function sentence(xs: string[]): string {
  if ('ListFormat' in Intl) {
    const lists = new Intl.ListFormat()
    return lists.format(xs)
  }

  if (xs.length === 0) {
    return ''
  } else if (xs.length === 1) {
    return xs[0]
  } else if (xs.length === 2) {
    return xs.join(' and ')
  } else {
    const last = xs[xs.length - 1]
    return xs.slice(0, -1).concat(`and ${last}`).join(', ')
  }
}

function teamHovercardEnabled(element: HTMLElement): boolean {
  return !!element.getAttribute('data-hovercard-url') && !!element.closest('[data-team-hovercards-enabled]')
}

observe('.js-team-mention', function (el) {
  el.addEventListener('mouseenter', members)
})
