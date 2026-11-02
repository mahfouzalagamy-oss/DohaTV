// Global State
let azanEnabled = true;
let quranRadioPlaying = false;
let dhikrIndex = 0;
let faithContentIndex = 0;
let prayerTimings = null;
let idleTimer = null;
const IDLE_LIMIT = 15 * 60 * 1000;
const FINANCE_REFRESH_MS = 15 * 60 * 1000;
const ADHAN_REPOSITORY_URL = 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/b9180a2bb769f74cff8e378ef2cc7aaf8db5cd5b/';
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
    },
    qatar: {
        label: 'قطر — أحمد العمادي',
        file: 'Ahmad_Al_Amade_1_-_Qatar_(أحمد_العمادي_-_قطر).mp3'
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
    return source ? normalizeHttpsUrl(ADHAN_REPOSITORY_URL + encodeURIComponent(source.file)) : null;
}

function getSelectedAdhanUrl() {
    const sourceSelect = document.getElementById('adhan-source-select');
    if (!sourceSelect) {
        const legacyInput = document.getElementById('adhan-source-input');
        return normalizeHttpsUrl(legacyInput?.value?.trim() || '');
    }

    if (sourceSelect.value === 'custom') {
        const customInput = document.getElementById('adhan-custom-source-input');
        return normalizeHttpsUrl(customInput?.value?.trim() || '');
    }
    return getAdhanSourceUrl(sourceSelect.value);
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
    setupRemoteNavigation();
    setupIdleScreensaver();
    startClockAndTimers();
    updateDailyContent();
    showFaithContent(0);
    fetchPrayerTimes();
    fetchWeatherForecast();
    fetchFinancialRatesAndGold();
    setInterval(rotateFaithContent, 5000);
    setInterval(fetchFinancialRatesAndGold, FINANCE_REFRESH_MS);
}

function setupProductGallery() {
    const image = document.getElementById('product-showcase-image');
    const name = document.getElementById('product-gallery-name');
    const details = document.getElementById('product-gallery-details');
    const counter = document.getElementById('product-gallery-count');
    const emptyState = document.getElementById('products-empty-state');
    if (!image || PRODUCT_SLIDES.length === 0) return;

    let activeSlide = 0;
    const showSlide = index => {
        activeSlide = (index + PRODUCT_SLIDES.length) % PRODUCT_SLIDES.length;
        const slide = PRODUCT_SLIDES[activeSlide];
        image.src = slide.src;
        image.alt = slide.alt;
        if (name) name.innerText = slide.name;
        if (details) details.innerText = slide.details;
        if (counter) counter.innerText = `${toArabicDigits(activeSlide + 1)} / ${toArabicDigits(PRODUCT_SLIDES.length)}`;
        if (emptyState) emptyState.hidden = true;
        image.hidden = false;
    };

    image.addEventListener('error', () => {
        image.hidden = true;
        if (emptyState) emptyState.hidden = false;
        if (name) name.innerText = 'تعذر تحميل صورة المنتج';
        if (details) details.innerText = 'تحقق من ملفات معرض المنتجات.';
    });
    document.getElementById('product-gallery-prev')?.addEventListener('click', () => showSlide(activeSlide - 1));
    document.getElementById('product-gallery-next')?.addEventListener('click', () => showSlide(activeSlide + 1));
    showSlide(0);
    setInterval(() => showSlide(activeSlide + 1), 5000);
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
    const usdEgpEl = document.getElementById('rate-usd-egp');
    const goldEgpEl = document.getElementById('gold-egp-ounce');
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

    if (usdEgpEl) {
        usdEgpEl.innerText = rate === null ? 'غير متاح' : `${toArabicDigits(rate.toFixed(2))} ج.م`;
    }
    if (goldEgpEl) {
        goldEgpEl.innerText = rate === null || goldUsd === null
            ? 'غير متاح'
            : `${toArabicDigits((goldUsd * rate).toFixed(2))} ج.م`;
    }

    if (statusEl) {
        const failures = [];
        if (rateResult.status === 'rejected') failures.push('سعر الصرف');
        if (goldResult.status === 'rejected') failures.push('الذهب');
        statusEl.innerText = failures.length ? `تعذر تحديث: ${failures.join(' و')}` : '';
    }
}

async function fetchPrayerTimes() {
    try {
        const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Doha&country=Qatar&method=10');
        if (!response.ok) throw new Error(`Prayer-times request failed (${response.status})`);
        const data = await response.json();

        if (data?.code !== 200 || !data.data?.timings || !data.data?.date?.hijri) {
            throw new Error('Prayer-times response did not contain valid Qatar timings');
        }
        prayerTimings = data.data.timings;
        const hijri = data.data.date.hijri;

        const hijriMonthAr = hijri.month.ar;
        const hijriStr = `${toArabicDigits(hijri.day)} ${hijriMonthAr} ${toArabicDigits(hijri.year)} هـ`;
        const hijriEl = document.getElementById('hijri-date-arabic');
        if (hijriEl) hijriEl.innerText = hijriStr;

        renderPrayerTimes();
        checkCurrentAndNextPrayer(new Date());
    } catch (e) {
        console.error('Unable to load Doha prayer times:', e);
        const container = document.getElementById('prayer-times-container');
        if (container) container.innerHTML = "<span class='loading-text'>تعذر جلب أوقات الصلاة</span>";
    }
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

    if (quranBtn && quranAudio) {
        quranAudio.volume = 1;
        quranAudio.addEventListener('error', () => {
            quranRadioPlaying = false;
            const span = quranBtn.querySelector('span');
            if (span) span.innerText = 'إذاعة قطر: تعذر الاتصال';
            if (quranStatus) quranStatus.innerText = 'تعذر الاتصال ببث إذاعة قطر.';
            quranBtn.classList.remove('active');
        });
        quranBtn.addEventListener('click', () => {
            quranRadioPlaying = !quranRadioPlaying;
            const span = quranBtn.querySelector('span');
            if (quranRadioPlaying) {
                if (span) span.innerText = 'إذاعة قطر: جارٍ الاتصال';
                if (quranStatus) quranStatus.innerText = 'جارٍ الاتصال ببث إذاعة قطر...';
                quranAudio.load();
                quranAudio.play().then(() => {
                    if (!quranRadioPlaying) return;
                    if (span) span.innerText = 'إذاعة قطر: تعمل';
                    if (quranStatus) quranStatus.innerText = 'إذاعة قطر تعمل.';
                    quranBtn.classList.add('active');
                }).catch(() => {
                    if (!quranRadioPlaying) return;
                    quranRadioPlaying = false;
                    if (span) span.innerText = 'إذاعة قطر: تعذر الاتصال';
                    if (quranStatus) quranStatus.innerText = 'تعذر تشغيل بث إذاعة قطر.';
                    quranBtn.classList.remove('active');
                });
            } else {
                quranAudio.pause();
                if (span) span.innerText = 'إذاعة قطر';
                if (quranStatus) quranStatus.innerText = 'تم إيقاف إذاعة قطر.';
                quranBtn.classList.remove('active');
            }
        });
    }

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
    const customAdhanInput = document.getElementById('adhan-custom-source-input');
    const savedSourceId = localStorage.getItem('dohatv_adhan_source');
    const savedCustomUrl = normalizeHttpsUrl(
        localStorage.getItem('dohatv_adhan_custom_url') || localStorage.getItem('dohatv_adhan_url') || ''
    );
    const selectedSourceId = savedSourceId === 'custom' || ADHAN_SOURCES[savedSourceId]
        ? savedSourceId
        : savedCustomUrl ? 'custom' : 'qatar';

    if (adhanSourceSelect) adhanSourceSelect.value = selectedSourceId;
    if (customAdhanInput) {
        customAdhanInput.hidden = selectedSourceId !== 'custom';
        customAdhanInput.value = savedCustomUrl || '';
    }
    const initialAdhanUrl = getSelectedAdhanUrl();
    if (initialAdhanUrl && azanAudio) azanAudio.src = initialAdhanUrl;
    if (savedSourceId && savedSourceId !== 'custom' && !ADHAN_SOURCES[savedSourceId]) {
        localStorage.removeItem('dohatv_adhan_source');
        if (azanStatus) azanStatus.innerText = 'تم تجاهل اختيار أذان محفوظ غير صالح.';
    }

    if (adhanSourceSelect) {
        adhanSourceSelect.addEventListener('change', () => {
            const sourceId = ADHAN_SOURCES[adhanSourceSelect.value] ? adhanSourceSelect.value : 'custom';
            adhanSourceSelect.value = sourceId;
            localStorage.setItem('dohatv_adhan_source', sourceId);
            if (customAdhanInput) customAdhanInput.hidden = sourceId !== 'custom';

            const source = getSelectedAdhanUrl();
            if (source) {
                if (azanAudio) azanAudio.src = source;
                if (azanStatus) {
                    azanStatus.innerText = sourceId === 'custom'
                        ? 'تم حفظ مصدر الأذان المخصص.'
                        : `تم اختيار ${ADHAN_SOURCES[sourceId].label}.`;
                }
            } else {
                if (azanAudio) azanAudio.removeAttribute('src');
                if (azanStatus) azanStatus.innerText = 'أدخل رابط HTTPS مباشرًا لملف الأذان المخصص.';
                customAdhanInput?.focus();
            }
        });
    }
    if (customAdhanInput) {
        customAdhanInput.addEventListener('change', () => {
            const value = customAdhanInput.value.trim();
            const normalizedSource = normalizeHttpsUrl(value);
            if (!normalizedSource) {
                if (azanAudio) azanAudio.removeAttribute('src');
                if (azanStatus) azanStatus.innerText = 'استخدم رابط HTTPS صالحًا ومباشرًا لملف صوت الأذان.';
                return;
            }

            customAdhanInput.value = normalizedSource;
            localStorage.setItem('dohatv_adhan_source', 'custom');
            localStorage.setItem('dohatv_adhan_custom_url', normalizedSource);
            localStorage.setItem('dohatv_adhan_url', normalizedSource);
            if (adhanSourceSelect) adhanSourceSelect.value = 'custom';
            if (azanAudio) azanAudio.src = normalizedSource;
            if (azanStatus) azanStatus.innerText = 'تم حفظ مصدر الأذان. اضغط تجربة الأذان للتحقق من تشغيله.';
        });
    }
    if (azanAudio) {
        azanAudio.addEventListener('error', () => {
            if (azanStatus) azanStatus.innerText = 'تعذر تحميل ملف الأذان المحدد. تحقق من الرابط واتصال الإنترنت.';
        });
    }
    const previewAzanBtn = document.getElementById('adhan-preview-btn');
    if (previewAzanBtn) {
        previewAzanBtn.addEventListener('click', () => {
            const source = getSelectedAdhanUrl();
            if (!source || !azanAudio) {
                if (azanStatus) azanStatus.innerText = 'اختر مصدرًا أو أدخل رابط HTTPS صالحًا لملف صوت الأذان أولًا.';
                if (adhanSourceSelect?.value === 'custom') customAdhanInput?.focus();
                return;
            }
            azanAudio.src = source;
            azanAudio.load();
            azanAudio.play().then(() => {
                if (azanStatus) azanStatus.innerText = 'يعمل مصدر الأذان.';
            }).catch(() => {
                if (azanStatus) azanStatus.innerText = 'تعذر تشغيل مصدر الأذان. تحقق من صلاحية الرابط والسماح بتشغيل الصوت.';
            });
        });
    }
}

function setupRemoteNavigation() {
    function getFocusableElements() {
        return Array.from(document.querySelectorAll('.tv-nav, .tv-nav-card, button, select, [tabindex="0"]'))
            .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden');
    }

    let navItems = getFocusableElements();
    if (navItems.length > 0) {
        navItems[0].focus();
    }

    document.addEventListener('keydown', (e) => {
        resetIdleTimer();

        const screensaver = document.getElementById('screensaver-overlay');
        if (screensaver && screensaver.style.display !== 'none') {
            screensaver.style.display = 'none';
            return;
        }

        navItems = getFocusableElements();
        const activeElement = document.activeElement;
        let currentIndex = navItems.indexOf(activeElement);
        if (currentIndex === -1) currentIndex = 0;

        const key = e.key;

        if (key === 'ArrowRight' || key === 'Right') {
            const nextIndex = (currentIndex + 1) % navItems.length;
            navItems[nextIndex].focus();
            e.preventDefault();
        } else if (key === 'ArrowLeft' || key === 'Left') {
            const nextIndex = (currentIndex - 1 + navItems.length) % navItems.length;
            navItems[nextIndex].focus();
            e.preventDefault();
        } else if (key === 'ArrowDown' || key === 'Down') {
            const nextIndex = Math.min(navItems.length - 1, currentIndex + 3);
            navItems[nextIndex].focus();
            e.preventDefault();
        } else if (key === 'ArrowUp' || key === 'Up') {
            const nextIndex = Math.max(0, currentIndex - 3);
            navItems[nextIndex].focus();
            e.preventDefault();
        } else if (key === 'Enter' || key === 'Select' || e.keyCode === 13) {
            if (activeElement) {
                if (activeElement.tagName === 'SELECT') {
                    const select = activeElement;
                    const nextOpt = (select.selectedIndex + 1) % select.options.length;
                    select.selectedIndex = nextOpt;
                    select.dispatchEvent(new Event('change'));
                } else {
                    activeElement.click();
                }
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

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, true);
    });

    resetIdleTimer();
}

document.addEventListener('DOMContentLoaded', initDashboard);

window.addEventListener('beforeunload', () => {
    const quranAudio = document.getElementById('quran-radio-audio');
    if (quranAudio) quranAudio.pause();
});
