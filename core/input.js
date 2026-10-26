const aliases = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', ' ': 'jump', e: 'interact', x: 'stun', z: 'stun', c: 'shove' };
export function createInput(active) {
  const held = new Set(), pressed = new Set(), pointers = new Map();
  const clear = () => { held.clear(); pressed.clear(); pointers.clear(); };
  window.addEventListener('keydown', e => {
    if (!active() || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) return;
    const action = aliases[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  });
  window.addEventListener('keyup', e => { const action = aliases[e.key.toLowerCase()]; if (action) held.delete(action); });
  window.addEventListener('blur', clear);
  for (const button of document.querySelectorAll('[data-control]')) {
    button.addEventListener('pointerdown', e => {
      if (!active()) return;
      e.preventDefault(); button.setPointerCapture(e.pointerId);
      const action = button.dataset.control;
      pointers.set(e.pointerId, action); held.add(action); pressed.add(action);
    });
    const release = e => {
      const action = pointers.get(e.pointerId); pointers.delete(e.pointerId);
      if (![...pointers.values()].includes(action)) held.delete(action);
    };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
  }
  return { down: action => held.has(action), tap: action => pressed.has(action), endFrame: () => pressed.clear(), clear };
}
