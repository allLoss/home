export default function timezone(): string | void {
  if ('Intl' in window) {
    try {
      const format = new window.Intl.DateTimeFormat()
      return format.resolvedOptions().timeZone
    } catch {
      // ignore
    }
  }
}
