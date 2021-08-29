import {fetchSafeDocumentFragment} from '../fetch'
import {observe} from 'selector-observer'

observe('.js-pulse-contribution-data', (contributionDataContainer: Element) => {
  loadContributionData(contributionDataContainer)
})

// Load the given contribution data content
//
// diffstatUrl: The url for requesting the diffstat for the repository
async function diffstatCall(diffstatUrl: string): Promise<DocumentFragment> {
  return fetchSafeDocumentFragment(document, diffstatUrl)
}

async function loadContributionData(contributionDataContainer: Element): Promise<void> {
  const diffstatUrl = contributionDataContainer.getAttribute('data-pulse-diffstat-summary-url')

  // Load the HTML we'll need
  let fragment: DocumentFragment | undefined
  try {
    if (diffstatUrl) {
      fragment = await diffstatCall(diffstatUrl)
      showContributionData(fragment, contributionDataContainer)
    }
  } catch (err) {
    const blankLoading = contributionDataContainer.querySelector<HTMLElement>('.js-blankslate-loading')!
    const blankError = contributionDataContainer.querySelector<HTMLElement>('.js-blankslate-error')!

    /* eslint-disable-next-line github/no-d-none */
    blankLoading.classList.add('d-none')
    /* eslint-disable-next-line github/no-d-none */
    blankError.classList.remove('d-none')
  }
}

// Show the contribution data for the repository
function showContributionData(fragment: DocumentFragment, target: Element): void {
  target.innerHTML = ''
  target.appendChild(fragment)
}
