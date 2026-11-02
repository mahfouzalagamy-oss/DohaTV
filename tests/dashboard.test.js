const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function createDashboard(fetchImpl) {
    const elements = new Map();
    const storedValues = new Map();
    const requestedUrls = [];
    const intervalCalls = [];
    const document = {
        body: { classList: { add() {}, remove() {} } },
        addEventListener() {},
        querySelectorAll() { return []; },
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, {
                    classList: { add() {}, remove() {} },
                    style: {},
                    innerText: '',
                    innerHTML: '',
                    hidden: false,
                    listeners: {},
                    attributes: {},
                    src: '',
                    alt: '',
                    addEventListener(name, callback) { this.listeners[name] = callback; },
                    setAttribute(name, value) { this.attributes[name] = value; },
                    removeAttribute(name) { delete this[name]; },
                    querySelector() { return null; },
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
        window: { addEventListener() {} },
        localStorage: {
            getItem(key) { return storedValues.get(key) || null; },
            setItem(key, value) { storedValues.set(key, String(value)); },
            removeItem(key) { storedValues.delete(key); }
        },
        URL,
        fetch: url => {
            requestedUrls.push(url);
            return fetchImpl(url);
        },
        console: { error() {} },
        setInterval(callback, delay) { intervalCalls.push({ callback, delay }); },
        clearTimeout() {},
        setTimeout() {}
    });

    vm.runInContext(appSource, context);
    return { context, elements, storedValues, requestedUrls, intervalCalls };
}

test('renders the USD rate and XAU ounce in Egyptian pounds from live source responses', async () => {
    const dashboard = createDashboard(async url => ({
        ok: true,
        json: async () => url.includes('frankfurter.dev')
            ? { date: '2026-11-02', base: 'USD', quote: 'EGP', rate: 50 }
            : { symbol: 'XAU', currency: 'USD', price: 2500 }
    }));

    await vm.runInContext('fetchFinancialRatesAndGold()', dashboard.context);

    assert.equal(dashboard.requestedUrls[0], 'https://api.frankfurter.dev/v2/rate/usd/egp');
    assert.equal(dashboard.elements.get('rate-usd-egp').innerText, '٥٠.٠٠ ج.م');
    assert.equal(dashboard.elements.get('gold-egp-ounce').innerText, '١٢٥٠٠٠.٠٠ ج.م');
    assert.equal(dashboard.elements.get('finance-status').innerText, '');
});

test('keeps a valid exchange rate visible when the gold source is unavailable', async () => {
    const dashboard = createDashboard(async url => {
        if (url.includes('gold-api.com')) return { ok: false, status: 503 };
        return { ok: true, json: async () => ({ base: 'USD', quote: 'EGP', rate: 51.25 }) };
    });

    test('cycles the faith card through ayah, hadith, and dhikr every five seconds', () => {
        const dashboard = createDashboard(async () => { throw new Error('not used'); });

        vm.runInContext('showFaithContent(0)', dashboard.context);
        assert.equal(dashboard.elements.get('faith-ayah-card').hidden, false);
        assert.equal(dashboard.elements.get('faith-hadith-card').hidden, true);
        assert.equal(dashboard.elements.get('faith-carousel-indicator').innerText, '١ / ٣');

        vm.runInContext('rotateFaithContent()', dashboard.context);
        assert.equal(dashboard.elements.get('faith-ayah-card').hidden, true);
        assert.equal(dashboard.elements.get('faith-hadith-card').hidden, false);
        assert.equal(dashboard.elements.get('faith-carousel-indicator').innerText, '٢ / ٣');

        vm.runInContext('rotateFaithContent()', dashboard.context);
        assert.equal(dashboard.elements.get('faith-dhikr-card').hidden, false);
        assert.equal(dashboard.elements.get('faith-carousel-indicator').innerText, '٣ / ٣');

        assert.match(appSource, /setInterval\(rotateFaithContent,\s*5000\)/);
    });

    await vm.runInContext('fetchFinancialRatesAndGold()', dashboard.context);

    assert.equal(dashboard.elements.get('rate-usd-egp').innerText, '٥١.٢٥ ج.م');
    assert.equal(dashboard.elements.get('gold-egp-ounce').innerText, 'غير متاح');
    assert.match(dashboard.elements.get('finance-status').innerText, /الذهب/);
});

test('requests Doha prayer times with the verified Qatar calculation method', async () => {
    let requestedUrl = '';
    const dashboard = createDashboard(async url => {
        requestedUrl = url;
        return {
            ok: true,
            json: async () => ({
                code: 200,
                data: {
                    timings: { Fajr: '04:20', Dhuhr: '11:30', Asr: '14:45', Maghrib: '16:50', Isha: '18:20' },
                    date: { hijri: { day: '22', year: '1448', month: { ar: 'جمادى الأولى' } } }
                }
            })
        };
    });

    await vm.runInContext('fetchPrayerTimes()', dashboard.context);

    assert.match(requestedUrl, /city=Doha&country=Qatar&method=10/);
    assert.match(dashboard.elements.get('prayer-times-container').innerHTML, /٠٤:٢٠/);
    assert.match(dashboard.elements.get('hijri-date-arabic').innerText, /١٤٤٨/);
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

test('provides verified Qatar, Egypt, Mecca, and Medina adhan recordings', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });
    const sources = vm.runInContext(`({
        egypt: getAdhanSourceUrl('egypt'),
        makkah: getAdhanSourceUrl('makkah'),
        madinah: getAdhanSourceUrl('madinah'),
        qatar: getAdhanSourceUrl('qatar'),
        invalid: getAdhanSourceUrl('unknown')
    })`, dashboard.context);
    const repositoryCommit = 'b9180a2bb769f74cff8e378ef2cc7aaf8db5cd5b';

    for (const sourceId of ['egypt', 'makkah', 'madinah', 'qatar']) {
        assert.match(sources[sourceId], new RegExp(`^https://raw\\.githubusercontent\\.com/Kiwifu/adhan-mp3/${repositoryCommit}/`));
    }
    assert.match(decodeURIComponent(new URL(sources.egypt).pathname), /عبد_الباسط_عبد_الصمد/);
    assert.match(decodeURIComponent(new URL(sources.makkah).pathname), /الحرم_المكي/);
    assert.match(decodeURIComponent(new URL(sources.madinah).pathname), /المدينة_المنورة/);
    assert.match(decodeURIComponent(new URL(sources.qatar).pathname), /أحمد_العمادي/);
    assert.equal(sources.invalid, null);

    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    for (const sourceId of ['egypt', 'makkah', 'madinah', 'qatar']) {
        assert.match(html, new RegExp(`<option value="${sourceId}">`));
    }
});

test('selecting an adhan preset saves and plays the matching recording', () => {
    const dashboard = createDashboard(async () => { throw new Error('not used'); });

    vm.runInContext('setupThemeAndAudioControls()', dashboard.context);
    const sourceSelect = dashboard.elements.get('adhan-source-select');
    const audio = dashboard.elements.get('azan-audio');

    assert.equal(sourceSelect.value, 'qatar');
    assert.equal(audio.src, vm.runInContext("getAdhanSourceUrl('qatar')", dashboard.context));

    sourceSelect.value = 'madinah';
    sourceSelect.listeners.change();

    assert.equal(audio.src, vm.runInContext("getAdhanSourceUrl('madinah')", dashboard.context));
    assert.equal(dashboard.storedValues.get('dohatv_adhan_source'), 'madinah');
});

test('cycles through all uploaded product photos without cropping and supports manual navigation', () => {
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
    assert.equal(counter.innerText, '١ / ١١');
    assert.equal(dashboard.elements.get('product-gallery-name').innerText, slides[0].name);
    assert.equal(dashboard.elements.get('product-gallery-details').innerText, slides[0].details);
    assert.equal(dashboard.intervalCalls.at(-1).delay, 5000);
    dashboard.elements.get('product-gallery-next').listeners.click();
    assert.equal(image.src, slides[1].src);
    assert.equal(counter.innerText, '٢ / ١١');
    assert.equal(dashboard.elements.get('product-gallery-name').innerText, slides[1].name);
    assert.equal(dashboard.elements.get('product-gallery-details').innerText, slides[1].details);
    dashboard.elements.get('product-gallery-prev').listeners.click();
    assert.equal(image.src, slides[0].src);
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

    assert.equal(dashboard.elements.get('current-weather-temp').innerText, '🌧️ ٣٣°م');
    assert.equal(dashboard.elements.get('weather-feels').innerText, 'المحسوسة: ٣٥°م');
    assert.equal(dashboard.elements.get('weather-uv').innerText, 'الأشعة UV: ٢');
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
    assert.match(styles, /\.product-showcase-image\s*\{[^}]*object-fit:\s*contain/s);
    assert.match(styles, /grid-template-rows:\s*minmax\(0,\s*0\.9fr\)\s+minmax\(0,\s*1\.1fr\)/);
    assert.match(html, /id="products-gallery"/);
    assert.match(html, /id="product-showcase-image"/);
    assert.match(html, /id="product-gallery-name"/);
    assert.match(html, /id="product-gallery-details"/);
    assert.match(html, /card-faith/);
    assert.match(html, /id="ramadan-countdown-days"/);
    assert.doesNotMatch(html, /class="glass-card card-ramadan/);
    assert.doesNotMatch(html, /id="mosque-mode-btn"/);
    assert.match(html, /id="faith-carousel-indicator"/);
    assert.match(html, /id="finance-status" class="finance-status" aria-live="polite"><\/div>/);

    const activity = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'qa', 'dohatv', 'app', 'MainActivity.kt'), 'utf8');
    assert.match(activity, /mediaPlaybackRequiresUserGesture = false/);
});
