/**
 * What the dashboard shows before the index page has ever been visited.
 *
 * The subject hierarchy is stated on exactly one page of the site, so until it
 * has been read there is nothing to group — and saying so with a link there
 * beats an empty grid.
 */

import { BookOpen } from "lucide-react";
import { INDEX_PAGE_URL } from "../../../utils/url";
import { EMPTY_BODY, EMPTY_TITLE, INDEX_PAGE_LABEL } from "../constants";
import { Button, Card, Empty } from "../ui";

export function EmptyState() {
  return (
    <Card className="border-dashed">
      <Empty
        icon={<BookOpen />}
        title={EMPTY_TITLE}
        body={EMPTY_BODY}
        action={
          <Button asChild variant="solid" className="mt-2">
            <a href={INDEX_PAGE_URL} target="_blank" rel="noreferrer">
              {INDEX_PAGE_LABEL}
            </a>
          </Button>
        }
      />
    </Card>
  );
}
