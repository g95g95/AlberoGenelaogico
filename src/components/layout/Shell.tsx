import { useState, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "./Header";
import { MobileListView } from "./MobileListView";
import { FamilyTreeCanvas } from "@/components/canvas/FamilyTreeCanvas";
import { DetailPanel } from "@/components/panels/DetailPanel";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { AddPersonDialog } from "@/components/modals/AddPersonDialog";
import { ImportExportDialog } from "@/components/modals/ImportExportDialog";
import { OnboardingDialog, useOnboarding } from "@/components/modals/OnboardingDialog";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function Shell() {
  const saveStatus = useAutoSave();
  useKeyboardShortcuts();

  const [importExportOpen, setImportExportOpen] = useState(false);
  const { showOnboarding, markDone } = useOnboarding();
  const [onboardingOpen, setOnboardingOpen] = useState(showOnboarding);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"tree" | "list">("tree");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
      <Header
        saveStatus={saveStatus}
        onImportExport={() => setImportExportOpen(true)}
      />
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowProvider>
          {isMobile && mobileView === "list" ? (
            <MobileListView onSwitchToTree={() => setMobileView("tree")} />
          ) : (
            <FamilyTreeCanvas />
          )}
          <DetailPanel />
        </ReactFlowProvider>

        {isMobile && mobileView === "tree" && (
          <button
            onClick={() => setMobileView("list")}
            aria-label="Lista"
            className="absolute bottom-20 right-4 z-10 px-4 py-2 rounded-xl bg-salvia text-white text-sm font-medium shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
          >
            Lista
          </button>
        )}
      </div>

      <ConfirmDialog />
      <AddPersonDialog />
      <ImportExportDialog
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
      />
      <OnboardingDialog
        open={onboardingOpen}
        onClose={() => {
          setOnboardingOpen(false);
          markDone();
        }}
      />
    </div>
  );
}
