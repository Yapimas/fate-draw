import { toPng } from "html-to-image";

/**
 * Renders the card node to a high-res PNG (3x ≈ 1080×1920 story size),
 * then shares it via the native share sheet when available,
 * falling back to a plain download everywhere else.
 */
export async function exportCardImage(
  node: HTMLElement,
  filename: string,
  caption: string
): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true });
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "My Fate Draw card",
        text: caption,
      });
      return;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // user closed share sheet
      throw err;
    }
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
