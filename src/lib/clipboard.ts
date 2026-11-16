export async function copyElementText(element: HTMLElement): Promise<boolean> {
  const text = element.textContent
  if (!text) return false
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Clipboard permission denial may still allow a user-triggered selection copy.
    }
  }
  // Local phone previews use HTTP, where the async Clipboard API is unavailable.
  const selection = window.getSelection()
  if (!selection) return false
  const previousRanges = Array.from({ length: selection.rangeCount }, (_, index) =>
    selection.getRangeAt(index).cloneRange(),
  )
  const range = document.createRange()
  range.selectNodeContents(element)
  try {
    selection.removeAllRanges()
    selection.addRange(range)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    selection.removeAllRanges()
    previousRanges.forEach((previousRange) => selection.addRange(previousRange))
  }
}
