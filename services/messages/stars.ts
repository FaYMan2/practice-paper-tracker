/** Flagging a question to come back to. */

import { db } from "../../utils/db";
import type { MessageKind } from "../../utils/messaging";
import type { QuestionRecord, ResponseMap } from "../../types";

/**
 * A question can be starred before it has ever been answered — that is most of
 * the point — so this seeds a record when none exists rather than dropping the
 * star on the floor.
 */
function seedStarred(goId: string, starred: boolean, now: number): QuestionRecord {
  const seeded: QuestionRecord = {
    goId,
    status: "unattempted",
    starred,
    type: "UNKNOWN",
    marks: 1,
    firstSeenAt: now,
    lastAttemptAt: null,
    attemptCount: 0,
    firstVerdict: null,
  };
  return seeded;
}

/**
 * Writes the one field on `questions` that is not derived from the attempt log.
 *
 * `rebuildQuestionProjections()` recomputes everything else from `attempts`; it
 * deliberately carries `starred` across untouched, because no amount of
 * replaying answers can tell you which questions a person meant to revisit.
 */
export async function setStar(
  goId: string,
  starred: boolean,
): Promise<ResponseMap[MessageKind.SetStar]> {
  const database = db();

  await database.transaction("rw", database.questions, async () => {
    const updated = await database.questions.update(goId, { starred });
    if (updated === 0) await database.questions.add(seedStarred(goId, starred, Date.now()));
  });

  const result: ResponseMap[MessageKind.SetStar] = { goId, starred };
  return result;
}
