import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { FriendSubtype, Relationship } from "@/types/domain";

const PARTNER_SUBTYPE_OPTIONS = ["married", "divorced", "partner"] as const;
const PARENT_CHILD_SUBTYPE_OPTIONS = ["biological", "adopted", "foster", "step"] as const;
const FRIEND_SUBTYPE_OPTIONS: FriendSubtype[] = [
  "university", "highSchool", "middleSchool", "elementary",
  "summerCityFriend", "sport", "romantic", "flirt",
  "workColleague", "neighbor", "acquaintance",
];

export function PersonRelationshipsTab({ personId }: { personId: string }) {
  const { t } = useTranslation();
  const allRelationships = useTreeStore((s) => s.relationships);
  const relationships = useMemo(
    () => allRelationships.filter((r) => r.from === personId || r.to === personId),
    [allRelationships, personId]
  );
  const persons = useTreeStore((s) => s.persons);
  const deleteRelationship = useTreeStore((s) => s.deleteRelationship);
  const updateRelationship = useTreeStore((s) => s.updateRelationship);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);

  const [editingRelId, setEditingRelId] = useState<string | null>(null);
  const [editSubtype, setEditSubtype] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editLocation, setEditLocation] = useState("");

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
      university: t("friendRelationship.university"),
      highSchool: t("friendRelationship.highSchool"),
      middleSchool: t("friendRelationship.middleSchool"),
      elementary: t("friendRelationship.elementary"),
      summerCityFriend: t("friendRelationship.summerCityFriend"),
      sport: t("friendRelationship.sport"),
      romantic: t("friendRelationship.romantic"),
      flirt: t("friendRelationship.flirt"),
      workColleague: t("friendRelationship.workColleague"),
      neighbor: t("friendRelationship.neighbor"),
      acquaintance: t("friendRelationship.acquaintance"),
    };
    return labels[subtype] ?? subtype;
  };

  const getDirectionLabel = (rel: typeof relationships[0]) => {
    if (rel.type === "friend") return t("relationship.friendOf");
    if (rel.type === "parent-child") {
      return rel.from === personId ? t("relationship.parentOf") : t("relationship.childOf");
    }
    return t("relationship.partner");
  };

  const getSubtypeOptions = (relType: string) => {
    if (relType === "partner") {
      return PARTNER_SUBTYPE_OPTIONS.map((s) => ({ value: s, label: getSubtypeLabel(s) }));
    }
    if (relType === "parent-child") {
      return PARENT_CHILD_SUBTYPE_OPTIONS.map((s) => ({ value: s, label: getSubtypeLabel(s) }));
    }
    return FRIEND_SUBTYPE_OPTIONS.map((s) => ({ value: s, label: getSubtypeLabel(s) }));
  };

  const startEditing = (rel: typeof relationships[0]) => {
    setEditingRelId(rel.id);
    setEditSubtype(rel.subtype ?? "");
    setEditStartDate(rel.startDate ?? "");
    setEditEndDate(rel.endDate ?? "");
    setEditLocation(rel.location ?? "");
  };

  const handleSave = (relId: string, relType: string) => {
    updateRelationship(relId, {
      subtype: (editSubtype || null) as Relationship["subtype"],
      startDate: editStartDate || null,
      endDate: editEndDate || null,
      location: (relType === "friend" && editSubtype === "summerCityFriend" && editLocation) ? editLocation : null,
    });
    setEditingRelId(null);
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
        const isEditing = editingRelId === rel.id;

        return (
          <div
            key={rel.id}
            className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => openDetailPanel(otherId)}
                  className="text-sm font-medium text-salvia hover:underline"
                >
                  {getPersonName(otherId)}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getDirectionLabel(rel)}
                  {rel.subtype ? ` (${getSubtypeLabel(rel.subtype)})` : ""}
                </p>
                {!isEditing && (rel.startDate || rel.endDate) && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {rel.startDate ?? "?"} - {rel.endDate ?? "..."}
                  </p>
                )}
                {!isEditing && rel.location && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {rel.location}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={() => startEditing(rel)}
                    aria-label={t("relationship.edit")}
                    className="p-1 text-gray-400 hover:text-salvia hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 2l2 2-8 8H2v-2l8-8z" />
                    </svg>
                  </button>
                )}
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
            </div>

            {isEditing && (
              <div className="mt-2 space-y-2">
                <Select
                  label={t("relationship.subtype")}
                  options={getSubtypeOptions(rel.type)}
                  value={editSubtype}
                  onChange={(e) => setEditSubtype(e.target.value)}
                />
                <Input
                  label={t("relationship.startDate")}
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
                <Input
                  label={t("relationship.endDate")}
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
                {rel.type === "friend" && editSubtype === "summerCityFriend" && (
                  <Input
                    label={t("relationship.location")}
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder={t("friendRelationship.location")}
                  />
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => handleSave(rel.id, rel.type)}>
                    {t("dialog.save")}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingRelId(null)}>
                    {t("dialog.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
