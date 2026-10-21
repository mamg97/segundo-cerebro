// Audit-only, data-free geometry contract for modal and fullscreen workspaces.
// Fullscreen is allowed solely for explicitly declared route/travel contexts.
// A fullscreen box must still fit the viewport; ordinary dialogs retain gutters.
export function assessAuditDialogGeometry(geometry) {
  if (!geometry) return { ok: true, codes: [] };
  const width = Number(geometry.width);
  const left = Number(geometry.left);
  const right = Number(geometry.right);
  const viewport = Number(geometry.viewportWidth);
  if (![width, left, right, viewport].every(Number.isFinite) || viewport <= 0 || width <= 0) {
    return { ok: false, codes: ["DIALOG_GEOMETRY_INVALID"] };
  }

  const fullscreen = geometry.intentionalFullscreen === true;
  // Allow <= 1 CSS px for subpixel rounding; no offscreen edges in either mode.
  const tooWide = width > (fullscreen ? viewport + 1 : viewport - 8);
  const leftOffscreen = left < -1;
  const rightOffscreen = right > viewport + 1;
  return {
    ok: !(tooWide || leftOffscreen || rightOffscreen),
    codes: [
      ...(tooWide ? ["DIALOG_BOX_TOO_WIDE"] : []),
      ...(leftOffscreen ? ["DIALOG_LEFT_OFFSCREEN"] : []),
      ...(rightOffscreen ? ["DIALOG_RIGHT_OFFSCREEN"] : [])
    ]
  };
}
