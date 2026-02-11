import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Person } from "@/types/domain";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { getInitials, getAvatarColor } from "@/utils/avatar";

interface FormData {
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
}

export function PersonInfoTab({ person }: { person: Person }) {
  const { t } = useTranslation();
  const updatePerson = useTreeStore((s) => s.updatePerson);
  const deletePerson = useTreeStore((s) => s.deletePerson);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const closeDetailPanel = useUiStore((s) => s.closeDetailPanel);
  const selectPerson = useUiStore((s) => s.selectPerson);
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    person.customFields
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, watch, reset } = useForm<FormData>({
    defaultValues: {
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender,
      birthDate: person.birthDate ?? "",
      birthPlace: person.birthPlace ?? "",
      deathDate: person.deathDate ?? "",
      deathPlace: person.deathPlace ?? "",
    },
  });

  useEffect(() => {
    reset({
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender,
      birthDate: person.birthDate ?? "",
      birthPlace: person.birthPlace ?? "",
      deathDate: person.deathDate ?? "",
      deathPlace: person.deathPlace ?? "",
    });
    setCustomFields(person.customFields);
  }, [person.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const formValues = watch();

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updatePerson(person.id, {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        gender: formValues.gender as Person["gender"],
        birthDate: formValues.birthDate || null,
        birthPlace: formValues.birthPlace || null,
        deathDate: formValues.deathDate || null,
        deathPlace: formValues.deathPlace || null,
        customFields,
      });
    }, 300);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [formValues.firstName, formValues.lastName, formValues.gender, formValues.birthDate, formValues.birthPlace, formValues.deathDate, formValues.deathPlace, customFields]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext("2d")!;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
        updatePerson(person.id, { photo: canvas.toDataURL("image/jpeg", 0.8) });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = () => {
    showConfirmDialog(
      t("person.deletePerson"),
      `${person.firstName} ${person.lastName}`,
      () => {
        deletePerson(person.id);
        selectPerson(null);
        closeDetailPanel();
      }
    );
  };

  const addCustomField = () => {
    const key = `field_${Date.now()}`;
    setCustomFields((prev) => ({ ...prev, [key]: "" }));
  };

  const updateCustomField = (key: string, value: string) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  };

  const removeCustomField = (key: string) => {
    setCustomFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const initials = getInitials(person.firstName, person.lastName);
  const avatarColor = getAvatarColor(`${person.firstName} ${person.lastName}`);

  const genderOptions = [
    { value: "male", label: t("person.male") },
    { value: "female", label: t("person.female") },
    { value: "other", label: t("person.other") },
    { value: "unknown", label: t("person.unknown") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <label className="cursor-pointer relative group" aria-label={t("person.photo")}>
          {person.photo ? (
            <img
              src={person.photo}
              alt=""
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-semibold"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path d="M4 16v-2l8-8 2 2-8 8H4zM13.5 4.5l2 2 1-1-2-2-1 1z" />
            </svg>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </label>
      </div>

      <Input
        label={t("person.firstName")}
        {...register("firstName")}
      />
      <Input
        label={t("person.lastName")}
        {...register("lastName")}
      />
      <Select
        label={t("person.gender")}
        options={genderOptions}
        {...register("gender")}
      />
      <Input
        label={t("person.birthDate")}
        placeholder="YYYY, YYYY-MM, YYYY-MM-DD"
        {...register("birthDate")}
      />
      <Input
        label={t("person.birthPlace")}
        {...register("birthPlace")}
      />
      <Input
        label={t("person.deathDate")}
        placeholder="YYYY, YYYY-MM, YYYY-MM-DD"
        {...register("deathDate")}
      />
      <Input
        label={t("person.deathPlace")}
        {...register("deathPlace")}
      />

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("person.customFields")}
          </h3>
          <Button variant="ghost" size="sm" onClick={addCustomField}>
            {t("person.addField")}
          </Button>
        </div>
        {Object.entries(customFields).map(([key, value]) => (
          <div key={key} className="flex gap-2 mb-2">
            <Input
              className="flex-1"
              placeholder="Nome campo"
              value={key.startsWith("field_") ? "" : key}
              onChange={(e) => {
                const newKey = e.target.value;
                const next = { ...customFields };
                delete next[key];
                next[newKey] = value;
                setCustomFields(next);
              }}
            />
            <Input
              className="flex-1"
              placeholder="Valore"
              value={value}
              onChange={(e) => updateCustomField(key, e.target.value)}
            />
            <button
              onClick={() => removeCustomField(key)}
              aria-label={t("dialog.delete")}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <Button variant="danger" onClick={handleDelete} className="w-full">
          {t("person.deletePerson")}
        </Button>
      </div>
    </div>
  );
}
