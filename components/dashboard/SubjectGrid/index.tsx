/** Every subject, as cards. */

import "./SubjectGrid.css";

import type { TopicGroup } from "../../../utils/dashboard";
import { SubjectCard } from "../SubjectCard";

export interface SubjectGridProps {
  groups: TopicGroup[];
  onOpen: (key: string) => void;
}

export function SubjectGrid({ groups, onOpen }: SubjectGridProps) {
  return (
    <section className="grid">
      {groups.map((group) => (
        <SubjectCard key={group.key} group={group} onOpen={onOpen} />
      ))}
    </section>
  );
}
