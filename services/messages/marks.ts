/** Reading what is known about the questions on a page. */

import { questionMarks } from "../../utils/db";
import type { MessageKind } from "../../utils/messaging";
import type { ResponseMap } from "../../types";

export async function getQuestionMarks(
  goIds: string[],
): Promise<ResponseMap[MessageKind.GetQuestionMarks]> {
  return Object.fromEntries(await questionMarks(goIds));
}
