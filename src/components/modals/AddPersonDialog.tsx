import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { generateId } from "@/utils/id";
import type {
  Gender,
  FriendSubtype,
  ParentChildSubtype,
  SiblingSubtype,
} from "@/types/domain";

const FRIEND_SUBTYPE_KEYS: FriendSubtype[] = [
  "university", "highSchool", "middleSchool", "elementary",
  "summerCityFriend", "sport", "romantic", "flirt",
  "workColleague", "neighbor", "acquaintance",
];

const SIBLING_SUBTYPE_KEYS: SiblingSubtype[] = [
  "full", "half", "stepSibling", "adoptiveSibling",
];

// Which parent-child subtype fits the link created towards a shared parent
const SHARED_PARENT_SUBTYPE: Record<SiblingSubtype, ParentChildSubtype> = {
  full: "biological",
  half: "biological",
  stepSibling: "step",
  adoptiveSibling: "adopted",
};

export function AddPersonDialog() {
  const { t } = useTranslation();
  const addPersonMode = useUiStore((s) => s.addPersonMode);
  const setAddPersonMode = useUiStore((s) => s.setAddPersonMode);
  const standaloneAddPosition = useUiStore((s) => s.standaloneAddPosition);
  const setStandaloneAddPosition = useUiStore((s) => s.setStandaloneAddPosition);
  const addPerson = useTreeStore((s) => s.addPerson);
  const addRelationship = useTreeStore((s) => s.addRelationship);
  const setLayout = useTreeStore((s) => s.setLayout);
  const layout = useTreeStore((s) => s.layout);
  const persons = useTreeStore((s) => s.persons);
  const relationships = useTreeStore((s) => s.relationships);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("unknown");
  const [friendSubtype, setFriendSubtype] = useState<FriendSubtype>("university");
  const [siblingSubtype, setSiblingSubtype] = useState<SiblingSubtype>("full");
  const [sharedParentIds, setSharedParentIds] = useState<string[]>([]);
  const [location, setLocation] = useState("");

  const isStandalone = standaloneAddPosition !== null;
  const open = addPersonMode !== null || isStandalone;
  const isFriend = addPersonMode?.direction === "friend";
  const isSibling = addPersonMode?.direction === "sibling";
  const referenceId = addPersonMode?.personId ?? null;

  // Parents of the person the new sibling is attached to
  const referenceParents = useMemo(() => {
    if (!referenceId) return [];
    return relationships
      .filter((r) => r.type === "parent-child" && r.to === referenceId)
      .map((r) => persons.find((p) => p.id === r.from))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  }, [relationships, persons, referenceId]);

  // A full sibling shares every parent, a half sibling exactly one,
  // a step/adoptive sibling none by default. The user can still adjust.
  useEffect(() => {
    if (!isSibling) return;
    const parentIds = referenceParents.map((p) => p.id);
    if (siblingSubtype === "full") {
      setSharedParentIds(parentIds);
    } else if (siblingSubtype === "half") {
      setSharedParentIds(parentIds.slice(0, 1));
    } else {
      setSharedParentIds([]);
    }
    // referenceParents is derived from the store and stable enough here:
    // it only changes when the reference person or the tree changes.
  }, [isSibling, siblingSubtype, referenceParents]);

  const handleClose = () => {
    setAddPersonMode(null);
    setStandaloneAddPosition(null);
    setFirstName("");
    setLastName("");
    setGender("unknown");
    setFriendSubtype("university");
    setSiblingSubtype("full");
    setSharedParentIds([]);
    setLocation("");
  };

  const toggleSharedParent = (parentId: string) => {
    setSharedParentIds((ids) =>
      ids.includes(parentId)
        ? ids.filter((id) => id !== parentId)
        : [...ids, parentId]
    );
  };

  const handleAdd = () => {
    const newId = generateId("p");
    addPerson({
      id: newId,
      firstName: firstName || "Nuovo",
      lastName,
      gender,
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      photo: null,
      notes: "",
      customFields: {},
    });

    if (isStandalone) {
      setLayout({
        nodePositions: { ...layout.nodePositions, [newId]: standaloneAddPosition },
      });
      handleClose();
      return;
    }

    if (!addPersonMode) return;

    if (isFriend) {
      addRelationship({
        id: generateId("r"),
        type: "friend",
        from: addPersonMode.personId,
        to: newId,
        subtype: friendSubtype,
        startDate: null,
        endDate: null,
        location: friendSubtype === "summerCityFriend" && location ? location : null,
      });
    } else if (isSibling) {
      addRelationship({
        id: generateId("r"),
        type: "sibling",
        from: addPersonMode.personId,
        to: newId,
        subtype: siblingSubtype,
        startDate: null,
        endDate: null,
        location: null,
      });

      // Attach the new sibling to the parents they have in common, so the
      // tree stays genealogically consistent (a half sibling gets one, a
      // full sibling both).
      for (const parentId of sharedParentIds) {
        addRelationship({
          id: generateId("r"),
          type: "parent-child",
          from: parentId,
          to: newId,
          subtype: SHARED_PARENT_SUBTYPE[siblingSubtype],
          startDate: null,
          endDate: null,
          location: null,
        });
      }
    } else {
      const { type: relType, direction, personId } = addPersonMode;
      const subtype = relType === "partner" ? "partner" : "biological";
      const from = direction === "parent" ? newId : personId;
      const to = direction === "parent" ? personId : newId;

      addRelationship({
        id: generateId("r"),
        type: relType,
        from,
        to,
        subtype,
        startDate: null,
        endDate: null,
        location: null,
      });
    }

    handleClose();
  };

  const genderOptions = [
    { value: "unknown", label: t("person.unknown") },
    { value: "male", label: t("person.male") },
    { value: "female", label: t("person.female") },
    { value: "other", label: t("person.other") },
  ];

  const friendSubtypeOptions = FRIEND_SUBTYPE_KEYS.map((key) => ({
    value: key,
    label: t(`friendRelationship.${key}`),
  }));

  const siblingSubtypeOptions = SIBLING_SUBTYPE_KEYS.map((key) => ({
    value: key,
    label: t(`relationship.${key}`),
  }));

  return (
    <Dialog open={open} onClose={handleClose} title={isStandalone ? t("dialog.addStandalone") : t("dialog.add")}>
      <div className="space-y-3">
        <Input
          label={t("person.firstName")}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoFocus
        />
        <Input
          label={t("person.lastName")}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <Select
          label={t("person.gender")}
          options={genderOptions}
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender)}
        />
        {!isStandalone && isFriend && (
          <>
            <Select
              label={t("friendRelationship.selectSubtype")}
              options={friendSubtypeOptions}
              value={friendSubtype}
              onChange={(e) => setFriendSubtype(e.target.value as FriendSubtype)}
            />
            {friendSubtype === "summerCityFriend" && (
              <Input
                label={t("relationship.location")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("friendRelationship.location")}
              />
            )}
          </>
        )}
        {!isStandalone && isSibling && (
          <>
            <Select
              label={t("relationship.subtype")}
              options={siblingSubtypeOptions}
              value={siblingSubtype}
              onChange={(e) => setSiblingSubtype(e.target.value as SiblingSubtype)}
            />
            {referenceParents.length > 0 ? (
              <fieldset className="flex flex-col gap-1">
                <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("relationship.sharedParents")}
                </legend>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("relationship.sharedParentsHint")}
                </p>
                <div className="mt-1 space-y-1">
                  {referenceParents.map((parent) => (
                    <label
                      key={parent.id}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-salvia focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50 dark:border-gray-600"
                        checked={sharedParentIds.includes(parent.id)}
                        onChange={() => toggleSharedParent(parent.id)}
                      />
                      {parent.firstName} {parent.lastName}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("relationship.noParentsYet")}
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={handleClose}>
          {t("dialog.cancel")}
        </Button>
        <Button onClick={handleAdd}>{t("dialog.add")}</Button>
      </div>
    </Dialog>
  );
}
