// Bulk actions
//
// Provides a way to update bulk actions buttons/menus from a fetched url
// when check boxes are updated.
//
//     <div class="js-bulk-actions-container" data-bulk-actions-url="/bulk/actions/url" data-bulk-actions-parameter="member_ids">
//       <div class="js-bulk-actions">
//         <!-- buttons/menus to be updated -->
//       </div>
//
//       <div class="js-bulk-actions-item" data-bulk-actions-id="1">
//         <input type="checkbox" class="js-bulk-actions-toggle">
//       </div>
//     </div>
//
// If [data-bulk-actions-parameter] is not assigned, `input.js-bulk-actions-toggle`'s name and value will be used instead.
//
//     <div class="js-bulk-actions-container" data-bulk-actions-url="/bulk/actions/url">
//       <div class="js-bulk-actions">
//         <!-- buttons/menus to be updated -->
//       </div>
//
//       <input type="checkbox" name="member_ids[]" value="1" class="js-bulk-actions-toggle">
//     </div>
//

import {fire, on} from 'delegated-events'
import {debounce} from '@github/mini-throttle'

// Get the bulk-actions-url from the container.
function bulkUrl(container: Element): string {
  const url = new URL(container.getAttribute('data-bulk-actions-url')!, window.location.origin)
  const params = new URLSearchParams(url.search.slice(1))
  const name = container.getAttribute('data-bulk-actions-parameter')
  const checkedItems = Array.from(container.querySelectorAll<HTMLInputElement>('.js-bulk-actions-toggle:checked'))
  if (name) {
    const ids = checkedItems
      .map(el => el.closest<HTMLElement>('.js-bulk-actions-item')!.getAttribute('data-bulk-actions-id')!)
      .sort()
    for (const id of ids) {
      params.append(`${name}[]`, id)
    }
  } else {
    for (const input of checkedItems.sort((a, b) => (a.value > b.value ? 1 : -1))) {
      params.append(input.name, input.value)
    }
  }

  url.search = params.toString()
  return url.toString()
}

let previousController: AbortController | null = null
// Update the bulk actions container with new HTML fetched from the server.
async function updateBulkActions(event: Event) {
  const container = event.target
  if (!(container instanceof HTMLElement)) return
  const actionsContainer = container.querySelector<HTMLElement>('.js-bulk-actions')!
  const isItemSelected = !!container.querySelector('.js-bulk-actions-toggle:checked')

  previousController?.abort()
  const {signal} = (previousController = new AbortController())
  let html = ''
  try {
    // TODO: Drop `X-Requested-With` header once controllers are cleaned up of `request.xhr?`
    const response = await fetch(bulkUrl(container), {signal, headers: {'X-Requested-With': 'XMLHttpRequest'}})
    if (!response.ok) return
    html = await response.text()
  } catch {
    // Ignore network errors
  }
  if (signal.aborted) return
  if (!html) return

  if (!isItemSelected) {
    actionsContainer.innerHTML = html
    toggleMembershipTabs(container)
  } else {
    toggleMembershipTabs(container)
    actionsContainer.innerHTML = html
  }

  fire(container, 'bulk-actions:updated')
}

// Toggle the membership tabs based on the amount of checked bulk-actions.
function toggleMembershipTabs(container: HTMLElement) {
  const membershipTabs = document.querySelector('.js-membership-tabs')
  if (membershipTabs) {
    const checked = container.querySelectorAll('.js-bulk-actions-toggle:checked')
    /* eslint-disable-next-line github/no-d-none */
    membershipTabs.classList.toggle('d-none', checked.length > 0)
  }
}

on('change', '.js-bulk-actions-toggle', function (event) {
  const toggle = event.currentTarget
  const container = toggle.closest<HTMLElement>('.js-bulk-actions-container')!
  fire(container, 'bulk-actions:update')
})

on('bulk-actions:update', '.js-bulk-actions-container', debounce(updateBulkActions, 100))
