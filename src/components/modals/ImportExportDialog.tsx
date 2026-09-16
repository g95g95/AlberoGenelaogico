import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Tabs } from "@/components/ui/Tabs";
import { useTreeStore } from "@/stores/treeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { exportProject, downloadJson, readJsonFile } from "@/lib/jsonExport";
import { readGedcomFile, downloadGedcom } from "@/lib/gedcom";
import type { GedcomImportResult } from "@/lib/gedcom";
import { exportToPdf } from "@/lib/exportPdf";
import type { PdfLayoutMode, PdfOrientation, PdfPageFormat } from "@/lib/exportPdf";
import { exportToPng, exportToSvg } from "@/lib/exportImage";
import { buildTreeScene } from "@/lib/treeScene";
import { computeLayout } from "@/lib/layoutEngine";
import { Select } from "@/components/ui/Select";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportExportDialog({ open, onClose }: Props) {
  const { t } = useTranslation();

  const tabs = [
    {
      id: "import",
      label: t("import.title"),
      content: <ImportTab onClose={onClose} />,
    },
    {
      id: "export",
      label: t("export.title"),
      content: <ExportTab />,
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} title={`${t("import.title")} / ${t("export.title")}`}>
      <Tabs tabs={tabs} />
    </Dialog>
  );
}

interface ImportSummary {
  persons: number;
  families: number;
  source: string | null;
  warnings: string[];
}

function ImportTab({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const loadProject = useTreeStore((s) => s.loadProject);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGedcom = useCallback(
    (file: File, result: GedcomImportResult) => {
      const { persons, relationships, source } = result;
      const computed = computeLayout(persons, relationships, "vertical");
      loadProject({
        persons,
        relationships,
        meta: {
          name:
            source.treeName?.replace(/\.ged(com)?$/i, "") ||
            file.name.replace(/\.ged(com)?$/i, ""),
          description: source.generator ? `Importato da ${source.generator}` : "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: source.submitter ?? "",
          projectType: "familyTree",
        },
        layout: {
          orientation: "vertical",
          rootPersonId: persons[0]?.id ?? null,
          nodePositions: computed.nodePositions,
        },
      });
      setSummary({
        persons: result.stats.individuals,
        families: result.stats.families,
        source: source.generator,
        warnings: result.warnings,
      });
    },
    [loadProject]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        if (/\.ged(com)?$/i.test(file.name)) {
          handleGedcom(file, await readGedcomFile(file));
        } else {
          const project = await readJsonFile(file);
          loadProject({
            persons: project.persons,
            relationships: project.relationships,
            meta: project.meta,
            layout: project.layout,
          });
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("import.error"));
      }
    },
    [handleGedcom, loadProject, onClose, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (summary) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-salvia/10 p-4">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {t("import.success")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {t("import.summary", {
              persons: summary.persons,
              families: summary.families,
            })}
          </p>
          {summary.source && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("import.fromSource", { source: summary.source })}
            </p>
          )}
        </div>

        {summary.warnings.length > 0 && (
          <details className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
            <summary className="text-xs font-medium text-gray-600 cursor-pointer dark:text-gray-300">
              {t("import.warnings", { count: summary.warnings.length })}
            </summary>
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {summary.warnings.slice(0, 50).map((warning, index) => (
                <li key={index} className="text-[11px] text-gray-500 dark:text-gray-400">
                  {warning}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-salvia text-white hover:bg-salvia-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
          >
            {t("import.close")}
          </button>
          <button
            onClick={() => setSummary(null)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
          >
            {t("import.importAnother")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-salvia bg-salvia/5"
            : "border-gray-300 hover:border-gray-400 dark:border-gray-600"
        }`}
      >
        <svg
          className="mx-auto mb-3 text-gray-400"
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M16 20V8M16 8l-4 4M16 8l4 4" />
          <path d="M6 24h20" />
        </svg>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("import.dropzone")}
        </p>
        <p className="text-xs text-gray-400 mt-1">{t("import.formats")}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.ged,.gedcom"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        {t("import.engines")}
      </p>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

function ExportTab() {
  const { t } = useTranslation();
  const persons = useTreeStore((s) => s.persons);
  const relationships = useTreeStore((s) => s.relationships);
  const meta = useTreeStore((s) => s.meta);
  const layout = useTreeStore((s) => s.layout);
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const settings = { theme, locale };

  const [pageFormat, setPageFormat] = useState<PdfPageFormat>("a4");
  const [orientation, setOrientation] = useState<PdfOrientation>("auto");
  const [layoutMode, setLayoutMode] = useState<PdfLayoutMode>("auto");

  // Legend entries read better without the parenthetical explanations the
  // dropdowns need.
  const legendLabel = useCallback(
    (type: string, subtype: string | null) => {
      const key = subtype ? `relationship.${subtype}` : null;
      const raw = key && t(key) !== key ? t(key) : t(`relationship.${type === "parent-child" ? "parentChild" : type}`);
      return raw.replace(/\s*\([^)]*\)/g, "").trim();
    },
    [t]
  );

  const buildScene = useCallback(
    () => buildTreeScene(persons, relationships, layout, { subtypeLabel: legendLabel }),
    [persons, relationships, layout, legendLabel]
  );

  const handleJsonExport = () => {
    const project = exportProject({ persons, relationships, meta, layout, settings });
    downloadJson(project);
  };

  const handleGedcomExport = () => {
    downloadGedcom(persons, relationships, meta.name.replace(/\s+/g, "_"));
  };

  const handlePdfExport = () => {
    exportToPdf(buildScene(), {
      filename: meta.name,
      format: pageFormat,
      orientation,
      mode: layoutMode,
      title: meta.name,
      subtitle: meta.description,
      author: meta.author,
      locale,
      texts: {
        generatedOn: t("export.generatedOn"),
        sheet: t("export.sheet"),
        of: t("export.of"),
        row: t("export.row"),
        column: t("export.column"),
      },
    });
  };

  const handlePngExport = async () => {
    await exportToPng(buildScene(), { filename: meta.name });
  };

  const handleSvgExport = () => {
    exportToSvg(buildScene(), { filename: meta.name });
  };

  const formatOptions = [
    { value: "a4", label: "A4" },
    { value: "a3", label: "A3" },
    { value: "letter", label: "Letter" },
  ];

  const orientationOptions = [
    { value: "auto", label: t("export.orientationAuto") },
    { value: "portrait", label: t("export.orientationPortrait") },
    { value: "landscape", label: t("export.orientationLandscape") },
  ];

  const modeOptions = [
    { value: "auto", label: t("export.modeAuto") },
    { value: "single", label: t("export.modeSingle") },
    { value: "poster", label: t("export.modePoster") },
  ];

  return (
    <div className="space-y-2">
      <ExportButton label={t("export.json")} onClick={handleJsonExport} />
      <ExportButton label={t("export.gedcom")} onClick={handleGedcomExport} />
      <ExportButton label={t("export.pdf")} onClick={handlePdfExport} />
      <ExportButton label={t("export.png")} onClick={handlePngExport} />
      <ExportButton label={t("export.svg")} onClick={handleSvgExport} />

      <div className="pt-3 mt-1 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t("export.pdfOptions")}
        </p>
        <Select
          label={t("export.pageFormat")}
          options={formatOptions}
          value={pageFormat}
          onChange={(e) => setPageFormat(e.target.value as PdfPageFormat)}
        />
        <Select
          label={t("export.pageOrientation")}
          options={orientationOptions}
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as PdfOrientation)}
        />
        <Select
          label={t("export.layoutMode")}
          options={modeOptions}
          value={layoutMode}
          onChange={(e) => setLayoutMode(e.target.value as PdfLayoutMode)}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">{t("export.hint")}</p>
      </div>
    </div>
  );
}

function ExportButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:text-gray-300 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
    >
      {label}
    </button>
  );
}
