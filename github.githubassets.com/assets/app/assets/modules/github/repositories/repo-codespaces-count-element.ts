import {attr, controller} from '@github/catalyst'
import {GetRepoElement} from './get-repo-element'
import {observe} from 'selector-observer'

@controller
class RepoCodespacesCountElement extends HTMLElement {
  @attr count = 0

  connectedCallback() {
    observe('get-repo', {
      constructor: GetRepoElement,
      add: el => {
        this.handleGetRepoElement(el)
      }
    })
  }

  handleGetRepoElement(getRepoElement: GetRepoElement) {
    if (!getRepoElement.openOrCreateInCodespace) {
      return
    }
    if (this.count === 0) {
      getRepoElement.showOpenOrCreateInCodespace()
    } else {
      getRepoElement.removeOpenOrCreateInCodespace()
    }
  }
}
