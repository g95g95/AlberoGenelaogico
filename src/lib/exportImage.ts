import { toPng, toSvg } from "html-to-image";

export async function exportToPng(
  element: HTMLElement,
  filename: string = "familytree"
) {
  const dataUrl = await toPng(element, {
    backgroundColor: "#FAFAF8",
    pixelRatio: 2,
  });
  downloadDataUrl(dataUrl, `${filename}.png`);
}

export async function exportToSvg(
  element: HTMLElement,
  filename: string = "familytree"
) {
  const dataUrl = await toSvg(element, {
    backgroundColor: "#FAFAF8",
  });
  downloadDataUrl(dataUrl, `${filename}.svg`);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
