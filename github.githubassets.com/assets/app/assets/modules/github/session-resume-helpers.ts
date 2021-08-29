// Gets the current page's id for persisting fields.
//
// The value can be overridden by providing a normalized value in a meta tag.
//
//   <meta name="session-resume-id" content="/github/github/issues/123">.
//
// Defaults to the current url path.
export function getPageID(url?: URL): string {
  const location = url || window.location

  const metaTag = document.head && document.head.querySelector('meta[name=session-resume-id]')
  const id = metaTag instanceof HTMLMetaElement && metaTag.content

  return id || location.pathname
}
