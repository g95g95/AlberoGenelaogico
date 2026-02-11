import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { Tabs } from "@/components/ui/Tabs";
import { PersonInfoTab } from "./PersonInfoTab";
import { PersonRelationshipsTab } from "./PersonRelationshipsTab";
import { PersonNotesTab } from "./PersonNotesTab";

export function DetailPanel() {
  const { t } = useTranslation();
  const detailPanelOpen = useUiStore((s) => s.detailPanelOpen);
  const selectedPersonId = useUiStore((s) => s.selectedPersonId);
  const closeDetailPanel = useUiStore((s) => s.closeDetailPanel);
  const persons = useTreeStore((s) => s.persons);
  const person = useMemo(
    () => persons.find((p) => p.id === selectedPersonId),
    [persons, selectedPersonId]
  );

  const prefersReducedMotion = useReducedMotion();

  if (!person) return null;

  const tabs = [
    {
      id: "info",
      label: t("panel.info"),
      content: <PersonInfoTab person={person} />,
    },
    {
      id: "relationships",
      label: t("panel.relationships"),
      content: <PersonRelationshipsTab personId={person.id} />,
    },
    {
      id: "notes",
      label: t("panel.notes"),
      content: <PersonNotesTab person={person} />,
    },
  ];

  return (
    <AnimatePresence>
      {detailPanelOpen && (
        <motion.div
          initial={prefersReducedMotion ? false : { x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { x: 400, opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.1 }}
          className="absolute top-0 right-0 h-full w-[400px] max-w-full bg-white dark:bg-bg-dark border-l border-gray-200 dark:border-gray-700 shadow-xl z-20 overflow-y-auto"
          role="complementary"
          aria-label={`${person.firstName} ${person.lastName}`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {person.firstName} {person.lastName}
              </h2>
              <button
                onClick={closeDetailPanel}
                aria-label={t("dialog.close")}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="5" x2="15" y2="15" />
                  <line x1="15" y1="5" x2="5" y2="15" />
                </svg>
              </button>
            </div>
            <Tabs tabs={tabs} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
