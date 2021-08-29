import {replaceContent, staleRecords} from '../updatable-content'
import {ready} from '../document-ready'
import {replaceState} from '../history'

async function reapplyPreviouslyUpdatedContent() {
  if (!history.state || !history.state.staleRecords) return
  await ready
  for (const url in history.state.staleRecords) {
    for (const urlTarget of document.querySelectorAll(
      `.js-updatable-content [data-url='${url}'], .js-updatable-content[data-url='${url}']`
    )) {
      const data = history.state.staleRecords[url]
      if (urlTarget instanceof HTMLElement) replaceContent(urlTarget, data, true)
    }
  }
  replaceState(null, '', location.href)
}

window.addEventListener('beforeunload', function () {
  if (Object.keys(staleRecords).length > 0) {
    const stateObject = history.state || {}
    stateObject.staleRecords = staleRecords
    replaceState(stateObject, '', location.href)
  }
})

try {
  reapplyPreviouslyUpdatedContent()
} catch {
  // ignore
}
