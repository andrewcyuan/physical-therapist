let tempCanvas: HTMLCanvasElement | null = null;

export async function captureCanvasFrame(
  canvas: HTMLCanvasElement | null,
  targetSize: number = 512,
  quality: number = 0.7
): Promise<string | null> {
  if (!canvas) {
    console.warn("[CanvasCapture] Canvas is null, cannot capture frame");
    return null;
  }

  if (canvas.width === 0 || canvas.height === 0) {
    console.warn("[CanvasCapture] Canvas has no dimensions");
    return null;
  }

  try {
    if (!tempCanvas) {
      tempCanvas = document.createElement("canvas");
    }

    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;

    const ctx = tempCanvas.getContext("2d");
    if (!ctx) {
      console.error("[CanvasCapture] Failed to get 2D context");
      return null;
    }

    const sourceWidth = canvas.width;
    const sourceHeight = canvas.height;
    const sourceAspect = sourceWidth / sourceHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (sourceAspect > 1) {
      drawWidth = targetSize;
      drawHeight = targetSize / sourceAspect;
      offsetX = 0;
      offsetY = (targetSize - drawHeight) / 2;
    } else {
      drawWidth = targetSize * sourceAspect;
      drawHeight = targetSize;
      offsetX = (targetSize - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetSize, targetSize);

    ctx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);

    return tempCanvas.toDataURL("image/jpeg", quality);
  } catch (error) {
    console.error("[CanvasCapture] Error capturing frame:", error);
    return null;
  }
}

export function cleanupTempCanvas() {
  if (tempCanvas) {
    tempCanvas.width = 0;
    tempCanvas.height = 0;
    tempCanvas = null;
  }
}
