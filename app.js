// Global State
let azanEnabled = true;
let quranRadioPlaying = false;
let quranRadioStarting = false;
let dhikrIndex = 0;
let faithContentIndex = 0;
let productSlideIndex = 0;
let productRotationPaused = false;
let financeIndex = 0;
let financeValues = { usdEgp: null, goldEgp: null, goldUsd: null };
let prayerTimings = null;
let idleTimer = null;
const IDLE_LIMIT = 10 * 60 * 1000;
const FINANCE_REFRESH_MS = 15 * 60 * 1000;
const QATAR_PRAYER_TIMES_API = 'https://meiaservicesext.islam.gov.qa/ServicesBrokerGatewayAPI/api/PrayerTimes';
const ADHAN_SOURCES = Object.freeze({
    egypt: {
        label: 'مصر — عبد الباسط عبد الصمد',
        file: 'Abdulbasit_Abdusamad_1_-_Egypt_(عبد_الباسط_عبد_الصمد_-_مصر).mp3'
    },
    makkah: {
        label: 'مكة المكرمة — أذان الفجر',
        file: 'Adhan_Fajr_Al_Haram_Al_Maki_(أذان_الفجر_الحرم_المكي).mp3'
    },
    madinah: {
        label: 'المدينة المنورة — أذان الحرم',
        file: 'Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(أذان_الحرم_المدني_-_المدينة_المنورة).mp3'
    }
});
const PRODUCT_SLIDES = Object.freeze([
    { src: 'assets/products/keto-coffee-box.jpg', alt: 'علبة قهوة كيتو من Naturadiet', name: 'قهوة كيتو — Naturadiet', details: 'مزيج ٥ في ١؛ تذكر العبوة: MCT، جذر الماكا، القهوة الخضراء، الألياف، وشاي الماتشا.' },
    { src: 'assets/products/matcha-tea.jpg', alt: 'علبة شاي ماتشا من Naturadiet', name: 'شاي ماتشا — Naturadiet', details: 'شاي ماتشا في أكياس فردية؛ الوزن الظاهر على العبوة ١٫٥ جم.' },
    { src: 'assets/products/dnpr-chocolate-boxes.jpg', alt: 'علبتا شوكولاتة DNPR داكنة ولايت', name: 'شوكولاتة DNPR — داكنة ولايت', details: 'تظهر الصورة نوعَي Dark وLite؛ وزن العبوة الظاهر ٨٤ جم.' },
    { src: 'assets/products/dnpr-lite-chocolate.jpg', alt: 'علبة شوكولاتة DNPR لايت', name: 'شوكولاتة DNPR — Lite', details: 'شوكولاتة بنوع Lite؛ العبوة تعرض ٨٤ جم.' },
    { src: 'assets/products/coffee-and-chocolate.jpg', alt: 'قهوة كيتو وشوكولاتة DNPR', name: 'قهوة كيتو وشوكولاتة DNPR', details: 'صورة تجمع علبة قهوة كيتو مع شوكولاتة DNPR.' },
    { src: 'assets/products/perfect-plus.jpg', alt: 'علبة Perfect Plus بنكهة الأناناس', name: 'Perfect Plus — أناناس', details: 'نكهة الأناناس؛ العبوة تعرض ٤٠ كيسًا بوزن إجمالي ٢٤٠ جم.' },
    { src: 'assets/products/laperwa-coffee.jpg', alt: 'علبة قهوة Laperwa 2 في 1', name: 'قهوة Laperwa — ٢ في ١', details: 'قهوة مع مبيّض (Coffee & Creamer)؛ العبوة تعرض ٣٠ كيسًا.' },
    { src: 'assets/products/perfect-weight-range.jpg', alt: 'مجموعة منتجات Perfect Weight', name: 'مجموعة Perfect Weight', details: 'صورة تعريفية تضم مجموعة من منتجات Perfect Weight.' },
    { src: 'assets/products/perfect-plus-front.jpg', alt: 'علبة Perfect Plus من الأمام', name: 'Perfect Plus — صورة أمامية', details: 'صورة أمامية للعبوة بنكهة الأناناس، ٤٠ كيسًا و٢٤٠ جم حسب الملصق.' },
    { src: 'assets/products/keto-coffee-sachets.jpg', alt: 'أظرف قهوة كيتو وحبوب القهوة', name: 'أظرف قهوة كيتو', details: 'تذكر الأظرف: MCT، جذر الماكا، القهوة الخضراء، الألياف، وشاي الماتشا.' },
    { src: 'assets/products/perfect-plus-benefits.jpg', alt: 'صورة تعريفية بمنتج Perfect Plus', name: 'معلومات العبوة — Perfect Plus', details: 'يذكر الملصق: ٤ جم ألياف، خالٍ من الجلوتين، مُحلّى بالستيفيا، وبدون دهون أو سكريات.' }
]);

function toArabicDigits(str) {
    if (str === null || str === undefined) return '';
    const numMap = {'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩'};
    return String(str).replace(/[0-9]/g, w => numMap[w]);
}

function toMinutesFromTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function getWeatherIcon(code) {
    if (!Number.isFinite(code)) return '🌤️';
    if (code === 0) return '☀️';
    if (code <= 2) return '🌤️';
    if (code === 3) return '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 67 || (code >= 80 && code <= 82)) return '🌧️';
    if (code <= 77 || code === 85 || code === 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌤️';
}

function normalizeHttpsUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

function getAdhanSourceUrl(sourceId) {
    const source = ADHAN_SOURCES[sourceId];
    return source
        ? normalizeHttpsUrl(`https://raw.githubusercontent.com/Kiwifu/adhan-mp3/b9180a2bb769f74cff8e378ef2cc7aaf8db5cd5b/${encodeURIComponent(source.file)}`)
        : null;
}

function getSelectedAdhanUrl() {
    const sourceSelect = document.getElementById('adhan-source-select');
    return getAdhanSourceUrl(sourceSelect?.value || 'makkah');
}

const rotatingDhikrList = [
    '«سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ»',
    '«لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العَلِيِّ العَظِيمِ»',
    '«أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ»',
    '«اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
    '«لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ»',
    '«الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ»',
    '«سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ»',
    '«رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ»',
    '«اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ»',
    '«حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ»'
];

function syncAnalogClock(now) {
    const hourEl = document.getElementById('analog-hour');
    const minuteEl = document.getElementById('analog-minute');
    const secondEl = document.getElementById('analog-second');

    if (!hourEl || !minuteEl || !secondEl) return;

    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const hourDeg = (hours + minutes / 60 + seconds / 3600) * 30;
    const minuteDeg = (minutes + seconds / 60) * 6;
    const secondDeg = seconds * 6;

    hourEl.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    minuteEl.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
    secondEl.style.transform = `translateX(-50%) rotate(${secondDeg}deg)`;
}

function initDashboard() {
    setupThemeAndAudioControls();
    setupRadioControls();
    setupProductGallery();
    setupCardActions();
    setupRemoteNavigation();
    setupIdleScreensaver();
    startClockAndTimers();
    updateDailyContent();
    showFaithContent(0);
    fetchPrayerTimes();
    fetchWeatherForecast();
    fetchFinancialRatesAndGold();
    setInterval(rotateFaithContent, 5000);
    setInterval(rotateFinanceCard, 5000);
    setInterval(fetchFinancialRatesAndGold, FINANCE_REFRESH_MS);
}

function setupProductGallery() {
    const image = document.getElementById('product-showcase-image');
    if (!image || PRODUCT_SLIDES.length === 0) return;

    image.addEventListener('error', () => {
        image.hidden = true;
        const emptyState = document.getElementById('products-empty-state');
        if (emptyState) emptyState.hidden = false;
        const name = document.getElementById('product-gallery-name');
        if (name) name.innerText = 'تعذر تحميل صورة المنتج';
    });
    showProductSlide(0);
    setInterval(() => {
        if (!productRotationPaused) showProductSlide(productSlideIndex + 1);
    }, 5000);
}

function showProductSlide(index) {
    productSlideIndex = (index + PRODUCT_SLIDES.length) % PRODUCT_SLIDES.length;
    const slide = PRODUCT_SLIDES[productSlideIndex];
    const image = document.getElementById('product-showcase-image');
    const name = document.getElementById('product-gallery-name');
    const emptyState = document.getElementById('products-empty-state');
    if (image) {
        image.src = slide.src;
        image.alt = slide.alt;
        image.hidden = false;
    }
    if (name) name.innerText = slide.name;
    if (emptyState) emptyState.hidden = true;
}

function startClockAndTimers() {
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');

        const ampm = hours >= 12 ? 'م' : 'ص';
        const displayHours = hours % 12 ? hours % 12 : 12;
        const hrsStr = String(displayHours).padStart(2, '0');

        const timeFormatted = `${hrsStr}:${mins}:${secs} ${ampm}`;
        const clockEl = document.getElementById('large-clock');
        if (clockEl) {
            clockEl.innerText = toArabicDigits(timeFormatted);
        }

        const screensaverClock = document.getElementById('screensaver-clock');
        if (screensaverClock) screensaverClock.innerText = toArabicDigits(`${hrsStr}:${mins} ${ampm}`);

        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

        const dayOfWeek = now.getDay();
        const dayName = days[dayOfWeek];
        const dayNum = now.getDate();
        const monthName = months[now.getMonth()];
        const yearNum = now.getFullYear();

        const dayEl = document.getElementById('arabic-day-name');
        if (dayEl) dayEl.innerText = dayName;

        const gregEl = document.getElementById('gregorian-date-arabic');
        if (gregEl) gregEl.innerText = toArabicDigits(`${dayNum} ${monthName} ${yearNum} م`);

        const screensaverDate = document.getElementById('screensaver-date');
        if (screensaverDate) screensaverDate.innerText = toArabicDigits(`${dayName}، ${dayNum} ${monthName} ${yearNum} م`);

        const fridayBanner = document.getElementById('friday-banner');
        if (fridayBanner) {
            fridayBanner.style.display = (dayOfWeek === 5) ? 'block' : 'none';
        }

        updateTimeOfDaySkyline(hours);
        updateRamadanCountdownDays(now);
        syncAnalogClock(now);

        if (prayerTimings) {
            checkCurrentAndNextPrayer(now);
        }
    }

    updateClock();
    setInterval(updateClock, 1000);
}

function updateTimeOfDaySkyline(hours) {
    document.body.classList.remove('time-day', 'time-sunset', 'time-night');
    if (hours >= 6 && hours < 16) {
        document.body.classList.add('time-day');
    } else if (hours >= 16 && hours < 18) {
        document.body.classList.add('time-sunset');
    } else {
        document.body.classList.add('time-night');
    }
}

function updateRamadanCountdownDays(now) {
    let ramadanYear = now.getFullYear();
    let ramadanTarget = new Date(`${ramadanYear}-02-28T00:00:00`);
    if (now > ramadanTarget) {
        ramadanTarget = new Date(`${ramadanYear + 1}-02-18T00:00:00`);
    }

    const diff = ramadanTarget - now;
    const daysValEl = document.getElementById('ramadan-days-value');
    if (diff > 0) {
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (daysValEl) daysValEl.innerText = toArabicDigits(days);
    } else {
        const label = document.querySelector('#ramadan-countdown-days .days-label');
        if (label) label.innerText = 'رمضان مبارك';
        if (daysValEl) daysValEl.hidden = true;
    }
}

function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor(((now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000)) / (1000 * 60 * 60 * 24));
}

function updateDailyContent() {
    const dayIndex = getDayOfYear();
    dhikrIndex = 0;

    const ayahs = [
        '﴿ وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجاً وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ﴾ [الطلاق]',
        '﴿ إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُمْ مُحْسِنُونَ ﴾ [النحل]',
        '﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ﴾ [البقرة]',
        '﴿ وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ ﴾ [البقرة]',
        '﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾ [الرعد]'
    ];
    const ayahEl = document.getElementById('daily-ayah');
    if (ayahEl) ayahEl.innerText = ayahs[dayIndex % ayahs.length];

    const ahadith = [
        '«إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى» [صحيح البخاري]',
        '«مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ ليَصْمُتْ» [صحيح مسلم]',
        '«لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ» [متفق عليه]',
        '«الكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ» [متفق عليه]',
        '«مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الجَنَّةِ» [رواه مسلم]'
    ];
    const hadithEl = document.getElementById('daily-hadith');
    if (hadithEl) hadithEl.innerText = ahadith[dayIndex % ahadith.length];

    const hours = new Date().getHours();
    const dhikrEl = document.getElementById('rotating-dhikr');
    if (dhikrEl) dhikrEl.innerText = rotatingDhikrList[dhikrIndex];
    const adhkarEl = document.getElementById('time-based-adhkar');
    if (adhkarEl) {
        if (hours >= 5 && hours <= 11) {
            adhkarEl.innerText = '🌅 أذكار الصباح: «أصبحنا وأصبح الملك لله، والحمد لله»';
        } else if (hours >= 15 && hours <= 19) {
            adhkarEl.innerText = '🌆 أذكار المساء: «أمسينا وأمسى الملك لله، والحمد لله»';
        } else {
            adhkarEl.innerText = '🤲 «اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ»';
        }
    }
}

function updateDhikrRotation() {
    const dhikrEl = document.getElementById('rotating-dhikr');
    if (dhikrEl) dhikrEl.innerText = rotatingDhikrList[dhikrIndex];
}

function showFaithContent(index) {
    const cards = ['faith-ayah-card', 'faith-hadith-card', 'faith-dhikr-card'];
    faithContentIndex = (index + cards.length) % cards.length;
    cards.forEach((id, cardIndex) => {
        const card = document.getElementById(id);
        if (card) {
            card.hidden = cardIndex !== faithContentIndex;
            card.setAttribute('aria-hidden', String(cardIndex !== faithContentIndex));
        }
    });
    const indicator = document.getElementById('faith-carousel-indicator');
    if (indicator) indicator.innerText = `${toArabicDigits(faithContentIndex + 1)} / ${toArabicDigits(cards.length)}`;
}

function rotateFaithContent() {
    const nextIndex = (faithContentIndex + 1) % 3;
    if (nextIndex === 2) {
        dhikrIndex = (dhikrIndex + 1) % rotatingDhikrList.length;
        updateDhikrRotation();
    }
    showFaithContent(nextIndex);
}

async function fetchFinancialRatesAndGold() {
    const statusEl = document.getElementById('finance-status');
    const rateRequest = fetch('https://api.frankfurter.dev/v2/rate/usd/egp')
        .then(async response => {
            if (!response.ok) throw new Error(`Exchange-rate request failed (${response.status})`);
            const data = await response.json();
            const rate = data?.rate;
            if (data?.base !== 'USD' || data?.quote !== 'EGP' || !Number.isFinite(rate) || rate <= 0) {
                throw new Error('Exchange-rate response did not contain a valid EGP rate');
            }
            return rate;
        });
    const goldRequest = fetch('https://api.gold-api.com/price/XAU')
        .then(async response => {
            if (!response.ok) throw new Error(`Gold-price request failed (${response.status})`);
            const data = await response.json();
            if (!Number.isFinite(data?.price) || data.price <= 0) {
                throw new Error('Gold-price response did not contain a valid ounce price');
            }
            return data.price;
        });

    const [rateResult, goldResult] = await Promise.allSettled([rateRequest, goldRequest]);
    const rate = rateResult.status === 'fulfilled' ? rateResult.value : null;
    const goldUsd = goldResult.status === 'fulfilled' ? goldResult.value : null;
    financeValues = {
        usdEgp: rate === null ? null : `${toArabicDigits(rate.toFixed(2))} ج.م`,
        goldEgp: rate === null || goldUsd === null
            ? null
            : `${toArabicDigits((goldUsd * rate).toFixed(2))} ج.م`,
        goldUsd: goldUsd === null ? null : `${toArabicDigits(goldUsd.toFixed(2))} $`
    };

    if (statusEl) {
        const failures = [];
        if (rateResult.status === 'rejected') failures.push('سعر الصرف');
        if (goldResult.status === 'rejected') failures.push('الذهب');
        statusEl.innerText = failures.length ? `تعذر تحديث: ${failures.join(' و')}` : '';
    }
    renderFinanceCard();
}

function renderFinanceCard() {
    const items = [
        { label: 'سعر الدولار بالجنيه المصري', value: financeValues.usdEgp },
        { label: 'سعر أونصة الذهب بالجنيه المصري', value: financeValues.goldEgp },
        { label: 'سعر أونصة الذهب بالدولار', value: financeValues.goldUsd }
    ];
    const item = items[financeIndex];
    const labelEl = document.getElementById('finance-label');
    const valueEl = document.getElementById('finance-value');
    if (labelEl) labelEl.innerText = item.label;
    if (valueEl) valueEl.innerText = item.value || 'غير متاح';
}

function rotateFinanceCard() {
    financeIndex = (financeIndex + 1) % 3;
    renderFinanceCard();
}

async function fetchPrayerTimes() {
    try {
        const now = new Date();
        const date = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const response = await fetch(`${QATAR_PRAYER_TIMES_API}?date=${date}`);
        if (!response.ok) throw new Error(`Prayer-times request failed (${response.status})`);
        const data = await response.json();

        const prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        if (data?.gregorianDate?.date !== date.replaceAll('-', '/') ||
            !Array.isArray(data?.times) || !data?.hijriDate) {
            throw new Error('Qatar Awqaf response did not contain prayer times');
        }
        const officialTimings = Object.fromEntries(data.times.map(prayer => [
            prayer.prayerTimeName,
            prayer.time
        ]));
        const timings = Object.fromEntries(prayerKeys.map(key => [
            key,
            normalizeQatarPrayerTime(officialTimings[key])
        ]));
        if (prayerKeys.some(key => !timings[key])) {
            throw new Error('Qatar Awqaf response did not contain valid prayer times');
        }
        prayerTimings = timings;
        const hijri = data.hijriDate;

        const hijriMonthNames = [
            'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
            'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
        ];
        const hijriMonth = hijriMonthNames[Number(hijri.month) - 1];
        if (!hijri.day || !hijriMonth || !hijri.year) {
            throw new Error('Qatar Awqaf response did not contain a valid Hijri date');
        }
        const hijriStr = `${toArabicDigits(hijri.day)} ${hijriMonth} ${toArabicDigits(hijri.year)} هـ`;
        const hijriEl = document.getElementById('hijri-date-arabic');
        if (hijriEl) hijriEl.innerText = hijriStr;

        const sourceEl = document.getElementById('prayer-source-status');
        if (sourceEl) sourceEl.innerText = 'وزارة الأوقاف القطرية';
        renderPrayerTimes();
        checkCurrentAndNextPrayer(new Date());
    } catch (e) {
        console.error('Unable to load Qatar Awqaf prayer times:', e);
        const container = document.getElementById('prayer-times-container');
        if (container) container.innerHTML = "<span class='loading-text'>تعذر جلب مواقيت وزارة الأوقاف القطرية</span>";
        const sourceEl = document.getElementById('prayer-source-status');
        if (sourceEl) sourceEl.innerText = 'تعذر الاتصال';
    }
}

function normalizeQatarPrayerTime(time) {
    const hour = Number(time?.hour);
    const minute = Number(time?.minutes);
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23 &&
        Number.isInteger(minute) && minute >= 0 && minute <= 59) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    const match = time?.timeFormat?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let parsedHour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') parsedHour += 12;
    return `${String(parsedHour).padStart(2, '0')}:${match[2]}`;
}

function renderPrayerTimes() {
    if (!prayerTimings) return;

    const prayers = [
        { key: 'Fajr', name: 'الفجر', time: prayerTimings.Fajr },
        { key: 'Dhuhr', name: 'الظهر', time: prayerTimings.Dhuhr },
        { key: 'Asr', name: 'العصر', time: prayerTimings.Asr },
        { key: 'Maghrib', name: 'المغرب', time: prayerTimings.Maghrib },
        { key: 'Isha', name: 'العشاء', time: prayerTimings.Isha }
    ];

    let html = '';
    prayers.forEach(p => {
        html += `
            <div class="prayer-box" id="prayer-box-${p.key}">
                <div class="prayer-name">${p.name}</div>
                <div class="prayer-time">${toArabicDigits(p.time)}</div>
            </div>
        `;
    });

    const container = document.getElementById('prayer-times-container');
    if (container) container.innerHTML = html;
}

let lastTriggeredPrayer = '';

function checkCurrentAndNextPrayer(now) {
    if (!prayerTimings) return;

    const prayers = [
        { name: 'الفجر', time: prayerTimings.Fajr, key: 'Fajr' },
        { name: 'الظهر', time: prayerTimings.Dhuhr, key: 'Dhuhr' },
        { name: 'العصر', time: prayerTimings.Asr, key: 'Asr' },
        { name: 'المغرب', time: prayerTimings.Maghrib, key: 'Maghrib' },
        { name: 'العشاء', time: prayerTimings.Isha, key: 'Isha' }
    ];

    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    prayers.forEach((p) => {
        const box = document.getElementById(`prayer-box-${p.key}`);
        if (box) box.classList.remove('next', 'active');
    });

    let nextPrayer = null;
    let nextDiff = Number.MAX_SAFE_INTEGER;

    prayers.forEach((p) => {
        const prayerMinutes = toMinutesFromTime(p.time);
        const diff = prayerMinutes - currentMinutes;
        if (diff >= 0 && diff < nextDiff) {
            nextDiff = diff;
            nextPrayer = p;
        }
    });

    if (!nextPrayer) {
        nextPrayer = prayers[0];
    }

    if (nextPrayer) {
        const nextBox = document.getElementById(`prayer-box-${nextPrayer.key}`);
        if (nextBox) nextBox.classList.add('next');

        const prayerMinutes = toMinutesFromTime(nextPrayer.time);
        const diffMinutes = Math.max(0, Math.ceil(prayerMinutes - currentMinutes));
        const timerEl = document.getElementById('next-prayer-timer');
        if (timerEl) {
            if (diffMinutes <= 15 && diffMinutes > 0) {
                timerEl.innerText = `اقتربت صلاة ${nextPrayer.name} (باقي ${toArabicDigits(diffMinutes)} دقيقة)`;
                timerEl.style.borderColor = 'var(--accent-gold)';
            } else {
                timerEl.innerText = `الصلاة القادمة: ${nextPrayer.name} (${toArabicDigits(nextPrayer.time)})`;
                timerEl.style.borderColor = 'rgba(0, 229, 255, 0.3)';
            }
        }
    }

    let matchedPrayer = null;
    prayers.forEach((p) => {
        const prayerMinutes = toMinutesFromTime(p.time);
        const diff = Math.abs(currentMinutes - prayerMinutes);
        if (diff < 0.8) {
            matchedPrayer = p;
        }
    });

    if (matchedPrayer && lastTriggeredPrayer !== matchedPrayer.key) {
        lastTriggeredPrayer = matchedPrayer.key;
        const activeBox = document.getElementById(`prayer-box-${matchedPrayer.key}`);
        if (activeBox) activeBox.classList.add('active');
        triggerPrayerAlert(matchedPrayer.name);
    } else if (!matchedPrayer) {
        lastTriggeredPrayer = '';
    }
}

function triggerPrayerAlert(prayerName) {
    const banner = document.getElementById('prayer-alert-banner');
    if (!banner) return;
    banner.innerText = `🕌 حان الآن وقت صلاة ${prayerName} حسب توقيت الدوحة المحلي`;
    banner.style.display = 'block';

    if (azanEnabled) {
        const audio = document.getElementById('azan-audio');
        if (audio) {
            const source = getSelectedAdhanUrl();
            const status = document.getElementById('azan-status');
            if (!source) {
                if (status) status.innerText = 'اختر تسجيلًا للأذان أو أدخل رابط HTTPS صالحًا قبل موعد الصلاة.';
                return;
            }
            audio.src = source;
            audio.load();
            audio.play().then(() => {
                if (status) status.innerText = `يعمل تنبيه الأذان لصلاة ${prayerName}.`;
            }).catch(() => {
                if (status) status.innerText = 'تعذر تشغيل ملف الأذان. تحقق من توفر المصدر والسماح بتشغيل الصوت.';
            });
        }
    }

    setTimeout(() => {
        banner.style.display = 'none';
    }, 20000);
}

async function fetchWeatherForecast() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.28&longitude=51.53&current_weather=true&hourly=apparent_temperature,uv_index&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
        if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
        const data = await response.json();
        if (!data?.current_weather || !Number.isFinite(data.current_weather.temperature)) {
            throw new Error('Weather response did not contain valid current conditions');
        }

        const tempStr = `${getWeatherIcon(data.current_weather.weathercode)} ${toArabicDigits(Math.round(data.current_weather.temperature))}°م`;
        const weatherTempEl = document.getElementById('current-weather-temp');
        if (weatherTempEl) weatherTempEl.innerText = tempStr;

        if (Number.isFinite(data.current_weather.windspeed)) {
            const windStr = `الرياح: ${toArabicDigits(Math.round(data.current_weather.windspeed))} كم/س`;
            const windEl = document.getElementById('weather-wind');
            if (windEl) windEl.innerText = windStr;
        }

        if (data.hourly?.time?.length) {
            const currentHour = data.hourly.time.indexOf(data.current_weather.time);
            const hourIndex = Math.max(0, currentHour);
            const feels = data.hourly.apparent_temperature?.[hourIndex];
            const uv = data.hourly.uv_index?.[hourIndex];
            const feelsEl = document.getElementById('weather-feels');
            if (Number.isFinite(feels) && feelsEl) feelsEl.innerText = `المحسوسة: ${toArabicDigits(Math.round(feels))}°م`;
            const uvEl = document.getElementById('weather-uv');
            if (Number.isFinite(uv) && uvEl) uvEl.innerText = `الأشعة UV: ${toArabicDigits(Math.round(uv))}`;
        }

        if (data.daily?.time?.length && data.daily.temperature_2m_max?.length && data.daily.temperature_2m_min?.length) {
            let forecastHTML = '';
            const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

            for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
                const maxTemp = toArabicDigits(Math.round(data.daily.temperature_2m_max[i]));
                const minTemp = toArabicDigits(Math.round(data.daily.temperature_2m_min[i]));
                const [year, month, day] = data.daily.time[i].split('-').map(Number);
                const forecastDate = new Date(year, month - 1, day, 12);
                const dayLabel = i === 0 ? 'اليوم' : i === 1 ? 'الغد' : dayNames[forecastDate.getDay()];
                forecastHTML += `
                    <div class="weather-day-box">
                        <div class="weather-day-title">${dayLabel}</div>
                        <div class="weather-temp">${maxTemp}° / ${minTemp}°</div>
                    </div>
                `;
            }
            const forecastEl = document.getElementById('weather-forecast');
            if (forecastEl) forecastEl.innerHTML = forecastHTML;
        }
    } catch (e) {
        console.error('Unable to load Doha weather:', e);
        const currentTempEl = document.getElementById('current-weather-temp');
        const feelsEl = document.getElementById('weather-feels');
        const windEl = document.getElementById('weather-wind');
        const uvEl = document.getElementById('weather-uv');
        if (currentTempEl) currentTempEl.innerText = 'غير متاح';
        if (feelsEl) feelsEl.innerText = 'المحسوسة: غير متاح';
        if (windEl) windEl.innerText = 'الرياح: غير متاحة';
        if (uvEl) uvEl.innerText = 'الأشعة UV: غير متاحة';
        const forecastEl = document.getElementById('weather-forecast');
        if (forecastEl) forecastEl.innerHTML = "<span class='loading-text'>تعذر جلب بيانات الطقس حاليًا</span>";
    }
}

function setupRadioControls() {
    const quranBtn = document.getElementById('quran-radio-btn');
    const quranAudio = document.getElementById('quran-radio-audio');
    const quranStatus = document.getElementById('quran-radio-status');
    const nativeRadio = window.AndroidTV;

    if (quranBtn && quranAudio) {
        quranAudio.volume = 1;
        window.updateQuranRadioState = (isPlaying, message, isStarting = false) => {
            quranRadioPlaying = isPlaying;
            quranRadioStarting = isStarting;
            const span = quranBtn.querySelector('span');
            if (span) span.innerText = isPlaying || isStarting ? 'إيقاف إذاعة القرآن' : 'إذاعة القرآن الكريم';
            quranBtn.setAttribute('aria-pressed', String(isPlaying || isStarting));
            if (quranStatus) quranStatus.innerText = message;
            if (isPlaying || isStarting) quranBtn.classList.add('active');
            else quranBtn.classList.remove('active');
        };
        quranAudio.addEventListener('error', () => {
            if (nativeRadio) return;
            window.updateQuranRadioState(false, 'تعذر تشغيل بث إذاعة القرآن الكريم في قطر. تحقق من اتصال الإنترنت.');
        });
        quranBtn.addEventListener('click', () => {
            if (quranRadioPlaying || quranRadioStarting) {
                if (nativeRadio?.stopQuranRadio) {
                    nativeRadio.stopQuranRadio();
                } else {
                    quranAudio.pause();
                }
                window.updateQuranRadioState(false, 'تم إيقاف إذاعة القرآن الكريم.');
                return;
            }

            window.updateQuranRadioState(false, 'جارٍ الاتصال بإذاعة القرآن الكريم في قطر...', true);
            if (nativeRadio?.playQuranRadio) {
                nativeRadio.playQuranRadio();
                return;
            }
            quranAudio.load();
            quranAudio.play().then(() => {
                window.updateQuranRadioState(true, 'إذاعة القرآن الكريم في قطر تعمل.');
            }).catch(() => {
                window.updateQuranRadioState(false, 'تعذر تشغيل بث إذاعة القرآن الكريم في قطر. تحقق من اتصال الإنترنت.');
            });
        });

        if (nativeRadio?.playQuranRadio) {
            window.updateQuranRadioState(false, 'جارٍ الاتصال بإذاعة القرآن الكريم في قطر...', true);
            nativeRadio.playQuranRadio();
        }
    }
}

function setupCardActions() {
    document.getElementById('action-refresh-prayer')?.addEventListener('click', fetchPrayerTimes);
    document.getElementById('action-refresh-weather')?.addEventListener('click', fetchWeatherForecast);
    document.getElementById('action-next-faith')?.addEventListener('click', rotateFaithContent);
    document.getElementById('action-next-finance')?.addEventListener('click', rotateFinanceCard);
    document.getElementById('action-previous-product')?.addEventListener('click', () => {
        productSlideIndex = (productSlideIndex - 1 + PRODUCT_SLIDES.length) % PRODUCT_SLIDES.length;
        showProductSlide(productSlideIndex);
    });
    document.getElementById('action-next-product')?.addEventListener('click', () => {
        productSlideIndex = (productSlideIndex + 1) % PRODUCT_SLIDES.length;
        showProductSlide(productSlideIndex);
    });
    document.getElementById('action-toggle-products')?.addEventListener('click', event => {
        productRotationPaused = !productRotationPaused;
        event.currentTarget.innerText = productRotationPaused ? 'تشغيل التبديل' : 'إيقاف التبديل';
    });
}

function setupThemeAndAudioControls() {
    const themeBtns = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('dohatv_theme') || 'theme-glass';

    document.body.classList.remove('theme-glass', 'theme-dark', 'theme-islamic');
    document.body.classList.add(savedTheme);
    themeBtns.forEach(btn => {
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        btn.addEventListener('click', () => {
            const selectedTheme = btn.getAttribute('data-theme');
            document.body.classList.remove('theme-glass', 'theme-dark', 'theme-islamic');
            document.body.classList.add(selectedTheme);
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            localStorage.setItem('dohatv_theme', selectedTheme);
        });
    });

    const azanBtn = document.getElementById('azan-toggle-btn');
    if (azanBtn) {
        azanBtn.addEventListener('click', () => {
            azanEnabled = !azanEnabled;
            const span = azanBtn.querySelector('span');
            if (azanEnabled) {
                if (span) span.innerText = 'الأذان: مفعل';
                azanBtn.style.borderColor = 'rgba(0, 229, 255, 0.5)';
            } else {
                if (span) span.innerText = 'الأذان: مكتوم';
                azanBtn.style.borderColor = 'rgba(255, 59, 48, 0.5)';
                const audio = document.getElementById('azan-audio');
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                const status = document.getElementById('azan-status');
                if (status) status.innerText = 'تم كتم الأذان.';
            }
        });
    }

    const azanAudio = document.getElementById('azan-audio');
    const azanStatus = document.getElementById('azan-status');
    const adhanSourceSelect = document.getElementById('adhan-source-select');
    const savedSourceId = localStorage.getItem('dohatv_adhan_source');
    const selectedSourceId = ADHAN_SOURCES[savedSourceId] ? savedSourceId : 'makkah';

    if (adhanSourceSelect) adhanSourceSelect.value = selectedSourceId;
    const initialAdhanUrl = getSelectedAdhanUrl();
    if (initialAdhanUrl && azanAudio) azanAudio.src = initialAdhanUrl;
    if (savedSourceId && !ADHAN_SOURCES[savedSourceId]) {
        localStorage.removeItem('dohatv_adhan_source');
        if (azanStatus) azanStatus.innerText = 'تم تجاهل اختيار أذان محفوظ غير صالح.';
    }

    if (adhanSourceSelect) {
        adhanSourceSelect.addEventListener('change', () => {
            const sourceId = ADHAN_SOURCES[adhanSourceSelect.value] ? adhanSourceSelect.value : 'makkah';
            adhanSourceSelect.value = sourceId;
            localStorage.setItem('dohatv_adhan_source', sourceId);
            const source = getSelectedAdhanUrl();
            if (source) {
                if (azanAudio) azanAudio.src = source;
                if (azanStatus) azanStatus.innerText = `تم اختيار ${ADHAN_SOURCES[sourceId].label}. يتطلب التشغيل اتصالًا بالإنترنت.`;
            }
        });
    }
    if (azanAudio) {
        azanAudio.addEventListener('error', () => {
            if (azanStatus) azanStatus.innerText = 'تعذر تحميل تسجيل الأذان. تحقق من اتصال الإنترنت.';
        });
    }
    const previewAzanBtn = document.getElementById('adhan-preview-btn');
    if (previewAzanBtn) {
        previewAzanBtn.addEventListener('click', () => {
            const source = getSelectedAdhanUrl();
            if (!source || !azanAudio) {
                if (azanStatus) azanStatus.innerText = 'اختر أحد تسجيلات الأذان الثلاثة أولًا.';
                return;
            }
            azanAudio.src = source;
            azanAudio.load();
            azanAudio.play().then(() => {
                if (azanStatus) azanStatus.innerText = 'يعمل تسجيل الأذان. يتطلب التشغيل اتصالًا بالإنترنت.';
            }).catch(() => {
                if (azanStatus) azanStatus.innerText = 'تعذر تشغيل تسجيل الأذان. تحقق من اتصال الإنترنت ومستوى الصوت.';
            });
        });
    }
}

function setupRemoteNavigation() {
    function getFocusableElements() {
        return Array.from(document.querySelectorAll('.tv-nav, .tv-nav-card, button, select, [tabindex="0"]'))
            .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 &&
                getComputedStyle(el).visibility !== 'hidden');
    }

    let navItems = getFocusableElements();
    if (navItems.length > 0 && !document.activeElement) {
        navItems[0].focus();
    }

    document.addEventListener('keydown', (e) => {
        window.resetIdleTimer?.();

        const screensaver = document.getElementById('screensaver-overlay');
        if (screensaver && screensaver.style.display !== 'none') {
            screensaver.style.display = 'none';
            return;
        }

        navItems = getFocusableElements();
        const activeElement = document.activeElement;
        const key = e.key;

        if (key === 'Escape' || key === 'Back') {
            const menu = activeElement?.closest?.('.card-action-menu');
            if (menu) {
                menu.hidden = true;
                menu.closest('.tv-nav-card')?.focus();
                e.preventDefault();
            }
            return;
        }

        if (key === 'ArrowRight' || key === 'Right' ||
            key === 'ArrowLeft' || key === 'Left' ||
            key === 'ArrowDown' || key === 'Down' ||
            key === 'ArrowUp' || key === 'Up') {
            if (!activeElement || activeElement.tagName === 'SELECT') return;
            const direction = key.endsWith('Right') || key === 'Right' ? 'right'
                : key.endsWith('Left') || key === 'Left' ? 'left'
                    : key.endsWith('Down') || key === 'Down' ? 'down' : 'up';
            const currentRect = activeElement.getBoundingClientRect();
            const currentX = currentRect.left + currentRect.width / 2;
            const currentY = currentRect.top + currentRect.height / 2;
            const isHorizontal = direction === 'left' || direction === 'right';
            const sign = direction === 'right' || direction === 'down' ? 1 : -1;
            let nearest = null;
            let nearestScore = Infinity;

            navItems.forEach(candidate => {
                if (candidate === activeElement) return;
                const rect = candidate.getBoundingClientRect();
                const dx = rect.left + rect.width / 2 - currentX;
                const dy = rect.top + rect.height / 2 - currentY;
                const forward = (isHorizontal ? dx : dy) * sign;
                if (forward <= 1) return;
                const cross = Math.abs(isHorizontal ? dy : dx);
                const score = forward + cross * 1.5;
                if (score < nearestScore) {
                    nearest = candidate;
                    nearestScore = score;
                }
            });
            if (nearest) {
                nearest.focus();
                e.preventDefault();
            }
        } else if (key === 'Enter' || key === 'Select' || e.keyCode === 13) {
            if (activeElement?.classList?.contains('tv-nav-card')) {
                const menu = activeElement.querySelector('.card-action-menu');
                if (menu) {
                    menu.hidden = false;
                    menu.querySelector('button')?.focus();
                }
            } else if (activeElement) {
                activeElement.click();
            }
            e.preventDefault();
        }
    });
}

function setupIdleScreensaver() {
    function showScreensaver() {
        const screensaver = document.getElementById('screensaver-overlay');
        if (screensaver) screensaver.style.display = 'flex';
    }

    window.resetIdleTimer = function() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(showScreensaver, IDLE_LIMIT);
    };
    const resetIdleTimer = window.resetIdleTimer;

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, true);
    });

    resetIdleTimer();
}

document.addEventListener('DOMContentLoaded', initDashboard);

window.addEventListener('beforeunload', () => {
    const quranAudio = document.getElementById('quran-radio-audio');
    if (quranAudio) quranAudio.pause();
    window.AndroidTV?.stopQuranRadio?.();
});
