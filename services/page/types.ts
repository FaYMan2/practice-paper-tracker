/** Types shared by the content-script services. */

import type { QuestionDescriptor } from "../../utils/selectors";
import type { QuestionClocks } from "../../utils/timing";
import type { ResumeHashTarget } from "../../utils/url";

/** Everything a question page's services need, resolved once on load. */
export interface QuestionPageContext {
  doc: Document;
  href: string;
  topicSlug: string;
  pageNo: number;
  resume: ResumeHashTarget | null;
  questions: QuestionDescriptor[];
  /**
   * The page's question clocks, created once here.
   *
   * On the context rather than owned by either user of it: the timers start
   * clocks and capture stops them, and two modules each holding their own
   * registry would mean a clock that never stops.
   */
  clocks: QuestionClocks;
}
