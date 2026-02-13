import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { generateId } from "@/utils/id";
import type { RelationType, FriendSubtype } from "@/types/domain";

const PARTNER_SUBTYPES = ["married", "divorced", "partner"] as const;
const PARENT_CHILD_SUBTYPES = ["biological", "adopted", "foster", "step"] as const;
const FRIEND_SUBTYPES_LIST: FriendSubtype[] = [
  "university", "highSchool", "middleSchool", "elementary",
  "summerCityFriend", "sport", "romantic", "flirt",
  "workColleague", "neighbor", "acquaintance",
];

export function LinkPersonDialog() {
  const { t } = useTranslation();
  const linkMode = useUiStore((s) => s.linkMode);
  const setLinkMode = useUiStore((s) => s.setLinkMode);
  const persons = useTreeStore((s) => s.persons);
  const relationships = useTreeStore((s) => s.relationships);
  const addRelationship = useTreeStore((s) => s.addRelationship);
  const projectType = useTreeStore((s) => s.meta.projectType);

  const [targetId, setTargetId] = useState("");
  const [relType, setRelType] = useState<RelationType>(
    projectType === "friendCluster" ? "friend" : "partner"
  );
  const [subtype, setSubtype] = useState("");
  const [parentDirection, setParentDirection] = useState<"from" | "to">("from");
  const [location, setLocation] = useState("");

  const open = linkMode !== null;
  const fromPersonId = linkMode?.fromPersonId ?? "";

  const availableTargets = useMemo(() => {
    if (!fromPersonId) return [];
    const alreadyLinked = new Set<string>();
    for (const r of relationships) {
      if (r.from === fromPersonId) alreadyLinked.add(r.to);
      if (r.to === fromPersonId) alreadyLinked.add(r.from);
    }
    return persons
      .filter((p) => p.id !== fromPersonId && !alreadyLinked.has(p.id))
      .map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }));
  }, [persons, relationships, fromPersonId]);

  const handleClose = () => {
    setLinkMode(null);
    setTargetId("");
    setRelType(projectType === "friendCluster" ? "friend" : "partner");
    setSubtype("");
    setParentDirection("from");
    setLocation("");
  };

  const subtypeOptions = useMemo(() => {
    if (relType === "partner") {
      return PARTNER_SUBTYPES.map((s) => ({ value: s, label: t(`relationship.${s === "partner" ? "partnerType" : s}`) }));
    }
    if (relType === "parent-child") {
      return PARENT_CHILD_SUBTYPES.map((s) => ({ value: s, label: t(`relationship.${s}`) }));
    }
    return FRIEND_SUBTYPES_LIST.map((s) => ({ value: s, label: t(`friendRelationship.${s}`) }));
  }, [relType, t]);

  const relTypeOptions: { value: string; label: string }[] = useMemo(() => {
    if (projectType === "friendCluster") {
      return [{ value: "friend", label: t("relationship.friendOf") }];
    }
    return [
      { value: "partner", label: t("relationship.partner") },
      { value: "parent-child", label: t("relationship.parentChild") },
      { value: "friend", label: t("relationship.friendOf") },
    ];
  }, [projectType, t]);

  const fromPerson = persons.find((p) => p.id === fromPersonId);
  const targetPerson = persons.find((p) => p.id === targetId);

  const directionOptions = useMemo(() => {
    if (!fromPerson || !targetPerson) return [];
    return [
      { value: "from", label: `${fromPerson.firstName} → ${t("relationship.parentOf")} → ${targetPerson.firstName}` },
      { value: "to", label: `${targetPerson.firstName} → ${t("relationship.parentOf")} → ${fromPerson.firstName}` },
    ];
  }, [fromPerson, targetPerson, t]);

  const handleSave = () => {
    if (!targetId || !fromPersonId) return;

    const effectiveSubtype = subtype || (relType === "partner" ? "partner" : relType === "parent-child" ? "biological" : "university");

    let from = fromPersonId;
    let to = targetId;
    if (relType === "parent-child" && parentDirection === "to") {
      from = targetId;
      to = fromPersonId;
    }

    addRelationship({
      id: generateId("r"),
      type: relType,
      from,
      to,
      subtype: effectiveSubtype as any,
      startDate: null,
      endDate: null,
      location: relType === "friend" && effectiveSubtype === "summerCityFriend" && location ? location : null,
    });

    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={t("relationship.link")}>
      <div className="space-y-3">
        <Select
          label={t("relationship.selectTarget")}
          options={[{ value: "", label: "—" }, ...availableTargets]}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        />
        <Select
          label={t("relationship.selectType")}
          options={relTypeOptions}
          value={relType}
          onChange={(e) => {
            const v = e.target.value as RelationType;
            setRelType(v);
            setSubtype("");
          }}
        />
        <Select
          label={t("relationship.subtype")}
          options={subtypeOptions}
          value={subtype || subtypeOptions[0]?.value || ""}
          onChange={(e) => setSubtype(e.target.value)}
        />
        {relType === "parent-child" && targetId && (
          <Select
            label={t("relationship.selectDirection")}
            options={directionOptions}
            value={parentDirection}
            onChange={(e) => setParentDirection(e.target.value as "from" | "to")}
          />
        )}
        {relType === "friend" && (subtype === "summerCityFriend" || (!subtype && subtypeOptions[0]?.value === "summerCityFriend")) && (
          <Input
            label={t("relationship.location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("friendRelationship.location")}
          />
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={handleClose}>
          {t("dialog.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={!targetId}>
          {t("dialog.save")}
        </Button>
      </div>
    </Dialog>
  );
}
