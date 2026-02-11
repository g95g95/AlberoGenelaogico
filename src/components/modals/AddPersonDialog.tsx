import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { generateId } from "@/utils/id";
import type { Gender, PartnerSubtype, ParentChildSubtype } from "@/types/domain";

export function AddPersonDialog() {
  const { t } = useTranslation();
  const addPersonMode = useUiStore((s) => s.addPersonMode);
  const setAddPersonMode = useUiStore((s) => s.setAddPersonMode);
  const addPerson = useTreeStore((s) => s.addPerson);
  const addRelationship = useTreeStore((s) => s.addRelationship);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender>("unknown");

  const open = addPersonMode !== null;

  const handleClose = () => {
    setAddPersonMode(null);
    setFirstName("");
    setLastName("");
    setGender("unknown");
  };

  const handleAdd = () => {
    if (!addPersonMode) return;

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

    const { type: relType, direction, personId } = addPersonMode;
    let subtype: PartnerSubtype | ParentChildSubtype = null;
    if (relType === "partner") {
      subtype = "partner";
    } else {
      subtype = "biological";
    }

    // "parent" direction: new person is parent OF existing → from=new, to=existing
    // "child" direction: new person is child OF existing → from=existing, to=new
    // "partner": from=existing, to=new
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
    });

    handleClose();
  };

  const genderOptions = [
    { value: "unknown", label: t("person.unknown") },
    { value: "male", label: t("person.male") },
    { value: "female", label: t("person.female") },
    { value: "other", label: t("person.other") },
  ];

  return (
    <Dialog open={open} onClose={handleClose} title={t("dialog.add")}>
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
