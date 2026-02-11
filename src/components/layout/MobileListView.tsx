import { useTranslation } from "react-i18next";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { getInitials, getAvatarColor } from "@/utils/avatar";
import { formatDateRange } from "@/utils/date";

interface Props {
  onSwitchToTree: () => void;
}

export function MobileListView({ onSwitchToTree }: Props) {
  const { t } = useTranslation();
  const persons = useTreeStore((s) => s.persons);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {persons.length} {t("relationship.title").toLowerCase()}
        </span>
        <button
          onClick={onSwitchToTree}
          aria-label={t("mobile.treeView")}
          className="text-sm text-salvia font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50 rounded"
        >
          {t("mobile.treeView")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {persons.map((person) => {
          const initials = getInitials(person.firstName, person.lastName);
          const color = getAvatarColor(`${person.firstName} ${person.lastName}`);
          const dateRange = formatDateRange(person.birthDate, person.deathDate);

          return (
            <button
              key={person.id}
              onClick={() => openDetailPanel(person.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-left"
            >
              {person.photo ? (
                <img
                  src={person.photo}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {person.firstName} {person.lastName}
                </p>
                {dateRange && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dateRange}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
