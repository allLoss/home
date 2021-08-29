// Attempt to detect if GitHub is being proxied.
export default function detectProxySite(document: Document): boolean {
  const hostname = document.head?.querySelector<HTMLMetaElement>('meta[name="expected-hostname"]')?.content

  // ignore proxy detection if no meta tag is configured
  if (!hostname) {
    return false
  }

  // account for trailing . in hostname.
  const expected = hostname.replace(/\.$/, '').split('.').slice(-2).join('.')
  const actual = document.location.hostname.replace(/\.$/, '').split('.').slice(-2).join('.')

  return expected !== actual
}
