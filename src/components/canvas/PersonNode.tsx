import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { Person, HandlePosition } from "@/types/domain";
import { getInitials, getAvatarColor } from "@/utils/avatar";
import { formatDateRange } from "@/utils/date";
import { useUiStore } from "@/stores/uiStore";
import { useTreeStore } from "@/stores/treeStore";

type PersonNodeData = {
  person: Person;
  handlePositions?: Record<string, HandlePosition>;
};

const genderBorderColors: Record<string, string> = {
  male: "border-l-male",
  female: "border-l-female",
  other: "border-l-other",
  unknown: "border-l-unknown",
};

const SIDE_TO_POSITION: Record<string, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

const DEFAULT_HANDLES: Record<string, HandlePosition> = {
  top: { side: "top", offset: 50 },
  bottom: { side: "bottom", offset: 50 },
  right: { side: "right", offset: 50 },
  left: { side: "left", offset: 50 },
};

function getHandleStyle(pos: HandlePosition): React.CSSProperties {
  const { side, offset } = pos;
  if (side === "top" || side === "bottom") {
    return { left: `${offset}%`, transform: "translateX(-50%)" };
  }
  return { top: `${offset}%`, transform: "translateY(-50%)" };
}

// Given mouse position relative to node, find closest point on border
function closestBorderPoint(
  mx: number,
  my: number,
  w: number,
  h: number
): HandlePosition {
  const candidates: { side: HandlePosition["side"]; offset: number; dist: number }[] = [
    { side: "top", offset: clamp((mx / w) * 100, 5, 95), dist: Math.abs(my) },
    { side: "bottom", offset: clamp((mx / w) * 100, 5, 95), dist: Math.abs(my - h) },
    { side: "left", offset: clamp((my / h) * 100, 5, 95), dist: Math.abs(mx) },
    { side: "right", offset: clamp((my / h) * 100, 5, 95), dist: Math.abs(mx - w) },
  ];
  candidates.sort((a, b) => a.dist - b.dist);
  return { side: candidates[0].side, offset: candidates[0].offset };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export const PersonNode = memo(function PersonNode({
  id,
  data,
  selected,
}: NodeProps & { data: PersonNodeData }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [movingHandle, setMovingHandle] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState<HandlePosition | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const setAddPersonMode = useUiStore((s) => s.setAddPersonMode);
  const setLayout = useTreeStore((s) => s.setLayout);
  const projectType = useTreeStore((s) => s.meta.projectType);
  const layoutRef = useRef(useTreeStore.getState().layout);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    return useTreeStore.subscribe((s) => { layoutRef.current = s.layout; });
  }, []);

  const { person, handlePositions } = data;
  const hp = handlePositions ?? {};

  const getPos = useCallback(
    (handleId: string): HandlePosition => {
      if (movingHandle === handleId && previewPos) return previewPos;
      return hp[handleId] ?? DEFAULT_HANDLES[handleId] ?? { side: "top", offset: 50 };
    },
    [hp, movingHandle, previewPos]
  );

  const initials = getInitials(person.firstName, person.lastName);
  const avatarColor = getAvatarColor(`${person.firstName} ${person.lastName}`);
  const dateRange = formatDateRange(person.birthDate, person.deathDate);

  const handleHandleClick = useCallback(
    (e: React.MouseEvent, handleId: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (movingHandle === handleId) return;
      setMovingHandle(handleId);
      setPreviewPos(hp[handleId] ?? DEFAULT_HANDLES[handleId]);
    },
    [movingHandle, hp]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!movingHandle || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setPreviewPos(closestBorderPoint(mx, my, rect.width, rect.height));
    },
    [movingHandle]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!movingHandle || !previewPos) return;
      e.stopPropagation();
      e.preventDefault();

      const layout = layoutRef.current;
      const existing = layout.handlePositions ?? {};
      const personHandles = { ...(existing[person.id] ?? {}), [movingHandle]: previewPos };
      setLayout({ handlePositions: { ...existing, [person.id]: personHandles } });

      setMovingHandle(null);
      setPreviewPos(null);
      setTimeout(() => updateNodeInternals(id), 0);
    },
    [movingHandle, previewPos, person.id, setLayout, updateNodeInternals, id]
  );

  const handleIds = ["top", "bottom", "right", "left"];
  const handleTypeMap: Record<string, "source" | "target"> = {
    top: "target",
    bottom: "source",
    right: "source",
    left: "target",
  };
  const handleColorMap: Record<string, string> = {
    top: "!bg-gray-400",
    bottom: "!bg-gray-400",
    right: "!bg-terracotta",
    left: "!bg-terracotta",
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      onMouseMove={handleMouseMove}
    >
      <div
        ref={cardRef}
        className={`rounded-2xl border-l-4 bg-white shadow-md transition-all cursor-pointer min-w-[200px] dark:bg-surface-dark dark:shadow-lg ${genderBorderColors[person.gender]} ${selected ? "ring-2 ring-salvia shadow-lg" : ""}`}
        onDoubleClick={(e) => {
          if (movingHandle) {
            handleDoubleClick(e);
          } else {
            openDetailPanel(person.id);
          }
        }}
      >
        {handleIds.map((hid) => {
          const pos = getPos(hid);
          const isMoving = movingHandle === hid;
          return (
            <Handle
              key={hid}
              type={handleTypeMap[hid]}
              position={SIDE_TO_POSITION[pos.side]}
              id={hid}
              className={`${handleColorMap[hid]} !border-0 ${isMoving ? "!w-3 !h-3 !bg-salvia ring-2 ring-salvia/40" : "!w-2 !h-2"}`}
              style={getHandleStyle(pos)}
              onClick={(e) => handleHandleClick(e, hid)}
            />
          );
        })}

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

      {movingHandle && (
        <div className="absolute -bottom-6 left-0 right-0 text-center">
          <span className="text-[10px] bg-salvia text-white px-2 py-0.5 rounded-full">
            Doppio click per confermare
          </span>
        </div>
      )}

      {hovered && !movingHandle && (
        <div className="flex justify-center gap-1 pt-1 pb-1">
          {projectType === "friendCluster" ? (
            <>
              <ActionButton
                tooltip={t("friendRelationship.addFriend")}
                onClick={(e) => {
                  e.stopPropagation();
                  setAddPersonMode({
                    personId: person.id,
                    type: "friend",
                    direction: "friend",
                  });
                }}
                label="A"
              />
              <ActionButton
                tooltip={t("panel.info")}
                onClick={(e) => {
                  e.stopPropagation();
                  openDetailPanel(person.id);
                }}
                label="i"
              />
            </>
          ) : (
            <>
              <ActionButton
                tooltip={t("person.addParent")}
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
                tooltip={t("person.addChild")}
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
                tooltip={t("person.addPartner")}
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
                tooltip={t("panel.info")}
                onClick={(e) => {
                  e.stopPropagation();
                  openDetailPanel(person.id);
                }}
                label="i"
              />
            </>
          )}
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
