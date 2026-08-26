import { toPng } from "html-to-image";

/**
 * Renders the card node to a high-res PNG (3x ≈ 1080×1920 story size)
 * and downloads it.
 */
export async function exportCardImage(
  node: HTMLElement,
  filename: string,
  _caption: string,
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
    
    // Download only
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