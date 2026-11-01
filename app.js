// Global State
let azanEnabled = true;
let quranRadioPlaying = false;
let mosqueModeActive = false;
let dhikrSecondsLeft = 60;
let dhikrIndex = 0;
let prayerTimings = null;
let idleTimer = null;
const IDLE_LIMIT = 15 * 60 * 1000; // 15 Minutes Idle

// Helper function to convert Western Arabic digits (0-9) to Eastern Arabic digits (٠-٩)
function toArabicDigits(str) {
    if (str === null || str === undefined) return '';
    const numMap = {'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩'};
    return String(str).replace(/[0-9]/g, w => numMap[w]);
}

// List of Authentic Rotating Dhikr
const rotatingDhikrList = [
    "«سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ»",
    "«لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العَلِيِّ العَظِيمِ»",
    "«أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ»",
    "«اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ»",
    "«لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ»",
    "«الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ»",
    "«سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ»",
    "«رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ»",
    "«اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ»",
    "«حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ»"
];

// Initialize Dashboard
function initDashboard() {
    setupThemeAndAudioControls();
    setupMosqueAndRadioControls();
    setupRemoteNavigation();
    setupIdleScreensaver();
    startClockAndTimers();
    setupDohaLandmarksRotatingBackground();
    setupProductShowcaseSlider();
    updateDailyContent();
    fetchPrayerTimes();
    fetchWeatherForecast();
    fetchFinancialRatesAndGold();

    const refreshBtn = document.getElementById('finance-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchFinancialRatesAndGold();
        });
    }

    // Auto-refresh financial rates every 15 minutes
    setInterval(fetchFinancialRatesAndGold, 15 * 60 * 1000);

    // Dhikr Rotation Timer (Every Second)
    setInterval(updateDhikrRotation, 1000);
}

// 1. Clock, Date, Friday Check, Time-of-Day Skyline
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

        // Screensaver Clock
        const screensaverClock = document.getElementById('screensaver-clock');
        if (screensaverClock) screensaverClock.innerText = toArabicDigits(`${hrsStr}:${mins} ${ampm}`);

        // Gregorian Date and Arabic Day Name
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

        // Check Friday Mode Banner
        const fridayBanner = document.getElementById('friday-banner');
        if (fridayBanner) {
            fridayBanner.style.display = (dayOfWeek === 5) ? 'block' : 'none';
        }

        // Dynamic Time-of-Day Background Switcher (Day, Sunset, Night)
        updateTimeOfDaySkyline(hours);

        // Update Ramadan Countdown
        updateRamadanCountdownDays(now);

        // Check Prayer Times every second
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
        const container = document.getElementById('ramadan-countdown-days');
        if (container) container.innerHTML = "<span class='days-label' style='color: var(--accent-gold);'>رمضان مبارك! 🌙</span>";
    }
}

// 2. Daily Quran Ayah, Hadith & Adhkar
function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor(((now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000)) / (1000 * 60 * 60 * 24));
}

function updateDailyContent() {
    const dayIndex = getDayOfYear();

    const ayahs = [
        "﴿ وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجاً وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ﴾ [سورة الطلاق: ٢-٣]",
        "﴿ إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُمْ مُحْسِنُونَ ﴾ [سورة النحل: ١٢٨]",
        "﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ﴾ [سورة البقرة: ٢٠١]",
        "﴿ وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ ﴾ [سورة البقرة: ١٨٦]",
        "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾ [سورة الرعد: ٢٨]"
    ];
    const ayahEl = document.getElementById('daily-ayah');
    if (ayahEl) ayahEl.innerText = ayahs[dayIndex % ayahs.length];

    const ahadith = [
        "«إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى» [صحيح البخاري]",
        "«مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ» [صحيح مسلم]",
        "«لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ» [متفق عليه]",
        "«الكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ» [صحيح البخاري ومسلم]",
        "«مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الجَنَّةِ» [صحيح مسلم]"
    ];
    const hadithEl = document.getElementById('daily-hadith');
    if (hadithEl) hadithEl.innerText = ahadith[dayIndex % ahadith.length];

    const hours = new Date().getHours();
    const adhkarEl = document.getElementById('time-based-adhkar');
    if (adhkarEl) {
        if (hours >= 5 && hours <= 11) {
            adhkarEl.innerText = "🌅 أذكار الصباح: «أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له»";
        } else if (hours >= 15 && hours <= 19) {
            adhkarEl.innerText = "🌆 أذكار المساء: «أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له»";
        } else {
            adhkarEl.innerText = "🤲 «اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ»";
        }
    }
}

// 3. Dhikr Rotation every 60 seconds
function updateDhikrRotation() {
    dhikrSecondsLeft--;
    if (dhikrSecondsLeft <= 0) {
        dhikrSecondsLeft = 60;
        dhikrIndex = (dhikrIndex + 1) % rotatingDhikrList.length;
    }
    const timerEl = document.getElementById('dhikr-timer');
    if (timerEl) timerEl.innerText = `${toArabicDigits(dhikrSecondsLeft)} ثانية`;

    const dhikrEl = document.getElementById('rotating-dhikr');
    if (dhikrEl) dhikrEl.innerText = rotatingDhikrList[dhikrIndex];
}

// 4. Financial Rates & Gold Prices Update (Live from Bank Exchange & Bullion APIs)
const STORAGE_KEY_FINANCE = 'dohatv_finance_cache';

async function fetchFinancialRatesAndGold() {
    const usdEgpEl = document.getElementById('rate-usd-egp');
    const qarEgpEl = document.getElementById('rate-qar-egp');
    const goldEgp24El = document.getElementById('gold-egp-24');
    const goldEgp21El = document.getElementById('gold-egp-21');
    const goldEgp18El = document.getElementById('gold-egp-18');
    const goldEgpPoundEl = document.getElementById('gold-egp-pound');
    const goldQar24El = document.getElementById('gold-qar-24');
    const goldQar21El = document.getElementById('gold-qar-21');
    const badge = document.getElementById('finance-update-badge');
    const noteEl = document.getElementById('finance-timestamp-note');

    // Default Fallbacks or Cached values
    let cached = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_FINANCE);
        if (raw) cached = JSON.parse(raw);
    } catch (_) {}

    let data = cached || {
        usdEgp: 56.09,
        qarEgp: 15.39,
        goldEgp24: 6962.25,
        goldEgp21: 6091.97,
        goldEgp18: 5221.69,
        goldEgpPound: 48735.76,
        goldQar24: 453.53,
        goldQar21: 396.84,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    function renderFinanceUI(d, isLive = true) {
        if (usdEgpEl) usdEgpEl.innerText = `${toArabicDigits(d.usdEgp.toFixed(2))} ج.م`;
        if (qarEgpEl) qarEgpEl.innerText = `${toArabicDigits(d.qarEgp.toFixed(2))} ج.م`;
        if (goldEgp24El) goldEgp24El.innerText = `${toArabicDigits(d.goldEgp24.toFixed(2))} ج.م`;
        if (goldEgp21El) goldEgp21El.innerText = `${toArabicDigits(d.goldEgp21.toFixed(2))} ج.م`;
        if (goldEgp18El) goldEgp18El.innerText = `${toArabicDigits(d.goldEgp18.toFixed(2))} ج.م`;
        if (goldEgpPoundEl) goldEgpPoundEl.innerText = `${toArabicDigits(d.goldEgpPound.toFixed(2))} ج.م`;
        if (goldQar24El) goldQar24El.innerText = `${toArabicDigits(d.goldQar24.toFixed(2))} ر.ق`;
        if (goldQar21El) goldQar21El.innerText = `${toArabicDigits(d.goldQar21.toFixed(2))} ر.ق`;

        if (badge) {
            badge.innerText = isLive ? "🟢 محدث لحظياً" : "🟡 آخر تحديث محفوظ";
            badge.style.color = isLive ? "var(--accent-emerald)" : "var(--accent-gold)";
        }
        if (noteEl && d.timestamp) {
            noteEl.innerText = `⚡ أسعار الصرف والذهب رسمياً (آخر تحديث: ${toArabicDigits(d.timestamp)})`;
        }
    }

    // Render immediately from cache/fallback
    renderFinanceUI(data, !!cached);

    try {
        if (badge) badge.innerText = "⏳ جاري التحديث...";

        // 1. Currency Rates (USD to EGP & QAR to EGP)
        let usdEgp = data.usdEgp;
        let qarEgp = data.qarEgp;

        const fxRes = await fetch('https://open.er-api.com/v6/latest/USD');
        const fxData = await fxRes.json();
        if (fxData && fxData.rates) {
            if (fxData.rates.EGP) usdEgp = fxData.rates.EGP;
            if (fxData.rates.EGP && fxData.rates.QAR) {
                qarEgp = fxData.rates.EGP / fxData.rates.QAR;
            }
        }

        // 2. Gold Bullion Rates (XAU: 1 troy ounce = 31.1034768 grams)
        let ounceEgp = 0;
        let ounceQar = 0;

        try {
            // Primary Gold API
            const goldRes = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json');
            const goldJson = await goldRes.json();
            if (goldJson && goldJson.xau) {
                ounceEgp = goldJson.xau.egp || (goldJson.xau.usd ? goldJson.xau.usd * usdEgp : 0);
                ounceQar = goldJson.xau.qar || (goldJson.xau.usd ? goldJson.xau.usd * 3.64 : 0);
            }
        } catch (e1) {
            console.warn("Primary gold API failed, trying fallback...", e1);
        }

        // Secondary fallback Gold API
        if (!ounceEgp || !ounceQar) {
            try {
                const altGoldRes = await fetch('https://api.gold-api.com/price/XAU');
                const altGoldJson = await altGoldRes.json();
                if (altGoldJson && altGoldJson.price) {
                    const ounceUsd = altGoldJson.price;
                    ounceEgp = ounceUsd * usdEgp;
                    ounceQar = ounceUsd * 3.64;
                }
            } catch (e2) {
                console.warn("Alternative gold API failed", e2);
            }
        }

        // Formulas:
        // سعر جرام الذهب عيار 24: سعر الأونصة ÷ 31.1035
        // سعر جرام الذهب عيار 21: عيار 24 × (21 / 24)
        // سعر جرام الذهب عيار 18: عيار 24 × (18 / 24)
        // سعر الجنيه الذهب: عيار 21 × 8
        const OUNCE_GRAMS = 31.1035;

        const goldEgp24 = ounceEgp ? (ounceEgp / OUNCE_GRAMS) : data.goldEgp24;
        const goldEgp21 = goldEgp24 * (21 / 24);
        const goldEgp18 = goldEgp24 * (18 / 24);
        const goldEgpPound = goldEgp21 * 8;

        const goldQar24 = ounceQar ? (ounceQar / OUNCE_GRAMS) : data.goldQar24;
        const goldQar21 = goldQar24 * (21 / 24);

        const currentNow = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const updatedData = {
            usdEgp,
            qarEgp,
            goldEgp24,
            goldEgp21,
            goldEgp18,
            goldEgpPound,
            goldQar24,
            goldQar21,
            timestamp: currentNow
        };

        // Save to cache
        try {
            localStorage.setItem(STORAGE_KEY_FINANCE, JSON.stringify(updatedData));
        } catch (_) {}

        renderFinanceUI(updatedData, true);
    } catch (err) {
        console.error("Finance fetch error:", err);
        renderFinanceUI(data, false);
    }
}

// 5. Prayer Times Fetching & Pre-Azan 15-Min Alert
async function fetchPrayerTimes() {
    try {
        const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Doha&country=Qatar&method=4');
        const data = await response.json();

        if (data && data.data) {
            prayerTimings = data.data.timings;
            const hijri = data.data.date.hijri;

            const hijriMonthAr = hijri.month.ar;
            const hijriStr = `${toArabicDigits(hijri.day)} ${hijriMonthAr} ${toArabicDigits(hijri.year)} هـ`;
            const hijriEl = document.getElementById('hijri-date-arabic');
            if (hijriEl) hijriEl.innerText = hijriStr;

            renderPrayerTimes();
        }
    } catch (e) {
        document.getElementById('prayer-times-container').innerHTML = "<span class='loading-text'>تعذر جلب أوقات الصلاة</span>";
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

    let html = "";
    prayers.forEach(p => {
        html += `
            <div class="prayer-box" id="prayer-box-${p.key}">
                <div class="prayer-name">${p.name}</div>
                <div class="prayer-time">${toArabicDigits(p.time)}</div>
            </div>
        `;
    });

    document.getElementById('prayer-times-container').innerHTML = html;
}

let lastTriggeredPrayer = "";

function checkCurrentAndNextPrayer(now) {
    const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const prayers = [
        { name: 'الفجر', time: prayerTimings.Fajr, key: 'Fajr' },
        { name: 'الظهر', time: prayerTimings.Dhuhr, key: 'Dhuhr' },
        { name: 'العصر', time: prayerTimings.Asr, key: 'Asr' },
        { name: 'المغرب', time: prayerTimings.Maghrib, key: 'Maghrib' },
        { name: 'العشاء', time: prayerTimings.Isha, key: 'Isha' }
    ];

    prayers.forEach(p => {
        const box = document.getElementById(`prayer-box-${p.key}`);
        if (box) box.className = "prayer-box";
    });

    let nextPrayer = null;

    for (let i = 0; i < prayers.length; i++) {
        if (prayers[i].time > currentStr) {
            nextPrayer = prayers[i];
            break;
        }
    }

    if (!nextPrayer) {
        nextPrayer = prayers[0];
    }

    if (nextPrayer) {
        const nextBox = document.getElementById(`prayer-box-${nextPrayer.key}`);
        if (nextBox) nextBox.classList.add('next');

        // Calculate minutes remaining for next prayer
        const [pMaxH, pMaxM] = nextPrayer.time.split(':').map(Number);
        const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), pMaxH, pMaxM);
        if (pDate < now) pDate.setDate(pDate.getDate() + 1);

        const diffMins = Math.floor((pDate - now) / (1000 * 60));

        const timerEl = document.getElementById('next-prayer-timer');
        if (timerEl) {
            if (diffMins <= 15 && diffMins > 0) {
                timerEl.innerText = `اقتربت صلاة ${nextPrayer.name} (باقي ${toArabicDigits(diffMins)} دقيقة)`;
                timerEl.style.borderColor = "var(--accent-gold)";
            } else {
                timerEl.innerText = `الصلاة القادمة: ${nextPrayer.name} (${toArabicDigits(nextPrayer.time)})`;
            }
        }
    }

    // Check exact Azan Time
    prayers.forEach(p => {
        if (p.time === currentStr && lastTriggeredPrayer !== p.key) {
            lastTriggeredPrayer = p.key;
            const currentBox = document.getElementById(`prayer-box-${p.key}`);
            if (currentBox) currentBox.classList.add('active');
            triggerPrayerAlert(p.name);
        }
    });
}

function triggerPrayerAlert(prayerName) {
    const banner = document.getElementById('prayer-alert-banner');
    if (!banner) return;
    banner.innerText = `🕌 حان الآن وقت صلاة ${prayerName} حسب توقيت الدوحة المحلي`;
    banner.style.display = 'block';

    if (azanEnabled) {
        const audio = document.getElementById('azan-audio');
        if (audio) {
            const muazzinSelect = document.getElementById('muazzin-select');
            if (muazzinSelect && muazzinSelect.value) {
                audio.src = muazzinSelect.value;
            }
            audio.play().catch(() => {});
        }
    }

    setTimeout(() => {
        banner.style.display = 'none';
    }, 20000);
}

// 6. Advanced Weather Forecast for Doha
async function fetchWeatherForecast() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.28&longitude=51.53&current_weather=true&hourly=apparent_temperature,uv_index&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
        const data = await response.json();

        if (data && data.current_weather) {
            const tempStr = `${toArabicDigits(Math.round(data.current_weather.temperature))}°م ☀️`;
            const weatherTempEl = document.getElementById('current-weather-temp');
            if (weatherTempEl) weatherTempEl.innerText = tempStr;

            const windStr = `الرياح: ${toArabicDigits(Math.round(data.current_weather.windspeed))} كم/س`;
            document.getElementById('weather-wind').innerText = windStr;
        }

        if (data && data.hourly) {
            const feels = data.hourly.apparent_temperature[0];
            const uv = data.hourly.uv_index[0];
            if (feels !== undefined) document.getElementById('weather-feels').innerText = `المحسوسة: ${toArabicDigits(Math.round(feels))}°م`;
            if (uv !== undefined) document.getElementById('weather-uv').innerText = `الأشعة UV: ${toArabicDigits(Math.round(uv))}`;
        }

        if (data && data.daily) {
            let forecastHTML = "";
            const days = ['اليوم', 'الغد', 'بعد الغد', 'الخميس', 'الجمعة'];

            for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
                let maxTemp = toArabicDigits(Math.round(data.daily.temperature_2m_max[i]));
                let minTemp = toArabicDigits(Math.round(data.daily.temperature_2m_min[i]));
                forecastHTML += `
                    <div class="weather-day-box">
                        <div class="weather-day-title">${days[i] || 'اليوم'}</div>
                        <div class="weather-temp">${maxTemp}° / ${minTemp}°</div>
                    </div>
                `;
            }
            document.getElementById('weather-forecast').innerHTML = forecastHTML;
        }
    } catch (e) {
        document.getElementById('weather-forecast').innerHTML = "<span class='loading-text'>تعذر جلب بيانات الطقس</span>";
    }
}

// 7. Mosque Mode and Live Quran Radio Setup
function setupMosqueAndRadioControls() {
    const quranBtn = document.getElementById('quran-radio-btn');
    const quranAudio = document.getElementById('quran-radio-audio');

    if (quranBtn && quranAudio) {
        quranBtn.addEventListener('click', () => {
            quranRadioPlaying = !quranRadioPlaying;
            const span = quranBtn.querySelector('span');
            if (quranRadioPlaying) {
                quranAudio.play().then(() => {
                    if (span) span.innerText = "إذاعة القرآن: تعمل";
                    quranBtn.classList.add('active');
                }).catch(() => {
                    if (span) span.innerText = "إذاعة القرآن: متعذرة";
                });
            } else {
                quranAudio.pause();
                if (span) span.innerText = "إذاعة القرآن";
                quranBtn.classList.remove('active');
            }
        });
    }

    const mosqueBtn = document.getElementById('mosque-mode-btn');
    if (mosqueBtn) {
        mosqueBtn.addEventListener('click', () => {
            mosqueModeActive = !mosqueModeActive;
            const span = mosqueBtn.querySelector('span');
            if (mosqueModeActive) {
                document.body.classList.add('mosque-mode-active');
                if (span) span.innerText = "وضع المصلى: مفعل";
                mosqueBtn.classList.add('active');
            } else {
                document.body.classList.remove('mosque-mode-active');
                if (span) span.innerText = "وضع المصلى";
                mosqueBtn.classList.remove('active');
            }
        });
    }
}

// 8. Theme and Audio Controls
function setupThemeAndAudioControls() {
    const themeBtns = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('dohatv_theme') || 'theme-glass';

    document.body.className = savedTheme;
    themeBtns.forEach(btn => {
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        btn.addEventListener('click', () => {
            const selectedTheme = btn.getAttribute('data-theme');
            document.body.className = selectedTheme;
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
                if (span) span.innerText = "الأذان: مفعل";
                azanBtn.style.borderColor = "rgba(0, 229, 255, 0.5)";
            } else {
                if (span) span.innerText = "الأذان: مكتوم";
                azanBtn.style.borderColor = "rgba(255, 59, 48, 0.5)";
                const audio = document.getElementById('azan-audio');
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            }
        });
    }

    const muazzinSelect = document.getElementById('muazzin-select');
    const savedMuazzin = localStorage.getItem('dohatv_muazzin');
    if (savedMuazzin && muazzinSelect) {
        muazzinSelect.value = savedMuazzin;
    }
    if (muazzinSelect) {
        muazzinSelect.addEventListener('change', (e) => {
            localStorage.setItem('dohatv_muazzin', e.target.value);
        });
    }
}

// 9. TV Remote Control D-Pad Navigation
function setupRemoteNavigation() {
    function getFocusableElements() {
        return Array.from(document.querySelectorAll('.tv-nav, .tv-nav-card, .glass-control-item, button, select, [tabindex="0"]'))
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
            const nextIndex = (currentIndex - 1 + navItems.length) % navItems.length;
            navItems[nextIndex].focus();
            e.preventDefault();
        } else if (key === 'ArrowLeft' || key === 'Left') {
            const nextIndex = (currentIndex + 1) % navItems.length;
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

// 10. 15-Minute Idle Screensaver Mode
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

// 11. Doha Landmark Backgrounds Rotation (Every 3 seconds crossfade)
function setupDohaLandmarksRotatingBackground() {
    const dohaImages = [
        'images/doha/corniche.svg',
        'images/doha/mia.svg',
        'images/doha/katara.svg',
        'images/doha/lusail.svg',
        'images/doha/fanar.svg'
    ];

    let currentBgIndex = 0;
    let activeLayer = 1;

    const bg1 = document.getElementById('doha-bg-1');
    const bg2 = document.getElementById('doha-bg-2');

    if (!bg1 || !bg2) return;

    bg1.style.backgroundImage = `url('${dohaImages[0]}')`;
    bg1.style.opacity = '1';
    bg2.style.opacity = '0';

    setInterval(() => {
        currentBgIndex = (currentBgIndex + 1) % dohaImages.length;
        const nextImg = dohaImages[currentBgIndex];

        if (activeLayer === 1) {
            bg2.style.backgroundImage = `url('${nextImg}')`;
            bg2.style.opacity = '1';
            bg1.style.opacity = '0';
            activeLayer = 2;
        } else {
            bg1.style.backgroundImage = `url('${nextImg}')`;
            bg1.style.opacity = '1';
            bg2.style.opacity = '0';
            activeLayer = 1;
        }
    }, 3000);
}

// 12. Perfect Weight Product Showcase Slider (Every 3 seconds transition)
function setupProductShowcaseSlider() {
    const products = [
        {
            name: "American Keto Advanced",
            sub: "كبسولات كيتو الأمريكية لحرق الدهون",
            tag: "الأكثر مبيعاً ⭐",
            desc: "تركيبة أمريكية متقدمة لتعزيز حرق الدهون وسد الشهية طبيعياً بأمان تام.",
            img: "images/products/prod_1.svg"
        },
        {
            name: "NaturaDiet Slim Gold",
            sub: "ناتشورادايت سليم للتخسيس الطبيعي",
            tag: "طبيعي 100% 🌿",
            desc: "مستخلصات أعشاب ونباتات طبيعية نقية لرفع معدل الأيض اليومي وتخسيس البطن.",
            img: "images/products/prod_2.svg"
        },
        {
            name: "Collagen Protein Plus",
            sub: "كولاجين وبروتين متكامل للرشاقة",
            tag: "صحة وجمال 💎",
            desc: "يحافظ على نضارة البشرة وشد الجسم والقضاء على الترهلات أثناء إنقاص الوزن.",
            img: "images/products/prod_3.svg"
        },
        {
            name: "Detox Cleanse Herbal Tea",
            sub: "شاي الديتوكس لتنقية الجسم وتصريف السوائل",
            tag: "نتائج سريعة 🍵",
            desc: "تنظيف طبيعي للجهاز الهضمي والتخلص من السوائل المحتبسة والانتفاخات بكفاءة.",
            img: "images/products/prod_4.svg"
        },
        {
            name: "L-Carnitine 3000 Max",
            sub: "إل-كارنتين لحرق الدهون وإنتاج الطاقة",
            tag: "طاقة ونشاط ⚡",
            desc: "يعزز حرق الشحوم العنيدة أثناء الأنشطة اليومية والتمارين الرياضية بدون تعب.",
            img: "images/products/prod_5.svg"
        },
        {
            name: "Perfect Weight Fiber",
            sub: "ألياف الشبع والامتلاء الطبيعية",
            tag: "بدون حرمان 🌾",
            desc: "كبسولات ألياف طبيعية تمنح إحساساً دائماً بالشبع والامتلاء لساعات طويلة.",
            img: "images/products/prod_6.svg"
        }
    ];

    let prodIndex = 0;
    const imgEl = document.getElementById('product-slide-img');
    const nameEl = document.getElementById('product-slide-name');
    const subEl = document.getElementById('product-slide-sub');
    const descEl = document.getElementById('product-slide-desc');
    const tagEl = document.getElementById('product-slide-tag');
    const badgeEl = document.getElementById('product-slide-badge');

    function renderProduct(index) {
        const p = products[index];
        if (!p) return;

        if (imgEl) {
            imgEl.style.opacity = '0';
            imgEl.style.transform = 'scale(0.95)';
            setTimeout(() => {
                imgEl.src = p.img;
                imgEl.style.opacity = '1';
                imgEl.style.transform = 'scale(1)';
            }, 200);
        }

        if (nameEl) nameEl.innerText = p.name;
        if (subEl) subEl.innerText = p.sub;
        if (descEl) descEl.innerText = p.desc;
        if (tagEl) tagEl.innerText = p.tag;
        if (badgeEl) badgeEl.innerText = `${toArabicDigits(index + 1)} / ${toArabicDigits(products.length)}`;
    }

    renderProduct(0);

    // Auto rotate every 3 seconds
    setInterval(() => {
        prodIndex = (prodIndex + 1) % products.length;
        renderProduct(prodIndex);
    }, 3000);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initDashboard);
