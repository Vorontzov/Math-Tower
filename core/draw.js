export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function text(ctx, value, x, y, color = '#d2dfdf', size = 13, align = 'left') {
  ctx.fillStyle = color; ctx.font = `${size}px ui-monospace, monospace`; ctx.textAlign = align; ctx.fillText(value, x, y); ctx.textAlign = 'left';
}
export function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
export function person(ctx, x, y, facing = 1, time = 0, invulnerable = false, airborne = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1);
  if (invulnerable) { ctx.strokeStyle = '#8de9d1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -23, 29, 0, Math.PI * 2); ctx.stroke(); }
  const stride = airborne ? 7 : Math.sin(time * 12) * 7;
  ctx.lineWidth = 6; ctx.strokeStyle = '#6c8ca2';
  ctx.beginPath(); ctx.moveTo(-3, -18); ctx.lineTo(-8 + stride, -2); ctx.moveTo(4, -18); ctx.lineTo(10 - stride, -2); ctx.stroke();
  rect(ctx, -10, -41, 20, 25, '#d4d0b7'); rect(ctx, -10, -39, 6, 24, '#8a9fa8');
  rect(ctx, -7, -56, 14, 15, '#d9ab89'); rect(ctx, -8, -58, 16, 6, '#344456');
  rect(ctx, 7, -36, 15, 7, '#d4d0b7'); rect(ctx, 19, -37, 8, 6, '#83dfc5');
  ctx.restore();
}
export function robot(ctx, x, y, accent, time) {
  ctx.save(); ctx.translate(x, y + Math.sin(time * 3) * 4);
  rect(ctx, -12, -32, 24, 21, '#97b7b7'); rect(ctx, -9, -28, 18, 8, '#182d39');
  rect(ctx, -6, -26, 4, 3, accent); rect(ctx, 3, -26, 4, 3, accent);
  rect(ctx, -4, -10, 8, 5, accent); ctx.restore();
}
