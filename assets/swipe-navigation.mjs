export function installSwipeNavigation({
  surface,
  getCurrentPage,
  navigate,
  getSelection = () => '',
  getViewportWidth = () => 1024,
}) {
  const pages = ['home', 'work', 'writing', 'picks'];
  let pointer = null;
  let blockedClickUntil = 0;
  let wheel = { lastAt: -Infinity, distance: 0, direction: 0, used: false };

  function step(direction) {
    const index = pages.indexOf(getCurrentPage());
    const next = pages[index + direction];
    if (index < 0 || !next) return false;
    navigate(next);
    return true;
  }

  surface.addEventListener('pointerdown', event => {
    if (!['touch', 'pen'].includes(event.pointerType)) return;
    if (!event.isPrimary || getSelection()) {
      pointer = null;
      return;
    }
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
    };
  }, { passive: true });

  surface.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - pointer.x);
    const dy = Math.abs(event.clientY - pointer.y);
    if (dy > 18 && dy > dx * 1.25) pointer = null;
  }, { passive: true });

  surface.addEventListener('pointercancel', () => { pointer = null; }, { passive: true });

  surface.addEventListener('pointerup', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const start = pointer;
    pointer = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const duration = event.timeStamp - start.time;
    if (getSelection() || duration < 0 || duration > 1200) return;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    // A horizontal swipe should not also activate the link or summary underneath.
    blockedClickUntil = event.timeStamp + 350;
    if (event.cancelable) event.preventDefault();
    step(dx < 0 ? 1 : -1);
  });

  surface.addEventListener('click', event => {
    if (!blockedClickUntil || event.detail === 0 || event.timeStamp > blockedClickUntil) return;
    blockedClickUntil = 0;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });

  surface.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || getSelection()) return;
    if (Math.abs(event.deltaX) < 2 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.35) return;
    const direction = Math.sign(event.deltaX);
    if (event.timeStamp - wheel.lastAt > 220) {
      wheel = { lastAt: event.timeStamp, distance: 0, direction, used: false };
    }
    wheel.lastAt = event.timeStamp;
    if (event.cancelable) event.preventDefault();
    if (wheel.used) return;
    if (direction !== wheel.direction) {
      wheel.distance = 0;
      wheel.direction = direction;
    }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? getViewportWidth() : 1;
    wheel.distance += event.deltaX * unit;
    if (Math.abs(wheel.distance) < 88) return;
    wheel.used = true;
    step(direction);
  }, { passive: false });
}
