// Frostline — keyboard and mouse input, with edge detection for action keys.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since last poll (edge-triggered)
    this.mouseX = 0;
    this.mouseY = 0;
    this.mousePressed = false;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    window.addEventListener('mousedown', () => { this.mousePressed = true; });
    window.addEventListener('mouseup', () => { this.mousePressed = false; });
    window.addEventListener('blur', () => { this.keys.clear(); this.pressed.clear(); });
  }
  down(...names) { return names.some((n) => this.keys.has(n)); }
  hit(...names) { return names.some((n) => this.pressed.has(n)); }
  endFrame() { this.pressed.clear(); }
}
