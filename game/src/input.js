// FROSTLINE — input: keyboard state plus menu clicks.
// WASD / arrows to move and drive, E to steal or enter a car, Space to punch,
// P or Esc to pause, M to mute, Enter to confirm on menus.

var Input = (function () {
  var keys = {};
  var pressed = {}; // edge-triggered: true only on the frame the key went down
  var mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  var canvas = null;

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyE: 'action', Space: 'punch',
    KeyP: 'pause', Escape: 'pause',
    Enter: 'confirm', KeyM: 'mute'
  };

  function attach(c) {
    canvas = c;
    window.addEventListener('keydown', function (e) {
      var name = KEYMAP[e.code];
      if (name) {
        if (!keys[name]) pressed[name] = true;
        keys[name] = true;
        if (name === 'punch' || name === 'up' || name === 'down' || name === 'left' || name === 'right') e.preventDefault();
      }
      AudioSys.resume();
    });
    window.addEventListener('keyup', function (e) {
      var name = KEYMAP[e.code];
      if (name) keys[name] = false;
    });
    window.addEventListener('blur', function () { keys = {}; });
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.clickX = e.clientX - r.left; mouse.clickY = e.clientY - r.top;
      mouse.clicked = true;
      AudioSys.resume();
    });
  }

  return {
    attach: attach,
    up: function () { return !!keys.up; },
    down: function () { return !!keys.down; },
    left: function () { return !!keys.left; },
    right: function () { return !!keys.right; },
    // Snapshot the held keys for this frame's simulation step.
    state: function () {
      return { up: !!keys.up, down: !!keys.down, left: !!keys.left, right: !!keys.right };
    },
    // True once, on the frame the key was pressed.
    wasPressed: function (name) { return !!pressed[name]; },
    endFrame: function () { pressed = {}; mouse.clicked = false; },
    mouse: mouse,
    // Hit-test a menu button; consumes the click.
    clickedIn: function (x, y, w, h) {
      if (!mouse.clicked) return false;
      return mouse.clickX >= x && mouse.clickX <= x + w && mouse.clickY >= y && mouse.clickY <= y + h;
    }
  };
})();
