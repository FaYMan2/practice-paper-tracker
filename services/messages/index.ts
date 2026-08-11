/**
 * Routes a message to the service that handles it.
 *
 * The background entrypoint only registers the listener; everything it can be
 * asked to do lives in a service beside this file.
 */

import { MessageKind } from "../../utils/messaging";
import type { Message } from "../../types";
import { recordAttempt } from "./attempts";
import { reportDiagnostic } from "./diagnostics";
import { rebuildAll } from "./maintenance";
import { getQuestionMarks } from "./marks";
import { observePage } from "./pages";
import { summariesFor } from "./summaries";

export * from "./constants";

export async function handleMessage(message: Message): Promise<unknown> {
  switch (message.kind) {
    case MessageKind.RecordAttempt:
      return await recordAttempt(message.attempt);

    case MessageKind.ObservePage:
      return await observePage(message.page);

    case MessageKind.GetSummaries:
      return await summariesFor(message.slugs);

    case MessageKind.GetQuestionMarks:
      return await getQuestionMarks(message.goIds);

    case MessageKind.ReportDiagnostic:
      return await reportDiagnostic(message.entry);

    case MessageKind.RebuildAll:
      return await rebuildAll();

    default: {
      const unreachable: never = message;
      throw new Error(`unknown message: ${JSON.stringify(unreachable)}`);
    }
  }
}
