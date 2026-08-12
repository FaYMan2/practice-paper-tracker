/**
 * What the dashboard shows before the index page has ever been visited.
 *
 * The subject hierarchy is stated on exactly one page of the site, so until it
 * has been read there is nothing to group — and saying so with a link there
 * beats an empty grid.
 */

import "./EmptyState.css";

import { INDEX_PAGE_URL } from "../../../utils/url";
import { EMPTY_BODY, EMPTY_TITLE, INDEX_PAGE_LABEL } from "../constants";

export function EmptyState() {
  return (
    <section className="empty">
      <h2 className="empty-title">{EMPTY_TITLE}</h2>
      <p className="empty-body">{EMPTY_BODY}</p>
      <a className="empty-link" href={INDEX_PAGE_URL} target="_blank" rel="noreferrer">
        {INDEX_PAGE_LABEL}
      </a>
    </section>
  );
}
