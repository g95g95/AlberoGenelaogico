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
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`rounded-2xl border-l-4 bg-white shadow-md transition-all cursor-pointer min-w-[200px] dark:bg-surface-dark dark:shadow-lg ${genderBorderColors[person.gender]} ${selected ? "ring-2 ring-salvia shadow-lg" : ""}`}
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
      </div>

      {hovered && (
        <div className="flex justify-center gap-1 pt-1 pb-1">
          <ActionButton
            tooltip="Aggiungi Genitore"
            onClick={(e) => {
              e.stopPropagation();
              setAddPersonMode({
                personId: person.id,
                type: "parent-child",
                direction: "parent",
              });
            }}
            label="G"
          />
          <ActionButton
            tooltip="Aggiungi Figlio"
            onClick={(e) => {
              e.stopPropagation();
              setAddPersonMode({
                personId: person.id,
                type: "parent-child",
                direction: "child",
              });
            }}
            label="F"
          />
          <ActionButton
            tooltip="Aggiungi Partner"
            onClick={(e) => {
              e.stopPropagation();
              setAddPersonMode({
                personId: person.id,
                type: "partner",
                direction: "partner",
              });
            }}
            label="P"
          />
          <ActionButton
            tooltip="Dettagli"
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
  tooltip,
  onClick,
  label,
}: {
  tooltip: string;
  onClick: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <div className="relative group/action">
      <button
        aria-label={tooltip}
        onClick={onClick}
        className="w-7 h-7 rounded-full bg-salvia text-white text-xs font-bold flex items-center justify-center hover:bg-salvia-light shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
      >
        {label}
      </button>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover/action:opacity-100 shadow-lg">
        {tooltip}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </div>
  );
}
