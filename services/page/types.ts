/** Types shared by the content-script services. */

import type { QuestionDescriptor } from "../../utils/selectors";
import type { ResumeHashTarget } from "../../utils/url";

/** Everything a question page's services need, resolved once on load. */
export interface QuestionPageContext {
  doc: Document;
  href: string;
  topicSlug: string;
  pageNo: number;
  resume: ResumeHashTarget | null;
  questions: QuestionDescriptor[];
}
