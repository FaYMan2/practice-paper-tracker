/**
 * The two ways back into a topic.
 *
 * Plain anchors rather than scripted buttons: the target is a real URL, so
 * middle-click and open-in-new-tab keep working without any code.
 */

import { navigationPlans } from "../../../utils/resume";
import type { ResumePlan } from "../../../utils/resume";
import type { TopicSummary } from "../../../types";
import { Button } from "../ui";
import { ACTION_LABEL, ACTION_TOOLTIP } from "./constants";

export * from "./constants";

export interface ResumeActionsProps {
  summary: TopicSummary;
}

export function ResumeActions({ summary }: ResumeActionsProps) {
  const plans: ResumePlan[] = navigationPlans(summary);
  if (plans.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {plans.map((plan) => (
        <Button
          key={plan.kind}
          asChild
          size="sm"
          variant={plan.kind === "last" ? "outline" : "solid"}
        >
          <a
            href={plan.href}
            target="_blank"
            rel="noreferrer"
            title={`${ACTION_TOOLTIP[plan.kind]} — page ${plan.pageNo}, question ${plan.ordinal}`}
            onClick={(event) => event.stopPropagation()}
          >
            {ACTION_LABEL[plan.kind]}
          </a>
        </Button>
      ))}
    </div>
  );
}
