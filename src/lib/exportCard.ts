import { toPng } from "html-to-image";

/**
 * Renders the card node to a high-res PNG (3x ≈ 1080×1920 story size),
 * copies to clipboard (if supported), then shares via native share sheet,
 * falling back to a plain download.
 */
export async function exportCardImage(
  node: HTMLElement,
  filename: string,
  caption: string,
  username?: string
): Promise<void> {
  // Temporarily add username to card if provided
  const usernameEl = node.querySelector(".card-username") as HTMLElement;
  const originalUsernameContent = usernameEl?.textContent;
  
  if (username && usernameEl) {
    usernameEl.textContent = `Drawn by @${username}`;
    usernameEl.style.display = "block";
  } else if (usernameEl) {
    usernameEl.style.display = "none";
  }

  try {
    const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: "image/png" });

    // 1. Copy to clipboard (modern browsers)
    if (navigator.clipboard?.write) {
      try {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
      } catch (e) {
        console.warn("Clipboard copy failed", e);
      }
    }

    // 2. Native share sheet (mobile)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "My Fate Draw card",
          text: caption,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        throw err;
      }
    }

    // 3. Fallback: download
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    // Restore original state
    if (usernameEl) {
      if (originalUsernameContent) {
        usernameEl.textContent = originalUsernameContent;
      } else {
        usernameEl.style.display = "none";
      }
    }
  }
}