import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { generateId } from "@/utils/id";
import type { Gender, FriendSubtype } from "@/types/domain";

const FRIEND_SUBTYPE_KEYS: FriendSubtype[] = [
  "university", "highSchool", "middleSchool", "elementary",
  "summerCityFriend", "sport", "romantic", "flirt",
  "workColleague", "neighbor", "acquaintance",
];

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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("unknown");
  const [friendSubtype, setFriendSubtype] = useState<FriendSubtype>("university");
  const [location, setLocation] = useState("");

  const isStandalone = standaloneAddPosition !== null;
  const open = addPersonMode !== null || isStandalone;
  const isFriend = addPersonMode?.direction === "friend";

  const handleClose = () => {
    setAddPersonMode(null);
    setStandaloneAddPosition(null);
    setFirstName("");
    setLastName("");
    setGender("unknown");
    setFriendSubtype("university");
    setLocation("");
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
