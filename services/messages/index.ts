/**
 * Routes a message to the service that handles it.
 *
 * The background entrypoint only registers the listener; everything it can be
 * asked to do lives in a service beside this file.
 */

import { MessageKind } from "../../utils/messaging";
import type { Message } from "../../types";
import { recordAttempt } from "./attempts";
import { exportBackup, importBackup } from "./backup";
import { reviewQueue } from "./review";
import { topicPages } from "./coverage";
import { topicDetail } from "./details";
import { reportDiagnostic } from "./diagnostics";
import { recordHierarchy } from "./hierarchy";
import { rebuildAll } from "./maintenance";
import { getQuestionMarks } from "./marks";
import { observePage } from "./pages";
import { setStar } from "./stars";
import { dashboardSummaries, summariesFor } from "./summaries";

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

    case MessageKind.GetDashboard:
      return await dashboardSummaries();

    case MessageKind.GetTopicPages:
      return await topicPages(message.slug);

    case MessageKind.SetStar:
      return await setStar(message.goId, message.starred);

    case MessageKind.GetTopicDetail:
      return await topicDetail(message.slug);

    case MessageKind.ReportHierarchy:
      return await recordHierarchy(message.entries);

    case MessageKind.ReportDiagnostic:
      return await reportDiagnostic(message.entry);

    case MessageKind.RebuildAll:
      return await rebuildAll();

    case MessageKind.GetReviewQueue:
      return await reviewQueue();

    case MessageKind.ExportBackup:
      return await exportBackup();

    case MessageKind.ImportBackup:
      return await importBackup(message.payload);

    default: {
      const unreachable: never = message;
      throw new Error(`unknown message: ${JSON.stringify(unreachable)}`);
    }
  }
}
