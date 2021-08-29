import {on} from 'delegated-events'

// Checks if two urls start with the same "/owner/repo" prefix.
function isSameRepo(url1: string, url2: string): boolean {
  const path1 = url1.split('/', 3).join('/')
  const path2 = url2.split('/', 3).join('/')
  return path1 === path2
}

// Disable cross-repo PJAX navigation
on('pjax:click', '#js-repo-pjax-container a[href]', function (event) {
  const url = (event.currentTarget as HTMLAnchorElement).pathname

  if (!isSameRepo(url, location.pathname)) {
    event.preventDefault()
  }
})

// Disable document download PJAX from /:owner/:repo/files/:id/:name.
on('pjax:click', '.js-comment-body', function (event) {
  const link = event.target
  if (link instanceof HTMLAnchorElement && link.pathname.split('/')[3] === 'files') {
    event.preventDefault()
  }
})
