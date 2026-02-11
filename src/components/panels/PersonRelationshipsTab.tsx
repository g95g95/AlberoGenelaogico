import { useTranslation } from "react-i18next";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";

export function PersonRelationshipsTab({ personId }: { personId: string }) {
  const { t } = useTranslation();
  const relationships = useTreeStore((s) =>
    s.relationships.filter((r) => r.from === personId || r.to === personId)
  );
  const persons = useTreeStore((s) => s.persons);
  const deleteRelationship = useTreeStore((s) => s.deleteRelationship);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);

  const getPersonName = (id: string) => {
    const p = persons.find((p) => p.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "?";
  };

  const getSubtypeLabel = (subtype: string | null): string => {
    if (!subtype) return "";
    const labels: Record<string, string> = {
      married: t("relationship.married"),
      divorced: t("relationship.divorced"),
      partner: t("relationship.partnerType"),
      biological: t("relationship.biological"),
      adopted: t("relationship.adopted"),
      foster: t("relationship.foster"),
      step: t("relationship.step"),
    };
    return labels[subtype] ?? subtype;
  };

  const handleDelete = (relId: string) => {
    showConfirmDialog(t("relationship.delete"), "", () => {
      deleteRelationship(relId);
    });
  };

  if (relationships.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("relationship.title")}: 0
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {relationships.map((rel) => {
        const otherId = rel.from === personId ? rel.to : rel.from;
        const direction =
          rel.type === "parent-child"
            ? rel.from === personId
              ? "Parent of"
              : "Child of"
            : "Partner";

        return (
          <div
            key={rel.id}
            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
          >
            <div>
              <button
                onClick={() => openDetailPanel(otherId)}
                className="text-sm font-medium text-salvia hover:underline"
              >
                {getPersonName(otherId)}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {direction}
                {rel.subtype ? ` (${getSubtypeLabel(rel.subtype)})` : ""}
              </p>
            </div>
            <button
              onClick={() => handleDelete(rel.id)}
              aria-label={t("relationship.delete")}
              className="p-1 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
