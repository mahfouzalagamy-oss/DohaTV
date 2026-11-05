const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function createDashboard(fetchImpl, options = {}) {
    const elements = new Map();
    const storedValues = new Map();
    const requestedUrls = [];
    const intervalCalls = [];
    const timeoutCalls = [];
    const clearedTimeouts = [];
    const windowListeners = {};
    const documentListeners = {};
    let document;
    const navElements = (options.navItems || []).map(({ id, rect, tagName = 'SECTION', card = false }) => {
        const element = {
            id,
            tagName,
            offsetWidth: rect.width,
            offsetHeight: rect.height,
            classList: {
                add() {},
                remove() {},
                contains(name) { return card && name === 'tv-nav-card'; }
            },
            listeners: {},
            attributes: {},
            getBoundingClientRect() { return rect; },
            focus() { document.activeElement = element; },
            click() {
                element.clicked = true;
                element.listeners.click?.({ currentTarget: element });
            },
            addEventListener(name, callback) { this.listeners[name] = callback; },
            setAttribute(name, value) { this.attributes[name] = value; },
            querySelector() { return null; },
            closest() { return null; }
        };
        return element;
    });
    document = {
        body: { classList: { add() {}, remove() {} }, dataset: {} },
        activeElement: null,
        addEventListener(name, callback) { documentListeners[name] = callback; },
        querySelectorAll(selector = '') { return selector.includes('.tv-nav') ? navElements : []; },
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, {
                    id,
                    classList: { add() {}, remove() {}, contains() { return false; } },
                    style: { display: id === 'screensaver-overlay' ? 'none' : '' },
                    innerText: '',
                    innerHTML: '',
                    hidden: false,
                    listeners: {},
                    attributes: {},
                    offsetWidth: 1,
                    offsetHeight: 1,
                    tagName: 'BUTTON',
                    src: '',
                    alt: '',
                    addEventListener(name, callback) { this.listeners[name] = callback; },
                    click() { this.listeners.click?.({ currentTarget: this }); },
                    setAttribute(name, value) { this.attributes[name] = value; },
                    removeAttribute(name) { delete this[name]; },
                    querySelector() { return null; },
                    getBoundingClientRect() { return { left: 0, top: 0, width: 1, height: 1 }; },
                    focus() {},
                    load() {},
                    play() { return Promise.resolve(); },
                    pause() {}
                });
            }
            return elements.get(id);
        }
    };
    const context = vm.createContext({
        document,
        window: {
            AndroidTV: options.androidTV,
            addEventListener(name, callback) {
                windowListeners[name] = callback;
            }
        },
        localStorage: {
            getItem(key) { return storedValues.get(key) || null; },
            setItem(key, value) { storedValues.set(key, String(value)); },
            removeItem(key) { storedValues.delete(key); }
        },
        URL,
        getComputedStyle() { return { visibility: 'visible' }; },
        fetch: url => {
            requestedUrls.push(url);
            return fetchImpl(url);
        },
        console: { error() {} },
        setInterval(callback, delay) { intervalCalls.push({ callback, delay }); },
        clearTimeout(id) { clearedTimeouts.push(id); },
        setTimeout(callback, delay) {
            const id = timeoutCalls.length + 1;
            timeoutCalls.push({ id, callback, delay });
            return id;
        }
    });

    vm.runInContext(appSource, context);
    return {
        context,
        elements,
        storedValues,
        requestedUrls,
        intervalCalls,
        timeoutCalls,
        clearedTimeouts,
        windowListeners,
        documentListeners,
        navElements
    };
}

test('cycles the USD and gold prices in EGP and USD from live source responses', async () => {
    const dashboard = createDashboard(async url => ({
        ok: true,
        json: async () => url.includes('frankfurter.dev')
            ? { date: '2026-11-02', base: 'USD', quote: 'EGP', rate: 50 }
            : { symbol: 'XAU', currency: 'USD', price: 2500 }
    }));

    await vm.runInContext('fetchFinancialRatesAndGold()', dashboard.context);

    assert.equal(dashboard.requestedUrls[0], 'https://api.frankfurter.dev/v2/rate/usd/egp');
    assert.equal(dashboard.elements.get('finance-label').innerText, 'سعر الدولار بالجنيه المصري');
    assert.equal(dashboard.elements.get('finance-value').innerText, '50.00 ج.م');
    assert.equal(dashboard.elements.get('finance-status').innerText, '');

    vm.runInContext('rotateFinanceCard()', dashboard.context);
    assert.equal(dashboard.elements.get('finance-label').innerText, 'سعر أونصة الذهب بالجنيه المصري');
    assert.equal(dashboard.elements.get('finance-value').innerText, '125000.00 ج.م');
    vm.runInContext('rotateFinanceCard()', dashboard.context);
    assert.equal(dashboard.elements.get('finance-label').innerText, 'سعر أونصة الذهب بالدولار');
    assert.equal(dashboard.elements.get('finance-value').innerText, '2500.00 $');
});

test('cycles and saves the bundled Qatar location backgrounds', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });
    const button = dashboard.context.document.getElementById('background-cycle-btn');
    const name = dashboard.context.document.getElementById('background-name');

    vm.runInContext('setupBackgroundSelector()', dashboard.context);
    assert.equal(dashboard.context.document.body.dataset.background, 'doha-night');
    assert.equal(name.innerText, 'الدوحة ليلاً');

    button.listeners.click();
    assert.equal(dashboard.context.document.body.dataset.background, 'lusail');
    assert.equal(dashboard.storedValues.get('dohatv_background'), 'lusail');
    button.listeners.click();
    assert.equal(dashboard.context.document.body.dataset.background, 'katara');
    button.listeners.click();
    assert.equal(dashboard.context.document.body.dataset.background, 'doha-night');
});

test('keeps a valid exchange rate visible when the gold source is unavailable', async () => {
    const dashboard = createDashboard(async url => {
        if (url.includes('gold-api.com')) return { ok: false, status: 503 };
        return { ok: true, json: async () => ({ base: 'USD', quote: 'EGP', rate: 51.25 }) };
    });

    await vm.runInContext('fetchFinancialRatesAndGold()', dashboard.context);

    assert.equal(dashboard.elements.get('finance-value').innerText, '51.25 ج.م');
    vm.runInContext('rotateFinanceCard()', dashboard.context);
    assert.equal(dashboard.elements.get('finance-value').innerText, 'غير متاح');
    assert.match(dashboard.elements.get('finance-status').innerText, /الذهب/);
});

test('cycles the faith card through ayah, hadith, and dhikr every five seconds', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    vm.runInContext('showFaithContent(0)', dashboard.context);
    assert.equal(dashboard.elements.get('faith-ayah-card').hidden, false);
    assert.equal(dashboard.elements.get('faith-hadith-card').hidden, true);
    assert.equal(dashboard.elements.get('faith-carousel-indicator').innerText, '1 / 3');

    vm.runInContext('rotateFaithContent()', dashboard.context);
    assert.equal(dashboard.elements.get('faith-ayah-card').hidden, true);
    assert.equal(dashboard.elements.get('faith-hadith-card').hidden, false);
    assert.equal(dashboard.elements.get('faith-carousel-indicator').innerText, '2 / 3');

    vm.runInContext('rotateFaithContent()', dashboard.context);
    assert.equal(dashboard.elements.get('faith-dhikr-card').hidden, false);
    assert.equal(dashboard.elements.get('faith-carousel-indicator').innerText, '3 / 3');

    assert.match(appSource, /setInterval\(rotateFaithContent,\s*5000\)/);
});

test('keeps the dashboard visible without starting an idle screensaver timer', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    vm.runInContext('setupRemoteNavigation()', dashboard.context);
    assert.equal(dashboard.timeoutCalls.length, 0);
    assert.doesNotMatch(appSource, /setupIdleScreensaver|screensaver-overlay/);
});

test('formats display digits in English and clock times in 12-hour format', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    assert.equal(
        vm.runInContext("toEnglishDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹')", dashboard.context),
        '0123456789 0123456789'
    );
    assert.equal(vm.runInContext("formatClockTime('00:05')", dashboard.context), '12:05 ص');
    assert.equal(vm.runInContext("formatClockTime('12:05')", dashboard.context), '12:05 م');
    assert.equal(vm.runInContext("formatClockTime('18:20')", dashboard.context), '06:20 م');
});

test('renders a 12-hour digital clock and date using English digits', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    vm.runInContext('startClockAndTimers()', dashboard.context);
    assert.match(dashboard.elements.get('large-clock').innerText, /^(0[1-9]|1[0-2]):[0-5]\d:[0-5]\d [صم]$/);
    assert.doesNotMatch(dashboard.elements.get('large-clock').innerText, /[٠-٩۰-۹]/);
    assert.doesNotMatch(dashboard.elements.get('gregorian-date-arabic').innerText, /[٠-٩۰-۹]/);
    assert.doesNotMatch(dashboard.elements.get('ramadan-days-value').innerText, /[٠-٩۰-۹]/);
});

test('starts the selected Quran Radio station on Android TV and toggles the native player', () => {
    const calls = [];
    const dashboard = createDashboard(async () => { throw new Error('not used'); }, {
        androidTV: {
            playQuranRadio(station) { calls.push(`play:${station}`); },
            stopQuranRadio() { calls.push('stop'); }
        }
    });

    vm.runInContext('setupRadioControls()', dashboard.context);
    assert.deepEqual(calls, ['play:qatar']);
    assert.equal(dashboard.elements.get('quran-radio-audio').src,
        'https://live.kwikmotion.com/qmcquranradiolive/quranradio/playlist.m3u8');

    dashboard.elements.get('quran-radio-btn').listeners.click();
    assert.deepEqual(calls, ['play:qatar', 'stop']);
    assert.equal(dashboard.elements.get('quran-radio-btn').attributes['aria-pressed'], 'false');

    dashboard.elements.get('quran-radio-btn').listeners.click();
    assert.deepEqual(calls, ['play:qatar', 'stop', 'play:qatar']);
    vm.runInContext("window.updateQuranRadioState(true, 'playing')", dashboard.context);
    dashboard.elements.get('quran-radio-btn').listeners.click();
    assert.deepEqual(calls, ['play:qatar', 'stop', 'play:qatar', 'stop']);
    assert.equal(dashboard.elements.get('quran-radio-btn').attributes['aria-pressed'], 'false');
    assert.equal(dashboard.elements.get('quran-radio-status').innerText, 'تم إيقاف إذاعة القرآن الكريم.');
});

test('switches Quran Radio stations with the remote arrows and restarts the selected station', () => {
    const calls = [];
    const dashboard = createDashboard(async () => { throw new Error('not used'); }, {
        androidTV: {
            playQuranRadio(station) { calls.push(`play:${station}`); },
            stopQuranRadio() { calls.push('stop'); }
        },
        navItems: [{ id: 'quran-radio-btn', rect: { left: 40, top: 40, width: 100, height: 40 } }]
    });

    vm.runInContext('setupRadioControls(); setupRemoteNavigation()', dashboard.context);
    vm.runInContext("window.updateQuranRadioState(true, 'playing')", dashboard.context);
    let prevented = false;
    dashboard.documentListeners.keydown({
        key: 'ArrowRight',
        preventDefault() { prevented = true; }
    });

    assert.equal(prevented, true);
    assert.deepEqual(calls, ['play:qatar', 'stop', 'play:egypt']);
    assert.equal(dashboard.storedValues.get('quranRadioStation'), 'egypt');
    assert.match(dashboard.elements.get('quran-radio-btn').attributes['aria-label'], /مصر/);

    dashboard.documentListeners.keydown({
        key: 'ArrowLeft',
        preventDefault() {}
    });
    assert.equal(dashboard.storedValues.get('quranRadioStation'), 'qatar');
    assert.match(dashboard.elements.get('quran-radio-btn').attributes['aria-label'], /قطر/);
});

test('uses the configured Qatar and Egypt Quran Radio streams on web', async () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    vm.runInContext('setupRadioControls()', dashboard.context);
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.match(appSource, /qmcquranradiolive\/quranradio\/playlist\.m3u8/);
    assert.match(appSource, /https:\/\/stream\.radiojar\.com\/8s5u5tpdtwzuv/);
    dashboard.elements.get('quran-radio-btn').listeners.click();
    await Promise.resolve();
    assert.equal(dashboard.elements.get('quran-radio-btn').attributes['aria-pressed'], 'true');
    assert.match(dashboard.elements.get('quran-radio-status').innerText, /في قطر تعمل/);
    vm.runInContext('changeQuranRadioStation(1)', dashboard.context);
    assert.equal(dashboard.elements.get('quran-radio-audio').src, 'https://stream.radiojar.com/8s5u5tpdtwzuv');
    assert.match(dashboard.elements.get('quran-radio-btn').attributes['aria-label'], /مصر/);
});

test('moves remote focus to the nearest visible element in the physical arrow direction', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); }, {
        navItems: [
            { id: 'start', rect: { left: 40, top: 40, width: 20, height: 20 } },
            { id: 'above', rect: { left: 40, top: 0, width: 20, height: 20 } },
            { id: 'right', rect: { left: 140, top: 40, width: 20, height: 20 } },
            { id: 'below-right', rect: { left: 140, top: 140, width: 20, height: 20 } }
        ]
    });

    vm.runInContext('setupRemoteNavigation()', dashboard.context);
    assert.equal(dashboard.context.document.activeElement.id, 'start');
    dashboard.documentListeners.keydown({ key: 'ArrowRight', preventDefault() {} });
    assert.equal(dashboard.context.document.activeElement.id, 'right');
    dashboard.documentListeners.keydown({ key: 'ArrowDown', preventDefault() {} });
    assert.equal(dashboard.context.document.activeElement.id, 'below-right');
});

test('OK activates a focused select rather than silently cycling its value', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); }, {
        navItems: [
            { id: 'source', rect: { left: 40, top: 40, width: 100, height: 30 }, tagName: 'SELECT' }
        ]
    });

    vm.runInContext('setupRemoteNavigation()', dashboard.context);
    dashboard.documentListeners.keydown({ key: 'Enter', keyCode: 13, preventDefault() {} });
    assert.equal(dashboard.context.document.activeElement.clicked, true);
    assert.equal(dashboard.context.document.activeElement.selectedIndex, undefined);
});

test('requests official Qatar Awqaf prayer times for the current local date', async () => {
    let requestedUrl = '';
    const dashboard = createDashboard(async url => {
        requestedUrl = url;
        const now = new Date();
        return {
            ok: true,
            json: async () => ({
                gregorianDate: {
                    date: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
                },
                hijriDate: { day: 22, year: 1448, month: 5 },
                times: [
                    { prayerTimeName: 'Fajr', time: { hour: 4, minutes: 20, timeFormat: '04:20 AM' } },
                    { prayerTimeName: 'Dhuhr', time: { hour: 11, minutes: 30, timeFormat: '11:30 AM' } },
                    { prayerTimeName: 'Asr', time: { hour: 14, minutes: 45, timeFormat: '02:45 PM' } },
                    { prayerTimeName: 'Maghrib', time: { hour: 16, minutes: 50, timeFormat: '04:50 PM' } },
                    { prayerTimeName: 'Isha', time: { hour: 18, minutes: 20, timeFormat: '06:20 PM' } }
                ]
            })
        };
    });

    await vm.runInContext('fetchPrayerTimes()', dashboard.context);

    assert.match(requestedUrl, /^https:\/\/meiaservicesext\.islam\.gov\.qa\/ServicesBrokerGatewayAPI\/api\/PrayerTimes\?date=\d{2}-\d{2}-\d{4}$/);
    assert.match(dashboard.elements.get('prayer-times-container').innerHTML, /04:20 ص/);
    assert.match(dashboard.elements.get('prayer-times-container').innerHTML, /02:45 م/);
    assert.match(dashboard.elements.get('hijri-date-arabic').innerText, /1448/);
    assert.equal(dashboard.elements.get('prayer-source-status').innerText, 'وزارة الأوقاف القطرية');
});

test('normalizes Qatar Awqaf prayer times and rejects malformed values', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    assert.equal(vm.runInContext("normalizeQatarPrayerTime({hour: 14, minutes: 5})", dashboard.context), '14:05');
    assert.equal(vm.runInContext("normalizeQatarPrayerTime({timeFormat: '06:24 PM'})", dashboard.context), '18:24');
    assert.equal(vm.runInContext("normalizeQatarPrayerTime({hour: 27, minutes: 90})", dashboard.context), null);
    assert.equal(vm.runInContext("normalizeQatarPrayerTime('04:25 (+03)')", dashboard.context), '04:25');
    assert.equal(vm.runInContext("normalizeQatarPrayerTime('25:80')", dashboard.context), null);
});

test('falls back to verified Doha prayer times from Aladhan and caches today only', async () => {
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const urls = [];
    const dashboard = createDashboard(async url => {
        urls.push(url);
        if (url.includes('meiaservicesext')) throw new Error('CORS unavailable');
        return {
            ok: true,
            json: async () => ({
                code: 200,
                data: {
                    meta: { timezone: 'Asia/Qatar', method: { id: 10 } },
                    date: { gregorian: { date } , hijri: { day: '12', month: { number: 8 }, year: '1448' } },
                    timings: {
                        Fajr: '04:25 (+03)', Dhuhr: '11:17 (+03)', Asr: '14:29 (+03)',
                        Maghrib: '16:52 (+03)', Isha: '18:22 (+03)'
                    }
                }
            })
        };
    });

    await vm.runInContext('fetchPrayerTimes()', dashboard.context);

    assert.match(urls[0], /meiaservicesext\.islam\.gov\.qa/);
    assert.match(urls[1], new RegExp(`^https://api\\.aladhan\\.com/v1/timingsByCity/${date}\\?city=Doha&country=Qatar&method=10$`));
    assert.match(dashboard.elements.get('prayer-times-container').innerHTML, /04:25 ص/);
    assert.equal(dashboard.elements.get('prayer-source-status').innerText, 'Aladhan — الدوحة، طريقة قطر');
    assert.ok(dashboard.storedValues.has('dohatv_prayer_cache'));
});

test('rejects fallback prayer data for the wrong timezone, method, or date', async () => {
    const dashboard = createDashboard(async url => ({
        ok: true,
        json: async () => url.includes('meiaservicesext')
            ? {}
            : { code: 200, data: {
                meta: { timezone: 'Asia/Kuwait', method: { id: 10 } },
                date: { gregorian: { date: '01 Jan 2000' }, hijri: { day: '1', month: { number: 1 }, year: '1420' } },
                timings: { Fajr: '04:00', Dhuhr: '11:00', Asr: '14:00', Maghrib: '17:00', Isha: '18:00' }
            } }
    }));

    await vm.runInContext('fetchPrayerTimes()', dashboard.context);
    assert.match(dashboard.elements.get('prayer-times-container').innerHTML, /تعذر الاتصال/);
    assert.equal(dashboard.storedValues.has('dohatv_prayer_cache'), false);
});

test('accepts only HTTPS audio URLs for the adhan source', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    assert.equal(
        vm.runInContext("normalizeHttpsUrl('https://audio.example/adhan.mp3')", dashboard.context),
        'https://audio.example/adhan.mp3'
    );
    assert.equal(vm.runInContext("normalizeHttpsUrl('http://audio.example/adhan.mp3')", dashboard.context), null);
    assert.equal(vm.runInContext("normalizeHttpsUrl('not a URL')", dashboard.context), null);
});

test('offers only the three selected adhan recordings and no external custom source', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });
    const sources = vm.runInContext(`({
        egypt: getAdhanSourceUrl('egypt'),
        makkah: getAdhanSourceUrl('makkah'),
        madinah: getAdhanSourceUrl('madinah'),
        qatar: getAdhanSourceUrl('qatar'),
        custom: getAdhanSourceUrl('custom'),
        invalid: getAdhanSourceUrl('unknown')
    })`, dashboard.context);
    const repositoryCommit = 'b9180a2bb769f74cff8e378ef2cc7aaf8db5cd5b';

    for (const sourceId of ['egypt', 'makkah', 'madinah']) {
        assert.match(sources[sourceId], new RegExp(`^https://raw\\.githubusercontent\\.com/Kiwifu/adhan-mp3/${repositoryCommit}/`));
    }
    assert.match(decodeURIComponent(new URL(sources.egypt).pathname), /عبد_الباسط_عبد_الصمد/);
    assert.match(decodeURIComponent(new URL(sources.makkah).pathname), /الحرم_المكي/);
    assert.match(decodeURIComponent(new URL(sources.madinah).pathname), /المدينة_المنورة/);
    assert.equal(sources.qatar, null);
    assert.equal(sources.custom, null);
    assert.equal(sources.invalid, null);

    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    for (const sourceId of ['egypt', 'makkah', 'madinah']) {
        assert.match(html, new RegExp(`class="glass-btn tv-nav adhan-source-option" type="button" data-adhan-source="${sourceId}"`));
    }
    assert.doesNotMatch(html, /adhan-custom-source-input|value="qatar"|value="custom"/);
});

test('selecting an adhan preset saves and plays the matching recording', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });
    const createOption = sourceId => ({
        sourceId,
        listeners: {},
        attributes: {},
        classList: { toggle() {} },
        getAttribute(name) { return name === 'data-adhan-source' ? sourceId : null; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        setAttribute(name, value) { this.attributes[name] = value; },
        focus() {},
        click() { this.listeners.click?.(); }
    });
    const sourceOptions = ['egypt', 'makkah', 'madinah'].map(createOption);
    dashboard.context.document.querySelectorAll = selector =>
        selector === '.adhan-source-option' ? sourceOptions : [];
    const sourceButton = dashboard.context.document.getElementById('adhan-source-btn');
    const sourceMenu = dashboard.context.document.getElementById('adhan-source-menu');
    sourceMenu.hidden = true;

    vm.runInContext('setupThemeAndAudioControls()', dashboard.context);
    const audio = dashboard.elements.get('azan-audio');

    assert.match(sourceButton.innerText, /مكة المكرمة/);
    assert.equal(audio.src, vm.runInContext("getAdhanSourceUrl('makkah')", dashboard.context));

    sourceButton.listeners.click();
    assert.equal(sourceMenu.hidden, false);
    sourceOptions[2].click();

    assert.equal(audio.src, vm.runInContext("getAdhanSourceUrl('madinah')", dashboard.context));
    assert.equal(dashboard.storedValues.get('dohatv_adhan_source'), 'madinah');
    assert.equal(sourceMenu.hidden, true);
    assert.match(sourceButton.innerText, /المدينة المنورة/);
});

test('cycles through all uploaded product photos without cropping or permanent gallery controls', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });
    const slides = vm.runInContext('PRODUCT_SLIDES', dashboard.context);

    assert.equal(slides.length, 11);
    for (const slide of slides) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', slide.src)), `Missing product image: ${slide.src}`);
        assert.ok(slide.alt);
        assert.ok(slide.name);
        assert.ok(slide.details);
    }
    const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    for (const slide of slides) {
        assert.ok(serviceWorker.includes(`./${slide.src}`), `Product image is not precached: ${slide.src}`);
    }

    vm.runInContext('setupProductGallery()', dashboard.context);
    const image = dashboard.elements.get('product-showcase-image');
    const counter = dashboard.elements.get('product-gallery-count');

    assert.equal(image.src, slides[0].src);
    assert.equal(dashboard.elements.get('product-gallery-name').innerText, slides[0].name);
    assert.equal(dashboard.intervalCalls.at(-1).delay, 5000);
    vm.runInContext('setupCardActions()', dashboard.context);
    dashboard.elements.get('action-next-product').listeners.click();
    assert.equal(image.src, slides[1].src);
    assert.equal(dashboard.elements.get('product-gallery-name').innerText, slides[1].name);
    dashboard.elements.get('action-previous-product').listeners.click();
    assert.equal(image.src, slides[0].src);

    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const productCard = html.match(/<section class="glass-card card-products[\s\S]*?<\/section>/)?.[0] || '';
    assert.doesNotMatch(productCard, /card-header|product-gallery-count|product-gallery-control/);
    assert.match(productCard, /id="product-gallery-name"/);
});

test('shows an explicit unavailable state when the weather provider is down', async () => {
    const dashboard = createDashboard(async () => ({ ok: false, status: 503 }));

    await vm.runInContext('fetchWeatherForecast()', dashboard.context);

    assert.equal(dashboard.elements.get('current-weather-temp').innerText, 'غير متاح');
    assert.match(dashboard.elements.get('weather-forecast').innerHTML, /تعذر جلب بيانات الطقس حاليًا/);
});

test('renders current weather, matching hourly readings, and correct forecast weekdays', async () => {
    const dashboard = createDashboard(async () => ({
        ok: true,
        json: async () => ({
            current_weather: { temperature: 33.4, windspeed: 8.5, weathercode: 61, time: '2026-11-02T18:00' },
            hourly: {
                time: ['2026-11-02T17:00', '2026-11-02T18:00'],
                apparent_temperature: [31, 35],
                uv_index: [1, 2]
            },
            daily: {
                time: ['2026-11-02', '2026-11-03', '2026-11-04'],
                temperature_2m_max: [34, 33, 32],
                temperature_2m_min: [27, 26, 25]
            }
        })
    }));

    await vm.runInContext('fetchWeatherForecast()', dashboard.context);

    assert.equal(dashboard.elements.get('current-weather-temp').innerText, '🌧️ 33°م');
    assert.equal(dashboard.elements.get('weather-feels').innerText, 'المحسوسة: 35°م');
    assert.equal(dashboard.elements.get('weather-uv').innerText, 'الأشعة UV: 2');
    assert.match(dashboard.elements.get('weather-forecast').innerHTML, /الأربعاء/);
});

test('includes responsive product showcase and TV-safe dashboard layout', () => {
    const styles = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

    assert.match(styles, /env\(safe-area-inset-top\)/);
    assert.match(styles, /\.analog-clock\s*\{/);
    assert.equal((html.match(/class="clock-number number-/g) || []).length, 12);
    assert.match(styles, /@media \(max-aspect-ratio: 1\/1\)/);
    assert.match(styles, /\.products-gallery\s*\{/);
    assert.match(styles, /\.card-products\s*\{\s*grid-column:\s*span 6/s);
    assert.match(styles, /\.product-showcase-image\s*\{[^}]*object-fit:\s*cover/s);
    assert.match(styles, /grid-template-rows:\s*minmax\(0,\s*0\.78fr\)\s+minmax\(0,\s*1\.22fr\)/);
    assert.match(styles, /\.card-action-menu\[hidden\]\s*\{[^}]*display:\s*none !important;/);
    assert.match(styles, /\.card-action-menu:not\(\[hidden\]\)/);
    assert.match(html, /id="products-gallery"/);
    assert.match(html, /id="product-showcase-image"/);
    assert.match(html, /id="product-gallery-name"/);
    assert.match(html, /id="product-gallery-details"/);
    assert.match(html, /class="glass-card card-clock card-prayer tv-nav-card"/);
    assert.ok(html.indexOf('id="large-clock"') < html.indexOf('class="clock-analog-wrap"'));
    assert.ok(html.indexOf('class="clock-analog-wrap"') < html.indexOf('id="prayer-times-container"'));
    assert.doesNotMatch(html, /[٠-٩۰-۹]/);
    assert.match(html, /id="product-gallery-details"/);
    assert.match(html, /class="app-contact"[^>]*>71002141<\/span>/);
    assert.match(html, /id="background-cycle-btn"/);
    assert.match(html, /card-faith/);
    assert.match(html, /id="ramadan-countdown-days"/);
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), /dohatv-static-v9/);
    assert.doesNotMatch(html, /class="glass-card card-ramadan/);
    assert.doesNotMatch(html, /id="mosque-mode-btn"/);
    assert.match(html, /id="faith-carousel-indicator"/);
    assert.match(styles, /\.card-clock\.card-prayer\s*\{[^}]*grid-column:\s*span 8/s);
    assert.match(styles, /\.card-clock\.card-prayer \.clock-display-arabic\s*\{[^}]*font-size:\s*clamp\(36px,\s*3\.8vw,\s*64px\)/s);
    assert.match(styles, /\.card-clock\.card-prayer \.date-text,[\s\S]*?font-size:\s*clamp\(15px,\s*1\.35vw,\s*22px\)/);
    assert.match(styles, /\.faith-content-item blockquote,\s*\.faith-content-item \.dhikr-text\s*\{[^}]*font-size:\s*clamp\(22px,\s*2\.2vw,\s*40px\)/s);
    for (const background of ['doha-night', 'lusail', 'katara']) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'backgrounds', `${background}.svg`)));
        assert.ok(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8').includes(`./assets/backgrounds/${background}.svg`));
    }
    assert.match(html, /class="finance-status" id="finance-status" aria-live="polite"><\/div>/);
    assert.match(html, /class="glass-card card-weather tv-nav-card"[\s\S]*?class="finance-section"/);
    assert.doesNotMatch(html, /class="glass-card card-finance/);
    assert.doesNotMatch(html, /screensaver-overlay/);
    assert.match(html, /id="adhan-preview-btn"[^>]*aria-label="تشغيل الأذان للتجربة"/);
    assert.doesNotMatch(html.match(/<button id="adhan-preview-btn"[\s\S]*?<\/button>/)?.[0] || '', /تجربة الأذان/);

    const activity = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'qa', 'dohatv', 'app', 'MainActivity.kt'), 'utf8');
    assert.match(activity, /mediaPlaybackRequiresUserGesture = false/);
    assert.match(activity, /qmcquranradiolive\/quranradio\/playlist\.m3u8/);
    assert.match(activity, /https:\/\/stream\.radiojar\.com\/8s5u5tpdtwzuv/);
    assert.match(activity, /fun playQuranRadio\(stationId: String\)/);
    assert.match(activity, /MediaPlayer\(\)/);
    assert.match(activity, /fun onStop\(\)/);
    assert.match(activity, /window\.updateQuranRadioState/);

    const manifest = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
    assert.match(manifest, /RECEIVE_BOOT_COMPLETED/);
    assert.match(manifest, /android\.intent\.action\.BOOT_COMPLETED/);
    assert.match(manifest, /android:networkSecurityConfig="@xml\/network_security_config"/);
    const networkSecurity = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml'), 'utf8');
    assert.match(networkSecurity, /<base-config cleartextTrafficPermitted="false"/);
    assert.match(networkSecurity, /<domain includeSubdomains="true">radiojar\.com<\/domain>/);
});
