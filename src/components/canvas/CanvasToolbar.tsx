import { useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { computeLayout } from "@/lib/layoutEngine";

export function CanvasToolbar() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const persons = useTreeStore((s) => s.persons);
  const relationships = useTreeStore((s) => s.relationships);
  const layout = useTreeStore((s) => s.layout);
  const setLayout = useTreeStore((s) => s.setLayout);
  const canUndo = useTreeStore((s) => s._pastStates.length > 0);
  const canRedo = useTreeStore((s) => s._futureStates.length > 0);
  const undo = useTreeStore((s) => s.undo);
  const redo = useTreeStore((s) => s.redo);
  const toggleMinimap = useUiStore((s) => s.toggleMinimap);
  const projectType = useTreeStore((s) => s.meta.projectType);

  const handleAutoLayout = () => {
    const result = computeLayout(persons, relationships, layout.orientation, projectType);
    setLayout({ nodePositions: result.nodePositions });
  };

  const toggleOrientation = () => {
    const newOrientation =
      layout.orientation === "vertical" ? "horizontal" : "vertical";
    setLayout({ orientation: newOrientation });
    const result = computeLayout(persons, relationships, newOrientation, projectType);
    setLayout({ nodePositions: result.nodePositions });
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg px-3 py-2 border border-gray-200 dark:bg-surface-dark/90 dark:border-gray-700">
      <ToolbarButton
        onClick={() => zoomIn()}
        title={t("canvas.zoomIn")}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="14" y2="14" />
            <line x1="5" y1="7" x2="9" y2="7" />
            <line x1="7" y1="5" x2="7" y2="9" />
          </svg>
        }
      />
      <ToolbarButton
        onClick={() => zoomOut()}
        title={t("canvas.zoomOut")}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="14" y2="14" />
            <line x1="5" y1="7" x2="9" y2="7" />
          </svg>
        }
      />
      <ToolbarButton
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
        title={t("canvas.fitView")}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <line x1="2" y1="8" x2="14" y2="8" />
            <line x1="8" y1="2" x2="8" y2="14" />
          </svg>
        }
      />
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
      <ToolbarButton
        onClick={undo}
        title={t("canvas.undo")}
        disabled={!canUndo}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6l-3 3 3 3" />
            <path d="M1 9h10a4 4 0 000-8H8" />
          </svg>
        }
      />
      <ToolbarButton
        onClick={redo}
        title={t("canvas.redo")}
        disabled={!canRedo}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 6l3 3-3 3" />
            <path d="M15 9H5a4 4 0 010-8h3" />
          </svg>
        }
      />
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
      <ToolbarButton
        onClick={handleAutoLayout}
        title={t("canvas.autoLayout")}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="1" width="6" height="4" rx="1" />
            <rect x="1" y="11" width="6" height="4" rx="1" />
            <rect x="9" y="11" width="6" height="4" rx="1" />
            <line x1="8" y1="5" x2="8" y2="8" />
            <line x1="4" y1="8" x2="12" y2="8" />
            <line x1="4" y1="8" x2="4" y2="11" />
            <line x1="12" y1="8" x2="12" y2="11" />
          </svg>
        }
      />
      <ToolbarButton
        onClick={toggleOrientation}
        title={`${t("canvas.orientation")}: ${layout.orientation === "vertical" ? t("canvas.vertical") : t("canvas.horizontal")}`}
        icon={
          layout.orientation === "vertical" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="2" x2="8" y2="14" />
              <line x1="5" y1="5" x2="8" y2="2" />
              <line x1="11" y1="5" x2="8" y2="2" />
              <line x1="5" y1="11" x2="8" y2="14" />
              <line x1="11" y1="11" x2="8" y2="14" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="5" y1="5" x2="2" y2="8" />
              <line x1="5" y1="11" x2="2" y2="8" />
              <line x1="11" y1="5" x2="14" y2="8" />
              <line x1="11" y1="11" x2="14" y2="8" />
            </svg>
          )
        }
      />
      <ToolbarButton
        onClick={toggleMinimap}
        title={t("canvas.minimap")}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="1" width="14" height="14" rx="2" />
            <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
          </svg>
        }
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  icon,
  disabled = false,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
    >
      {icon}
    </button>
  );
}
