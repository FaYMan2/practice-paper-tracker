/** Every subject, as cards. */

import type { TopicGroup } from "../../../utils/dashboard";
import { SubjectCard } from "../SubjectCard";

export interface SubjectGridProps {
  groups: TopicGroup[];
  onOpen: (key: string) => void;
}

export function SubjectGrid({ groups, onOpen }: SubjectGridProps) {
  return (
    <section className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
      {groups.map((group) => (
        <SubjectCard key={group.key} group={group} onOpen={onOpen} />
      ))}
    </section>
  );
}
