import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ONBOARDING_KEY = "familytree-onboarding-done";

export function useOnboarding() {
  const done = localStorage.getItem(ONBOARDING_KEY) === "true";
  const markDone = () => localStorage.setItem(ONBOARDING_KEY, "true");
  return { showOnboarding: !done, markDone };
}

export function OnboardingDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const { markDone } = useOnboarding();

  const steps = [
    { title: t("onboarding.welcome"), body: t("onboarding.step1") },
    { title: t("onboarding.welcome"), body: t("onboarding.step2") },
    { title: t("onboarding.welcome"), body: t("onboarding.step3") },
  ];

  const handleClose = () => {
    markDone();
    onClose();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const current = steps[step];

  return (
    <Dialog open={open} onClose={handleClose} title={current.title}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {current.body}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${i === step ? "bg-salvia" : "bg-gray-300 dark:bg-gray-600"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleClose}>
            {t("onboarding.skip")}
          </Button>
          <Button onClick={handleNext}>
            {step < steps.length - 1 ? t("onboarding.next") : t("onboarding.done")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
