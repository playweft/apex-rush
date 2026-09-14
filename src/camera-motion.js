// Camera roll is opposite the phone's calibrated screen-relative tilt.
// Positive camera roll rotates the rendered horizon clockwise on screen.
export function horizonRollTarget(tilt, neutral, enabled) {
  if (!enabled || !Number.isFinite(tilt) || !Number.isFinite(neutral)) return 0;
  const delta = tilt - neutral;
  const beyondDeadzone = Math.max(0, Math.abs(delta) - 2);
  const degrees = Math.min(12, beyondDeadzone * 0.5);
  return -Math.sign(delta) * degrees * Math.PI / 180;
}

export function smoothHorizonRoll(current, target, dt) {
  // Exponential smoothing has the same response at different frame rates.
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * 7));
}
