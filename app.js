(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const TZ = 'Asia/Qatar';
  const CITY = { latitude: 25.2854, longitude: 51.531, name: 'الدوحة' };
  const TEAMS = ['الأهلي', 'الزمالك', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول'];
  const SCENES = ['home', 'prayer', 'weather', 'matches', 'news'];
  const SCENE_NAMES = { home: 'لوحة اليوم', prayer: 'مواقيت الصلاة', weather: 'طقس الدوحة', matches: 'مباريات اليوم', news: 'أخبار اليوم' };
  const PRAYERS = [['Fajr', 'الفجر'], ['Dhuhr', 'الظهر'], ['Asr', 'العصر'], ['Maghrib', 'المغرب'], ['Isha', 'العشاء']];
  const state = { scene: 'home', prayers: null, weather: null, matches: [], allEvents: [], news: [], rotateTimer: null, dataTimers: [], lastAlarmKey: '', toastTimer: null };
  const storage = {
    get(key, fallback) { try { const value = localStorage.getItem(`dohatv.${key}`); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(`dohatv.${key}`, JSON.stringify(value)); } catch { /* Private TV browser storage can be disabled. */ } }
  };
  const selectedTeams = new Set(storage.get('selectedTeams', TEAMS));
  const latin = (value) => String(value ?? '').replace(/[٠-٩۰-۹]/g, (n) => '01234567890123456789'['٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(n)] ?? n);
  const safeTime = (value) => latin(String(value || '--:--').split(' ')[0]);
  const dateParts = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(new Date());
    return Object.fromEntries(parts.filter((x) => x.type !== 'literal').map(({ type, value }) => [type, value]));
  };
  const apiDate = () => { const p = dateParts(); return `${p.day}-${p.month}-${p.year}`; };
  const timeText = (date = new Date()) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const prettyDate = () => new Intl.DateTimeFormat('ar-QA', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(new Date());
  const fmtNumber = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
  const fmtDay = (str) => new Intl.DateTimeFormat('ar-QA', { timeZone: TZ, weekday: 'short', numberingSystem: 'latn' }).format(new Date(`${str}T12:00:00+03:00`));
  const weatherCodes = {
    0: ['سماء صافية', '☀'], 1: ['غائم غالبًا', '🌤'], 2: ['غائم جزئيًا', '⛅'], 3: ['غائم', '☁'], 45: ['ضباب', '〰'], 48: ['ضباب كثيف', '〰'],
    51: ['رذاذ خفيف', '🌦'], 53: ['رذاذ', '🌦'], 55: ['رذاذ كثيف', '🌧'], 61: ['مطر خفيف', '🌦'], 63: ['مطر', '🌧'], 65: ['مطر غزير', '🌧'], 71: ['ثلوج خفيفة', '❄'], 73: ['ثلوج', '❄'], 75: ['ثلوج كثيفة', '❄'], 80: ['زخات خفيفة', '🌦'], 81: ['زخات مطر', '🌧'], 82: ['زخات قوية', '🌧'], 95: ['عواصف رعدية', '⛈'], 96: ['عواصف وبَرَد', '⛈'], 99: ['عواصف قوية', '⛈']
  };
  const getJson = async (url, timeout = 12000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try { const response = await fetch(url, { signal: controller.signal, cache: 'no-store' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json(); }
    finally { clearTimeout(id); }
  };
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  function paintDateTime() {
    $('#clock').textContent = timeText();
    $('#gregorianDate').textContent = prettyDate();
    const hijri = storage.get('hijri', null);
    $('#hijriDate').textContent = hijri || 'التقويم الهجري';
    const weekday = new Intl.DateTimeFormat('ar-QA', { timeZone: TZ, weekday: 'long' }).format(new Date());
    $('.eyebrow').innerHTML = `<span class="eyebrow-line"></span> ${escapeHTML(weekday)} · الدوحة`;
  }
  function findNextPrayer() {
    if (!state.prayers) return null;
    const now = timeText();
    const current = PRAYERS.map(([key, name]) => ({ key, name, time: safeTime(state.prayers[key]) }));
    const next = current.find((p) => p.time > now);
    return next || { ...current[0], tomorrow: true };
  }
  function countdownTo(time, tomorrow = false) {
    if (!time || time === '--:--') return '--:--';
    const [hours, mins] = time.split(':').map(Number);
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const p = Object.fromEntries(parts.filter((x) => x.type !== 'literal').map(({ type, value }) => [type, Number(value)]));
    const target = new Date(Date.UTC(p.year, p.month - 1, p.day, hours - 3 + (tomorrow ? 24 : 0), mins));
    const delta = Math.max(0, target.getTime() - now.getTime());
    const h = Math.floor(delta / 3600000); const m = Math.floor((delta % 3600000) / 60000);
    return `بعد ${fmtNumber(h)} س ${fmtNumber(m)} د`;
  }
  function renderPrayers() {
    if (!state.prayers) return;
    const next = findNextPrayer();
    for (const id of ['prayerList', 'prayerListLarge']) {
      const el = $(`#${id}`); if (!el) continue;
      el.innerHTML = PRAYERS.map(([key, name]) => `<div class="prayer-item ${next?.key === key ? 'is-next' : ''}"><span>${name}</span><b>${escapeHTML(safeTime(state.prayers[key]))}</b></div>`).join('');
    }
    for (const id of ['nextPrayerName', 'nextPrayerNameLarge']) { const el = $(`#${id}`); if (el) el.textContent = next?.name || '--'; }
    for (const id of ['prayerCountdown', 'prayerCountdownLarge']) { const el = $(`#${id}`); if (el) el.textContent = next ? countdownTo(next.time, next.tomorrow) : '--:--'; }
    if (next) $('#dailyMessage').textContent = `باقٍ على صلاة ${next.name} ${countdownTo(next.time, next.tomorrow)}`;
  }
  async function loadPrayers() {
    try {
      const url = `https://api.aladhan.com/v1/timingsByCity/${apiDate()}?city=Doha&country=Qatar&method=10&timezonestring=${encodeURIComponent(TZ)}`;
      const data = await getJson(url);
      if (data.code !== 200 || !data.data?.timings) throw new Error('Prayer data unavailable');
      state.prayers = data.data.timings; renderPrayers();
      const h = data.data.date?.hijri;
      if (h) { const text = `${latin(h.day)} ${h.month?.ar || h.month?.en || ''} ${latin(h.year)} هـ`; storage.set('hijri', text); $('#hijriDate').textContent = text; }
    } catch { $('#prayerList').innerHTML = '<div class="loading-line">تعذر جلب المواقيت · تحقق من اتصال الإنترنت</div>'; $('#prayerListLarge').innerHTML = '<div class="loading-line">تعذر جلب المواقيت · تحقق من اتصال الإنترنت</div>'; }
  }
  function renderWeather(data) {
    const current = data.current || {};
    const [description, symbol] = weatherCodes[current.weather_code] || ['حالة الطقس', '☁'];
    for (const id of ['temperature', 'temperatureLarge']) { const el = $(`#${id}`); if (el) el.innerHTML = `${fmtNumber(current.temperature_2m ?? '--')}<sup>°</sup>`; }
    for (const id of ['weatherDescription', 'weatherDescriptionLarge']) { const el = $(`#${id}`); if (el) el.textContent = description; }
    $('#weatherSymbol').textContent = symbol;
    const detailHTML = `<div><span class="detail-icon">↗</span><span>الرياح</span><b>${fmtNumber(current.wind_speed_10m ?? '--')} كم/س</b></div><div><span class="detail-icon">◌</span><span>الرطوبة</span><b>${fmtNumber(current.relative_humidity_2m ?? '--')}%</b></div><div><span class="detail-icon">☼</span><span>العظمى / الصغرى</span><b>${fmtNumber(data.daily.temperature_2m_max[0])}° / ${fmtNumber(data.daily.temperature_2m_min[0])}°</b></div>`;
    $('#weatherDetailsLarge').innerHTML = detailHTML;
    $('#wind').textContent = `${fmtNumber(current.wind_speed_10m ?? '--')} كم/س`;
    $('#humidity').textContent = `${fmtNumber(current.relative_humidity_2m ?? '--')}%`;
    $('#highLow').textContent = `${fmtNumber(data.daily.temperature_2m_max[0])}° / ${fmtNumber(data.daily.temperature_2m_min[0])}°`;
    const forecast = data.daily.time.slice(1, 6).map((day, i) => { const code = data.daily.weather_code[i + 1]; const wx = weatherCodes[code] || ['طقس', '☁']; return `<div class="forecast-day"><span>${escapeHTML(fmtDay(day))}</span><i>${wx[1]}</i><b>${fmtNumber(data.daily.temperature_2m_max[i + 1])}°</b></div>`; }).join('');
    $('#forecast').innerHTML = forecast; $('#forecastLarge').innerHTML = forecast;
  }
  async function loadWeather() {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${CITY.latitude}&longitude=${CITY.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(TZ)}&forecast_days=6`;
      const data = await getJson(url); if (!data.current || !data.daily?.time) throw new Error('Weather data unavailable');
      state.weather = data; renderWeather(data);
    } catch { $('#weatherDescription').textContent = 'تعذر تحميل الطقس · تحقق من الإنترنت'; $('#weatherDescriptionLarge').textContent = 'تعذر تحميل الطقس · تحقق من الإنترنت'; }
  }
  const canonicalTeam = (text) => {
    const t = String(text || '').toLowerCase();
    if (t.includes('al ahly') || t.includes('الأهلي') || t.includes('الاهلي')) return 'الأهلي';
    if (t.includes('zamalek') || t.includes('الزمالك')) return 'الزمالك';
    if (t.includes('real madrid') || t.includes('ريال مدريد')) return 'ريال مدريد';
    if (t.includes('barcelona') || t.includes('برشلونة') || t.includes('barça')) return 'برشلونة';
    if (t.includes('manchester city') || t.includes('مانشستر سيتي')) return 'مانشستر سيتي';
    if (t.includes('liverpool') || t.includes('ليفربول')) return 'ليفربول';
    return '';
  };
  function renderTeamFilters() {
    const html = TEAMS.map((team) => `<button class="team-filter ${selectedTeams.has(team) ? 'is-selected' : ''}" type="button" data-team="${escapeHTML(team)}" aria-pressed="${selectedTeams.has(team)}">${escapeHTML(team)}</button>`).join('');
    $$('.team-filters').forEach((el) => { el.innerHTML = html; });
  }
  function renderMatches(events = state.allEvents) {
    state.allEvents = events;
    const filtered = events.filter((e) => {
      const home = canonicalTeam(e.strHomeTeam); const away = canonicalTeam(e.strAwayTeam);
      return selectedTeams.size > 0 && ((home && selectedTeams.has(home)) || (away && selectedTeams.has(away)));
    });
    state.matches = filtered;
    const html = filtered.length ? filtered.map((e) => {
      const home = canonicalTeam(e.strHomeTeam) || e.strHomeTeam || '—'; const away = canonicalTeam(e.strAwayTeam) || e.strAwayTeam || '—';
      const score = e.intHomeScore != null && e.intAwayScore != null ? `${e.intHomeScore} - ${e.intAwayScore}` : (e.strTime ? safeTime(e.strTime) : 'لم تبدأ');
      const league = e.strLeague || e.strSeason || 'كرة القدم';
      return `<div class="match-row"><span class="match-league">${escapeHTML(league)}</span><div class="match-teams"><span>${escapeHTML(home)}</span><b class="match-vs">${escapeHTML(score.includes(' - ') ? score : 'VS')}</b><span>${escapeHTML(away)}</span></div><span class="match-score">${escapeHTML(score.includes(' - ') ? (e.strStatus || 'النتيجة') : score)}</span></div>`;
    }).join('') : `<div class="match-empty">${selectedTeams.size ? 'لا توجد مباراة للفرق المختارة اليوم.' : 'اختر فريقًا أو أكثر لعرض مبارياتهم اليوم.'}<br>ستظهر مباريات اليوم فقط عند توفرها.</div>`;
    $('#matchList').innerHTML = html; $('#matchListLarge').innerHTML = html;
    renderTeamFilters();
  }
  async function loadMatches() {
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${encodeURIComponent(todayKey())}&s=Soccer`;
      const data = await getJson(url); renderMatches(Array.isArray(data.events) ? data.events : []);
    } catch { $('#matchList').innerHTML = '<div class="match-empty">تعذر تحميل مباريات اليوم · ستتم إعادة المحاولة</div>'; $('#matchListLarge').innerHTML = '<div class="match-empty">تعذر تحميل مباريات اليوم · ستتم إعادة المحاولة</div>'; }
  }
  function timeAgo(seen) {
    if (!seen) return 'اليوم';
    const d = new Date(`${seen.slice(0, 4)}-${seen.slice(4, 6)}-${seen.slice(6, 8)}T${seen.slice(8, 10)}:${seen.slice(10, 12)}:${seen.slice(12, 14)}Z`);
    const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
    return mins < 60 ? `منذ ${mins} د` : `منذ ${Math.floor(mins / 60)} س`;
  }
  function renderNews(articles) {
    state.news = articles;
    const items = articles.slice(0, 7);
    const html = items.length ? items.map((n) => `<div class="news-row"><span class="news-time">${escapeHTML(timeAgo(n.seendate))}</span><a class="news-title" href="${escapeHTML(n.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(n.title)}">${escapeHTML(n.title || n.domain || 'خبر جديد')}</a></div>`).join('') : '<div class="match-empty">لا توجد عناوين متاحة الآن.</div>';
    $('#newsList').innerHTML = html; $('#newsListLarge').innerHTML = html;
  }
  async function loadNews() {
    try {
      const query = encodeURIComponent('domain:aljazeera.net');
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&format=json&maxrecords=7&sort=DateDesc&timespan=24h`;
      const data = await getJson(url, 18000); renderNews(Array.isArray(data.articles) ? data.articles : []);
    } catch { $('#newsList').innerHTML = '<div class="match-empty">تعذر الاتصال بمصدر الأخبار · ستتم إعادة المحاولة</div>'; $('#newsListLarge').innerHTML = '<div class="match-empty">تعذر الاتصال بمصدر الأخبار · ستتم إعادة المحاولة</div>'; }
  }
  function setScene(name, { rotate = false } = {}) {
    if (!SCENES.includes(name)) return;
    state.scene = name;
    $$('.scene').forEach((el) => { el.hidden = !el.dataset.scene.split(' ').includes(name); });
    $$('.nav-item').forEach((el) => el.classList.toggle('is-active', el.dataset.target === name));
    $('#viewLabel').textContent = SCENE_NAMES[name];
    $('#screenCount').textContent = `${SCENES.indexOf(name) + 1} / ${SCENES.length}`;
    if (!rotate) resetRotationTimer();
  }
  function resetRotationTimer() {
    clearTimeout(state.rotateTimer); state.rotateTimer = null;
    if (!$('#autoRotate')?.checked || $('#settingsDialog').open) return;
    const seconds = Number($('#rotateSeconds')?.value || 30);
    state.rotateTimer = setTimeout(() => { const index = SCENES.indexOf(state.scene); setScene(SCENES[(index + 1) % SCENES.length], { rotate: true }); resetRotationTimer(); }, seconds * 1000);
  }
  function setTheme(theme) {
    document.body.dataset.theme = theme;
    storage.set('theme', theme);
    $$('.theme-swatch').forEach((button) => button.classList.toggle('selected', button.dataset.themePick === theme));
  }
  function cycleTheme() {
    const themes = ['midnight', 'desert', 'emerald']; const current = themes.indexOf(document.body.dataset.theme);
    const next = themes[(current + 1) % themes.length]; setTheme(next); toast(({ midnight: 'ثيم ليل الدوحة', desert: 'ثيم رمال الصحراء', emerald: 'ثيم أخضر زمردي' })[next]);
  }
  function settingsOpen() {
    $('#autoRotate').checked = storage.get('autoRotate', true);
    $('#rotateSeconds').value = String(storage.get('rotateSeconds', 30));
    $('#fontSize').value = storage.get('fontSize', 'large');
    $('#autoAdhanAlert').checked = storage.get('autoAdhanAlert', false);
    $('#adhanUrl').value = storage.get('adhanUrl', '');
    $('#settingsDialog').showModal(); clearTimeout(state.rotateTimer);
  }
  function saveSettings(event) {
    if (event) event.preventDefault();
    storage.set('autoRotate', $('#autoRotate').checked);
    storage.set('rotateSeconds', Number($('#rotateSeconds').value));
    storage.set('fontSize', $('#fontSize').value);
    storage.set('autoAdhanAlert', $('#autoAdhanAlert').checked);
    storage.set('adhanUrl', $('#adhanUrl').value.trim());
    document.body.dataset.font = $('#fontSize').value;
    toast('تم حفظ الإعدادات');
    $('#settingsDialog').close(); resetRotationTimer();
  }
  async function toggleAdhan() {
    const url = storage.get('adhanUrl', '');
    if (!url) { settingsOpen(); toast('أضف رابط ملف الأذان من الإعدادات أولًا'); return; }
    const audio = $('#adhanAudio');
    if (!audio.src.endsWith(url)) audio.src = url;
    try {
      if (audio.paused) { await audio.play(); $('#adhanButton').textContent = 'إيقاف الأذان ⏸'; $('#adhanButtonLarge').textContent = 'إيقاف الأذان ⏸'; }
      else { audio.pause(); $('#adhanButton').textContent = '◖ تفعيل تنبيه الصلاة'; $('#adhanButtonLarge').textContent = '◖ تفعيل تنبيه الصلاة'; }
    } catch { toast('تعذر تشغيل الملف · تحقق من الرابط أو افتح الصفحة بالإنترنت'); }
  }
  function setInitialSettings() {
    const theme = storage.get('theme', 'midnight'); setTheme(['midnight', 'desert', 'emerald'].includes(theme) ? theme : 'midnight');
    document.body.dataset.font = storage.get('fontSize', 'large');
    $('#autoRotate').checked = storage.get('autoRotate', true);
    $('#rotateSeconds').value = String(storage.get('rotateSeconds', 30));
    $('#autoAdhanAlert').checked = storage.get('autoAdhanAlert', false);
  }
  function bindEvents() {
    $$('.nav-item').forEach((button) => button.addEventListener('click', () => setScene(button.dataset.target)));
    $('#themeButton').addEventListener('click', cycleTheme);
    $('#settingsButton').addEventListener('click', settingsOpen);
    $('#nextPrayerButton').addEventListener('click', () => setScene('prayer'));
    $('#rotateButton').addEventListener('click', () => { const i = SCENES.indexOf(state.scene); setScene(SCENES[(i + 1) % SCENES.length]); });
    $('#refreshMatches').addEventListener('click', () => { toast('جارٍ تحديث مباريات اليوم'); loadMatches(); });
    $$('.team-filters').forEach((container) => container.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-team]');
      if (!button) return;
      const team = button.dataset.team;
      if (selectedTeams.has(team)) selectedTeams.delete(team); else selectedTeams.add(team);
      storage.set('selectedTeams', [...selectedTeams]);
      renderMatches();
    }));
    $('#saveSettings').addEventListener('click', saveSettings);
    $('#settingsDialog').addEventListener('close', resetRotationTimer);
    $('#autoRotate').addEventListener('change', resetRotationTimer);
    $('#rotateSeconds').addEventListener('change', resetRotationTimer);
    $$('.theme-swatch').forEach((button) => button.addEventListener('click', () => setTheme(button.dataset.themePick)));
    $('#adhanButton').addEventListener('click', toggleAdhan);
    $('#adhanButtonLarge').addEventListener('click', toggleAdhan);
    $('#adhanAudio').addEventListener('ended', () => { $('#adhanButton').textContent = '◖ تفعيل تنبيه الصلاة'; $('#adhanButtonLarge').textContent = '◖ تفعيل تنبيه الصلاة'; });
    document.addEventListener('keydown', (event) => {
      const dialog = $('#settingsDialog');
      if (dialog.open) {
        if (event.key === 'Escape') { dialog.close(); return; }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          const controls = $$('button:not(:disabled),input:not(:disabled),select:not(:disabled)', dialog).filter((el) => el.offsetParent !== null);
          const current = controls.indexOf(document.activeElement);
          const forward = event.key === 'ArrowLeft' || event.key === 'ArrowDown';
          const next = current < 0 ? 0 : (current + (forward ? 1 : -1) + controls.length) % controls.length;
          controls[next]?.focus();
        } else if (event.key === 'Enter' && document.activeElement?.click) {
          event.preventDefault(); document.activeElement.click();
        }
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); const i = SCENES.indexOf(state.scene); const delta = event.key === 'ArrowLeft' ? 1 : -1;
        setScene(SCENES[(i + delta + SCENES.length) % SCENES.length]);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const controls = $$('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)').filter((el) => el.offsetParent !== null);
        const current = controls.indexOf(document.activeElement);
        const next = current < 0 ? 0 : (current + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
        controls[next]?.focus(); resetRotationTimer();
      } else if (event.key === 'Escape') setScene('home');
      else if (event.key === 'Enter' && document.activeElement?.click && document.activeElement !== document.body) {
        event.preventDefault(); document.activeElement.click(); resetRotationTimer();
      } else if (event.key === ' ' || event.key === 'Enter') resetRotationTimer();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { paintDateTime(); loadPrayers(); loadWeather(); loadMatches(); loadNews(); resetRotationTimer(); } else clearTimeout(state.rotateTimer); });
  }
  async function init() {
    setInitialSettings(); bindEvents(); paintDateTime(); setScene('home');
    renderMatches();
    resetRotationTimer();
    loadPrayers(); loadWeather(); loadMatches(); loadNews();
    renderPrayers();
    setInterval(() => { paintDateTime(); renderPrayers(); checkAdhanTime(); }, 15000);
    state.dataTimers = [setInterval(loadPrayers, 60 * 60 * 1000), setInterval(loadWeather, 30 * 60 * 1000), setInterval(loadMatches, 15 * 60 * 1000), setInterval(loadNews, 15 * 60 * 1000)];
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  function checkAdhanTime() {
    if (!state.prayers || !storage.get('autoAdhanAlert', false)) return;
    const now = timeText(); const prayer = PRAYERS.find(([key]) => safeTime(state.prayers[key]) === now);
    const key = `${todayKey()}-${now}`;
    if (prayer && state.lastAlarmKey !== key) { state.lastAlarmKey = key; const url = storage.get('adhanUrl', ''); if (url) { $('#adhanAudio').src = url; $('#adhanAudio').play().catch(() => {}); } }
  }
  init();
})();
