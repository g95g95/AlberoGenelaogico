import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/stores/uiStore";

export function ConfirmDialog() {
  const { t } = useTranslation();
  const { open, title, message, onConfirm } = useUiStore(
    (s) => s.confirmDialog
  );
  const hideConfirmDialog = useUiStore((s) => s.hideConfirmDialog);

  const handleConfirm = () => {
    onConfirm?.();
    hideConfirmDialog();
  };

  return (
    <Dialog open={open} onClose={hideConfirmDialog} title={title}>
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={hideConfirmDialog}>
          {t("dialog.cancel")}
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          {t("dialog.confirm")}
        </Button>
      </div>
    </Dialog>
  );
}
