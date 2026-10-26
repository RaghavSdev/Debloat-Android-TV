(() => {
  const screen = document.getElementById('tvScreen');
  const dockRow = document.getElementById('dockRow');
  const appRow = document.getElementById('appRow');
  const tileStage = document.getElementById('tileStage');
  const movingGlass = document.getElementById('movingGlass');
  const focusedApp = document.getElementById('focusedApp');
  const demoNote = document.getElementById('demoNote');
  const launcherHome = document.getElementById('launcherHome');
  const launcherSettings = document.getElementById('launcherSettings');
  const tvSettings = document.getElementById('tvSettings');
  const inputMenu = document.getElementById('inputMenu');
  const networkMenu = document.getElementById('networkMenu');
  const libraryMenu = document.getElementById('libraryMenu');
  const wallpaperHint = document.getElementById('wallpaperHint');
  const screenToast = document.getElementById('screenToast');
  const topActions = Array.from(document.querySelectorAll('[data-top]'));
  const inputOptions = Array.from(inputMenu.querySelectorAll('[data-input]'));
  const settingRows = Array.from(document.querySelectorAll('[data-setting-row]'));
  const demo = document.querySelector('.demo-layout');

  const apps = [
    { name: 'Netflix', dock: true, bg: '#f8f8f9', glow: 'rgba(229,9,20,.55)', mark: '<span class="app-mark mark-netflix">NETFLIX</span>' },
    { name: 'Prime Video', dock: true, bg: '#087fdb', glow: 'rgba(0,137,230,.48)', mark: '<span class="app-mark mark-prime">prime video</span>' },
    { name: 'YouTube', dock: true, bg: '#f4f4f4', glow: 'rgba(245,0,0,.42)', mark: '<span class="app-mark mark-youtube"><i class="play-triangle">▶</i>YouTube</span>' },
    { name: 'JioHotstar', dock: true, bg: 'linear-gradient(135deg,#06b8ff,#7035f4 52%,#fa007f)', glow: 'rgba(149,42,255,.56)', mark: '<span class="app-mark mark-hotstar"><i class="hotstar-star">✦</i>JioHotstar</span>' },
    { name: 'aha', dock: false, bg: '#ff681c', glow: 'rgba(255,104,28,.42)', mark: '<span class="app-mark mark-aha">aha</span>' },
    { name: 'Sony LIV', dock: false, bg: 'linear-gradient(135deg,#10111b,#27213a)', glow: 'rgba(105,71,199,.42)', mark: '<span class="app-mark mark-sonyliv">SONY<br>LIV</span>' },
    { name: 'Sun NXT', dock: false, bg: 'linear-gradient(135deg,#eb1c4b,#b50c46)', glow: 'rgba(240,30,75,.42)', mark: '<span class="app-mark mark-sunnxt">SUN<br>NXT</span>' },
    { name: 'ZEE5', dock: false, bg: 'linear-gradient(135deg,#05070d,#242536)', glow: 'rgba(119,108,186,.34)', mark: '<span class="app-mark mark-zee">Z5</span>' }
  ];

  let tileIndex = 0;
  let topIndex = -1;
  let focusArea = 'tile';
  let panel = '';
  let activeInput = 0;
  let settingsIndex = 0;
  let toastTimer = 0;
  let hintTimer = 0;
  let demoActive = false;

  function makeTile(app, index) {
    const tile = document.createElement('div');
    tile.className = 'demo-tile ' + (app.dock ? 'dock-tile' : 'grid-tile');
    tile.dataset.appIndex = String(index);
    tile.dataset.glow = app.glow;
    tile.style.setProperty('--tile-bg', app.bg);
    tile.style.setProperty('--tile-glow', app.glow);
    tile.setAttribute('role', 'img');
    tile.setAttribute('aria-label', app.name + ' tile');
    tile.innerHTML = app.mark;
    (app.dock ? dockRow : appRow).appendChild(tile);
  }
  apps.forEach(makeTile);

  function currentTile() {
    return document.querySelector('[data-app-index="' + tileIndex + '"]');
  }

  function moveGlassTo(tile) {
    if (!tile || !tileStage.contains(tile)) {
      movingGlass.classList.remove('visible');
      return;
    }
    const stageBox = tileStage.getBoundingClientRect();
    const tileBox = tile.getBoundingClientRect();
    const x = tileBox.left - stageBox.left;
    const y = tileBox.top - stageBox.top;
    movingGlass.style.width = tileBox.width + 'px';
    movingGlass.style.height = tileBox.height + 'px';
    movingGlass.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    movingGlass.style.setProperty('--tile-glow', tile.dataset.glow);
    movingGlass.classList.add('visible');
    screen.style.setProperty('--active-glow', tile.dataset.glow);
  }

  function setTileFocus(index) {
    tileIndex = Math.max(0, Math.min(apps.length - 1, index));
    focusArea = 'tile';
    topIndex = -1;
    topActions.forEach(button => button.classList.remove('is-nav-focus'));
    document.querySelectorAll('.demo-tile').forEach(tile => tile.classList.toggle('is-focused', Number(tile.dataset.appIndex) === tileIndex));
    focusedApp.textContent = apps[tileIndex].name;
    moveGlassTo(currentTile());
  }

  function nearestTopAction(fromTile) {
    const tile = document.querySelector('[data-app-index="' + fromTile + '"]');
    if (!tile) return 0;
    const targetX = tile.getBoundingClientRect().left + tile.getBoundingClientRect().width / 2;
    let nearest = 0;
    let distance = Infinity;
    topActions.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      const dx = Math.abs(rect.left + rect.width / 2 - targetX);
      if (dx < distance) { distance = dx; nearest = index; }
    });
    return nearest;
  }

  function setTopFocus(index) {
    focusArea = 'top';
    topIndex = Math.max(0, Math.min(topActions.length - 1, index));
    document.querySelectorAll('.demo-tile').forEach(tile => tile.classList.remove('is-focused'));
    movingGlass.classList.remove('visible');
    topActions.forEach((button, i) => button.classList.toggle('is-nav-focus', i === topIndex));
  }

  function toast(message) {
    screenToast.textContent = message;
    screenToast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => screenToast.classList.remove('visible'), 1900);
  }

  function hideMenus() {
    [inputMenu, networkMenu, libraryMenu].forEach(menu => menu.classList.add('is-hidden'));
  }

  function closePanel() {
    if (!panel) return;
    panel = '';
    launcherSettings.classList.add('is-hidden');
    tvSettings.classList.add('is-hidden');
    launcherHome.classList.remove('is-hidden');
    hideMenus();
    setTileFocus(tileIndex);
  }

  function openPanel(which) {
    hideMenus();
    panel = which;
    launcherHome.classList.add('is-hidden');
    if (which === 'launcher') {
      launcherSettings.classList.remove('is-hidden');
      tvSettings.classList.add('is-hidden');
      settingsIndex = 0;
      settingRows.forEach((row, i) => row.classList.toggle('selected', i === settingsIndex));
      document.getElementById('settingsScroll').scrollTop = 0;
    } else {
      launcherSettings.classList.add('is-hidden');
      tvSettings.classList.remove('is-hidden');
    }
  }

  function showInputMenu() {
    hideMenus();
    inputMenu.classList.remove('is-hidden');
    activeInput = 0;
    inputOptions.forEach((option, i) => option.classList.toggle('menu-active', i === activeInput));
  }

  function doTopAction(action) {
    if (action === 'inputs') { showInputMenu(); return; }
    if (action === 'network') { hideMenus(); networkMenu.classList.remove('is-hidden'); return; }
    if (action === 'library') { hideMenus(); libraryMenu.classList.remove('is-hidden'); return; }
    if (action === 'settings') { openPanel('launcher'); return; }
  }

  function toggleWallpaper() {
    if (panel) closePanel();
    hideMenus();
    screen.classList.toggle('wallpaper-only');
    const isOnly = screen.classList.contains('wallpaper-only');
    wallpaperHint.classList.toggle('is-hidden', !isOnly);
    demoNote.textContent = isOnly ? '' : 'Hover or use the D-pad to explore';
    clearTimeout(hintTimer);
    if (isOnly) hintTimer = setTimeout(() => wallpaperHint.classList.add('is-hidden'), 2200);
    else setTileFocus(tileIndex);
  }

  function chooseInput(option) {
    activeInput = inputOptions.indexOf(option);
    inputMenu.classList.add('is-hidden');
    toast(option.dataset.input + ' selected · demo only');
    setTopFocus(0);
  }

  function moveMenu(delta) {
    if (inputMenu && !inputMenu.classList.contains('is-hidden')) {
      activeInput = Math.max(0, Math.min(inputOptions.length - 1, activeInput + delta));
      inputOptions.forEach((option, i) => option.classList.toggle('menu-active', i === activeInput));
      inputOptions[activeInput].scrollIntoView({ block: 'nearest' });
      return true;
    }
    return false;
  }

  function changeSettingFocus(delta) {
    settingsIndex = Math.max(0, Math.min(settingRows.length - 1, settingsIndex + delta));
    settingRows.forEach((row, i) => row.classList.toggle('selected', i === settingsIndex));
    settingRows[settingsIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function performKey(key) {
    demoActive = true;
    if (key === 'back') {
      if (panel) closePanel();
      else if (![inputMenu, networkMenu, libraryMenu].every(menu => menu.classList.contains('is-hidden'))) hideMenus();
      else { screen.classList.remove('wallpaper-only'); wallpaperHint.classList.add('is-hidden'); }
      return;
    }
    if (key === 'home') {
      if (panel) closePanel();
      hideMenus();
      screen.classList.remove('wallpaper-only');
      wallpaperHint.classList.add('is-hidden');
      setTileFocus(0);
      return;
    }
    if (key === 'red') { toggleWallpaper(); return; }
    if (key === 'blue') { hideMenus(); openPanel('tv'); return; }
    if (key === 'menu') { hideMenus(); openPanel('launcher'); return; }
    if (key === 'inputs') { doTopAction('inputs'); return; }
    if (key === 'green' || key === 'yellow') { toast('This key has no launcher action in the demo'); return; }
    if (panel === 'launcher') {
      if (key === 'up') changeSettingFocus(-1);
      else if (key === 'down') changeSettingFocus(1);
      else if (key === 'ok') toast('Settings shown as a view-only demo');
      return;
    }
    if (panel === 'tv') {
      if (key === 'up' || key === 'down') toast('TV Settings preview · use Back to return');
      else if (key === 'ok') toast('TV Settings are shown as a preview');
      return;
    }
    if (!inputMenu.classList.contains('is-hidden')) {
      if (key === 'ok') chooseInput(inputOptions[activeInput]);
      else if (key === 'up' || key === 'left') moveMenu(-1);
      else if (key === 'down' || key === 'right') moveMenu(1);
      return;
    }
    if (key === 'ok') {
      if (focusArea === 'top' && topActions[topIndex]) doTopAction(topActions[topIndex].dataset.top);
      return;
    }
    if (focusArea === 'top') {
      if (key === 'left') setTopFocus(topIndex - 1);
      else if (key === 'right') setTopFocus(topIndex + 1);
      else if (key === 'down') setTileFocus(Math.min(3, topIndex));
      else if (key === 'up') setTopFocus(topIndex);
      return;
    }
    if (key === 'left') {
      const rowStart = tileIndex < 4 ? 0 : 4;
      setTileFocus(Math.max(rowStart, tileIndex - 1));
    } else if (key === 'right') {
      const rowEnd = tileIndex < 4 ? 3 : 7;
      setTileFocus(Math.min(rowEnd, tileIndex + 1));
    } else if (key === 'up') {
      if (tileIndex >= 4) setTileFocus(tileIndex - 4);
      else setTopFocus(nearestTopAction(tileIndex));
    } else if (key === 'down') {
      if (tileIndex < 4) setTileFocus(tileIndex + 4);
    }
  }

  topActions.forEach((button, index) => {
    button.addEventListener('click', () => { demoActive = true; doTopAction(button.dataset.top); });
    button.addEventListener('focus', () => { if (demoActive) setTopFocus(index); });
  });
  document.querySelectorAll('.demo-tile').forEach(tile => {
    tile.addEventListener('pointerenter', () => {
      if (screen.classList.contains('wallpaper-only') || panel) return;
      demoActive = true;
      setTileFocus(Number(tile.dataset.appIndex));
    });
  });
  inputOptions.forEach(option => option.addEventListener('click', () => chooseInput(option)));
  document.querySelectorAll('.remote-key[data-key], .color-key[data-key]').forEach(button => {
    button.addEventListener('click', () => {
      button.classList.add('pressed');
      setTimeout(() => button.classList.remove('pressed'), 120);
      performKey(button.dataset.key);
    });
  });
  document.getElementById('keyboardStart').addEventListener('click', () => {
    demoActive = true;
    screen.focus({ preventScroll: true });
    setTileFocus(tileIndex);
    toast('Keyboard remote ready');
  });
  screen.addEventListener('pointerdown', () => { demoActive = true; screen.focus({ preventScroll: true }); });
  document.addEventListener('keydown', event => {
    if (!demoActive || !demo.contains(document.activeElement)) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back' };
    if (map[event.key]) { event.preventDefault(); performKey(map[event.key]); return; }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); performKey('red'); }
    if (event.key.toLowerCase() === 'b') { event.preventDefault(); performKey('blue'); }
    if (event.key.toLowerCase() === 'h') { event.preventDefault(); performKey('home'); }
    if (event.key.toLowerCase() === 'm') { event.preventDefault(); performKey('menu'); }
  });
  window.addEventListener('resize', () => {
    if (focusArea === 'tile' && !screen.classList.contains('wallpaper-only')) moveGlassTo(currentTile());
  });

  const revealTargets = document.querySelectorAll(
    '.hero-copy, .hero-visual, .chapter-meta, .chapter-copy, .feed-card, .reset-head, .reset-card, .demo-heading > div, .tv-frame, .remote-panel, .demo-legend, .finish-content > .eyebrow, .finish-content > h2, .finish-copy, .finish-link, .finish-foot'
  );
  const revealCounts = new WeakMap();
  revealTargets.forEach(element => {
    const parent = element.parentElement;
    const index = revealCounts.get(parent) || 0;
    revealCounts.set(parent, index + 1);
    element.style.setProperty('--reveal-delay', Math.min(index * 110, 330) + 'ms');
    element.classList.add('story-reveal');
  });
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' });
    revealTargets.forEach(element => revealObserver.observe(element));
  } else {
    revealTargets.forEach(element => element.classList.add('is-visible'));
  }

  const scrollProgressFill = document.getElementById('scrollProgressFill');
  const heroPhoto = document.querySelector('.hero-photo');
  const finishSection = document.querySelector('.chapter-finish');
  const finishImage = document.querySelector('.finish-image');
  let pageMotionFrame = 0;
  function updatePageMotion() {
    pageMotionFrame = 0;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0;
    scrollProgressFill.style.transform = 'scaleX(' + progress + ')';

    const heroRect = document.querySelector('.hero-visual').getBoundingClientRect();
    if (heroRect.bottom > 0 && heroRect.top < window.innerHeight) {
      const travel = (window.innerHeight - heroRect.top) / (window.innerHeight + heroRect.height);
      heroPhoto.style.transform = 'translate3d(0,' + ((travel - .5) * -22).toFixed(1) + 'px,0) scale(1.07)';
    }
    const finishRect = finishSection.getBoundingClientRect();
    if (finishRect.bottom > 0 && finishRect.top < window.innerHeight) {
      const travel = (window.innerHeight - finishRect.top) / (window.innerHeight + finishRect.height);
      finishImage.style.transform = 'translate3d(0,' + ((travel - .5) * -34).toFixed(1) + 'px,0) scale(1.08)';
    }
  }
  function requestPageMotion() {
    if (!pageMotionFrame) pageMotionFrame = requestAnimationFrame(updatePageMotion);
  }
  window.addEventListener('scroll', requestPageMotion, { passive: true });
  window.addEventListener('resize', requestPageMotion);
  requestPageMotion();

  function updateClock() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(now);
    const hour = parts.find(part => part.type === 'hour').value;
    const minute = parts.find(part => part.type === 'minute').value;
    const period = parts.find(part => part.type === 'dayPeriod').value.toUpperCase();
    const hour24 = now.getHours();
    let greeting = 'GOOD NIGHT';
    if (hour24 >= 5 && hour24 < 12) greeting = 'GOOD MORNING';
    else if (hour24 >= 12 && hour24 < 17) greeting = 'GOOD AFTERNOON';
    else if (hour24 >= 17 && hour24 < 21) greeting = 'GOOD EVENING';
    document.getElementById('clock').textContent = hour + ':' + minute;
    document.getElementById('meridiem').textContent = period;
    document.getElementById('date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(now).toUpperCase();
    document.getElementById('greeting').textContent = greeting;
  }

  updateClock();
  setInterval(updateClock, 30000);
  setTileFocus(0);
  requestAnimationFrame(() => requestAnimationFrame(() => moveGlassTo(currentTile())));
})();
