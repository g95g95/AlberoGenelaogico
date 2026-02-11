import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Person } from "@/types/domain";
import { useTreeStore } from "@/stores/treeStore";

export function PersonNotesTab({ person }: { person: Person }) {
  const { t } = useTranslation();
  const updatePerson = useTreeStore((s) => s.updatePerson);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = person.notes;
    }
  }, [person.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePerson(person.id, { notes: e.target.value });
    }, 300);
  };

  return (
    <div>
      <textarea
        ref={textareaRef}
        onChange={handleChange}
        defaultValue={person.notes}
        placeholder={t("person.notes")}
        aria-label={t("person.notes")}
        className="w-full min-h-[200px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-salvia focus:outline-none focus:ring-2 focus:ring-salvia/30 resize-y dark:border-gray-600 dark:bg-surface-dark dark:text-gray-100"
      />
    </div>
  );
}
