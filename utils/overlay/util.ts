/** Shared helpers for the overlay components. */

/** Creates a detached element, since every component builds one the same way. */
export function el(
  doc: Document,
  tag: string,
  className?: string,
  text?: string,
): HTMLElement {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Puts `next` where the element with `id` currently is, or before `sibling` if
 * it is not on the page yet. Lets a component re-render by replacement rather
 * than by mutating what is already mounted.
 */
export function mountBefore(
  doc: Document,
  id: string,
  sibling: Element,
  next: HTMLElement,
): void {
  const existing = doc.getElementById(id);
  if (existing) existing.replaceWith(next);
  else sibling.insertAdjacentElement("beforebegin", next);
}
