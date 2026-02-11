import { useState, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTab || tabs[0]?.id || "");
  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeId === tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50 ${
              activeId === tab.id
                ? "border-b-2 border-salvia text-salvia"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4" role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}
