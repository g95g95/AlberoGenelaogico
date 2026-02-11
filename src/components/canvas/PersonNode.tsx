import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Person } from "@/types/domain";
import { getInitials, getAvatarColor } from "@/utils/avatar";
import { formatDateRange } from "@/utils/date";
import { useUiStore } from "@/stores/uiStore";

type PersonNodeData = {
  person: Person;
};

const genderBorderColors: Record<string, string> = {
  male: "border-l-male",
  female: "border-l-female",
  other: "border-l-other",
  unknown: "border-l-unknown",
};

export const PersonNode = memo(function PersonNode({
  data,
  selected,
}: NodeProps & { data: PersonNodeData }) {
  const [hovered, setHovered] = useState(false);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const setAddPersonMode = useUiStore((s) => s.setAddPersonMode);

  const { person } = data;
  const initials = getInitials(person.firstName, person.lastName);
  const avatarColor = getAvatarColor(
    `${person.firstName} ${person.lastName}`
  );
  const dateRange = formatDateRange(person.birthDate, person.deathDate);

  return (
    <div
      className={`relative rounded-2xl border-l-4 bg-white shadow-md transition-all cursor-pointer min-w-[200px] dark:bg-surface-dark dark:shadow-lg ${genderBorderColors[person.gender]} ${selected ? "ring-2 ring-salvia shadow-lg" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => openDetailPanel(person.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-3 p-3">
        {person.photo ? (
          <img
            src={person.photo}
            alt={`${person.firstName} ${person.lastName}`}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
            {person.firstName} {person.lastName}
          </p>
          {dateRange && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {dateRange}
            </p>
          )}
          {person.birthPlace && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {person.birthPlace}
            </p>
          )}
        </div>
      </div>

      {hovered && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          <ActionButton
            title="Genitore"
            onClick={(e) => {
              e.stopPropagation();
              setAddPersonMode({
                parentId: person.id,
                type: "parent-child",
              });
            }}
            label="G"
          />
          <ActionButton
            title="Figlio"
            onClick={(e) => {
              e.stopPropagation();
              setAddPersonMode({
                parentId: person.id,
                type: "parent-child",
              });
            }}
            label="F"
          />
          <ActionButton
            title="Partner"
            onClick={(e) => {
              e.stopPropagation();
              setAddPersonMode({ parentId: person.id, type: "partner" });
            }}
            label="P"
          />
          <ActionButton
            title="Info"
            onClick={(e) => {
              e.stopPropagation();
              openDetailPanel(person.id);
            }}
            label="i"
          />
        </div>
      )}
    </div>
  );
});

function ActionButton({
  title,
  onClick,
  label,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="w-6 h-6 rounded-full bg-salvia text-white text-xs font-bold flex items-center justify-center hover:bg-salvia-light shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
    >
      {label}
    </button>
  );
}
