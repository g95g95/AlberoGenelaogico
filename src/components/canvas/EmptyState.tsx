import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { demoProject } from "@/lib/demoData";
import { computeLayout } from "@/lib/layoutEngine";
import { generateId } from "@/utils/id";
import type { ProjectType } from "@/types/domain";

export function EmptyState() {
  const { t } = useTranslation();
  const loadProject = useTreeStore((s) => s.loadProject);
  const addPerson = useTreeStore((s) => s.addPerson);
  const updateMeta = useTreeStore((s) => s.updateMeta);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);

  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);

  const handleSelectType = (type: ProjectType) => {
    updateMeta({ projectType: type });
    setSelectedType(type);
  };

  const handleAddFirst = () => {
    const id = generateId("p");
    addPerson({
      id,
      firstName: "",
      lastName: "",
      gender: "unknown",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      photo: null,
      notes: "",
      customFields: {},
    });
    openDetailPanel(id);
  };

  const handleLoadDemo = () => {
    const result = computeLayout(
      demoProject.persons,
      demoProject.relationships,
      demoProject.layout.orientation
    );
    loadProject({
      ...demoProject,
      layout: { ...demoProject.layout, nodePositions: result.nodePositions },
    });
  };

  const handleLoadWindsor = async () => {
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}demo-windsor.json`);
      const data = await res.json();
      const result = computeLayout(
        data.persons,
        data.relationships,
        data.layout?.orientation ?? "vertical"
      );
      loadProject({
        persons: data.persons,
        relationships: data.relationships,
        meta: data.meta,
        layout: { ...(data.layout ?? { orientation: "vertical", rootPersonId: null, nodePositions: {} }), nodePositions: result.nodePositions },
      });
    } catch {
      // silently fail if file not available
    }
  };

  if (!selectedType) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {t("projectType.select")}
          </h2>
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => handleSelectType("familyTree")}
              className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-salvia hover:bg-salvia/5 transition-colors dark:border-gray-700 dark:hover:border-salvia"
            >
              <svg
                className="text-salvia opacity-70"
                width="64"
                height="64"
                viewBox="0 0 120 120"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="60" cy="25" r="12" />
                <circle cx="30" cy="70" r="10" />
                <circle cx="90" cy="70" r="10" />
                <circle cx="20" cy="105" r="8" />
                <circle cx="45" cy="105" r="8" />
                <circle cx="75" cy="105" r="8" />
                <circle cx="100" cy="105" r="8" />
                <line x1="60" y1="37" x2="30" y2="60" />
                <line x1="60" y1="37" x2="90" y2="60" />
                <line x1="30" y1="80" x2="20" y2="97" />
                <line x1="30" y1="80" x2="45" y2="97" />
                <line x1="90" y1="80" x2="75" y2="97" />
                <line x1="90" y1="80" x2="100" y2="97" />
              </svg>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t("projectType.familyTree")}
              </span>
            </button>
            <button
              onClick={() => handleSelectType("friendCluster")}
              className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-colors dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10"
            >
              <svg
                className="text-blue-500 opacity-70"
                width="64"
                height="64"
                viewBox="0 0 120 120"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="60" cy="30" r="12" />
                <circle cx="25" cy="75" r="12" />
                <circle cx="95" cy="75" r="12" />
                <line x1="52" y1="40" x2="33" y2="65" />
                <line x1="68" y1="40" x2="87" y2="65" />
                <line x1="37" y1="75" x2="83" y2="75" />
              </svg>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t("projectType.friendCluster")}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFriend = selectedType === "friendCluster";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-4">
        {isFriend ? (
          <svg
            className="mx-auto mb-6 text-blue-500 opacity-50"
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="60" cy="30" r="12" />
            <circle cx="25" cy="75" r="12" />
            <circle cx="95" cy="75" r="12" />
            <line x1="52" y1="40" x2="33" y2="65" />
            <line x1="68" y1="40" x2="87" y2="65" />
            <line x1="37" y1="75" x2="83" y2="75" />
          </svg>
        ) : (
          <svg
            className="mx-auto mb-6 text-salvia opacity-50"
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="60" cy="25" r="12" />
            <circle cx="30" cy="70" r="10" />
            <circle cx="90" cy="70" r="10" />
            <circle cx="20" cy="105" r="8" />
            <circle cx="45" cy="105" r="8" />
            <circle cx="75" cy="105" r="8" />
            <circle cx="100" cy="105" r="8" />
            <line x1="60" y1="37" x2="30" y2="60" />
            <line x1="60" y1="37" x2="90" y2="60" />
            <line x1="30" y1="80" x2="20" y2="97" />
            <line x1="30" y1="80" x2="45" y2="97" />
            <line x1="90" y1="80" x2="75" y2="97" />
            <line x1="90" y1="80" x2="100" y2="97" />
          </svg>
        )}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          {isFriend ? t("empty.titleFriend") : t("empty.title")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {isFriend ? t("empty.subtitleFriend") : t("empty.subtitle")}
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={handleAddFirst}>{t("empty.addFirst")}</Button>
          {!isFriend && (
            <>
              <Button variant="secondary" onClick={handleLoadDemo}>
                {t("empty.loadDemo")}
              </Button>
              <Button variant="secondary" onClick={handleLoadWindsor}>
                {t("empty.loadWindsor")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
