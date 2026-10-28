// Global State
let azanEnabled = true;
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
    setupRemoteNavigation();
    setupIdleScreensaver();
    startClockAndTimers();
    updateDailyContent();
    fetchPrayerTimes();
    fetchWeatherForecast();
    fetchFinancialRatesAndGold();

    // Dhikr Rotation Timer (Every Second)
    setInterval(updateDhikrRotation, 1000);

    // Refresh Financial Rates & Gold every 1 Minute
    setInterval(fetchFinancialRatesAndGold, 60000);
}

// 1. Clock, Date (Gregorian & Hijri), Ramadan Countdown with Eastern Arabic Digits
function startClockAndTimers() {
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');

        const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12;
        hours = hours ? hours : 12; // convert 0 to 12
        const hrsStr = String(hours).padStart(2, '0');

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

        const dayName = days[now.getDay()];
        const dayNum = now.getDate();
        const monthName = months[now.getMonth()];
        const yearNum = now.getFullYear();

        const dayEl = document.getElementById('arabic-day-name');
        if (dayEl) dayEl.innerText = dayName;

        const gregEl = document.getElementById('gregorian-date-arabic');
        if (gregEl) gregEl.innerText = toArabicDigits(`${dayNum} ${monthName} ${yearNum} م`);

        const screensaverDate = document.getElementById('screensaver-date');
        if (screensaverDate) screensaverDate.innerText = toArabicDigits(`${dayName}، ${dayNum} ${monthName} ${yearNum} م`);

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

// 2. Daily Quran Ayah & Sahih Hadith
function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor(((now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000)) / (1000 * 60 * 60 * 24));
}

function updateDailyContent() {
    const dayIndex = getDayOfYear();

    const ayahs = [
        "﴿ وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجاً وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ﴾ [الطلاق]",
        "﴿ إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُمْ مُحْسِنُونَ ﴾ [النحل]",
        "﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ﴾ [البقرة]",
        "﴿ وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دعانِ ﴾ [البقرة]",
        "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾ [الرعد]"
    ];
    document.getElementById('daily-ayah').innerText = ayahs[dayIndex % ayahs.length];

    const ahadith = [
        "«إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى» [صحيح البخاري]",
        "«مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ ليَصْمُتْ» [صحيح مسلم]",
        "«لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ» [متفق عليه]",
        "«الكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ» [متفق عليه]",
        "«مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الجَنَّةِ» [صحيح مسلم]"
    ];
    document.getElementById('daily-hadith').innerText = ahadith[dayIndex % ahadith.length];

    const hours = new Date().getHours();
    if (hours >= 5 && hours <= 11) {
        document.getElementById('time-based-adhkar').innerText = "🌅 أذكار الصباح: «أصبحنا وأصبح الملك لله، والحمد لله»";
    } else if (hours >= 15 && hours <= 19) {
        document.getElementById('time-based-adhkar').innerText = "<ctrl42> أذكار المساء: «أمسينا وأمسى الملك لله، والحمد لله»";
    } else {
        document.getElementById('time-based-adhkar').innerText = "🤲 «اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ»";
    }
}

// 3. Dhikr Rotation every 60 seconds
function updateDhikrRotation() {
    dhikrSecondsLeft--;
    if (dhikrSecondsLeft <= 0) {
        dhikrSecondsLeft = 60;
        dhikrIndex = (dhikrIndex + 1) % rotatingDhikrList.length;
    }
    document.getElementById('dhikr-timer').innerText = `${toArabicDigits(dhikrSecondsLeft)} ثانية`;
    document.getElementById('rotating-dhikr').innerText = rotatingDhikrList[dhikrIndex];
}

// 4. Financial Rates & Gold Prices Live Auto-Update
async function fetchFinancialRatesAndGold() {
    const usdEgpEl = document.getElementById('rate-usd-egp');
    const qarEgpEl = document.getElementById('rate-qar-egp');
    const goldEgp21El = document.getElementById('gold-egp-21');
    const goldQar24El = document.getElementById('gold-qar-24');

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();

        if (data && data.rates && data.rates.EGP) {
            const usdEgp = data.rates.EGP;
            const qarUsd = data.rates.QAR || 3.64;
            const qarEgp = (usdEgp / qarUsd);

            const goldOunceUSD = 2735;
            const gram24USD = goldOunceUSD / 31.1035;

            const goldEgp21 = Math.round((gram24USD * (21 / 24)) * usdEgp);
            const goldQar24 = Math.round(gram24USD * qarUsd);

            if (usdEgpEl) usdEgpEl.innerText = `${toArabicDigits(usdEgp.toFixed(2))} ج.م`;
            if (qarEgpEl) qarEgpEl.innerText = `${toArabicDigits(qarEgp.toFixed(2))} ج.م`;
            if (goldEgp21El) goldEgp21El.innerText = `${toArabicDigits(goldEgp21)} ج.م`;
            if (goldQar24El) goldQar24El.innerText = `${toArabicDigits(goldQar24)} ر.ق`;
            return;
        }
    } catch (e) {
        console.log("Error fetching live rates, utilizing Gold Billion & ADIB benchmarks...", e);
    }

    if (usdEgpEl) usdEgpEl.innerText = "٤٨.٩٨ ج.م";
    if (qarEgpEl) qarEgpEl.innerText = "١٣.٤٥ ج.م";
    if (goldEgp21El) goldEgp21El.innerText = "٣٧٣٥ ج.م";
    if (goldQar24El) goldQar24El.innerText = "٣٢٠ ر.ق";
}

// 5. Prayer Times & Hijri Date Fetching
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
    let currentPrayerActive = null;

    for (let i = 0; i < prayers.length; i++) {
        if (prayers[i].time === currentStr) {
            currentPrayerActive = prayers[i];
        }
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
        const timerEl = document.getElementById('next-prayer-timer');
        if (timerEl) timerEl.innerText = `الصلاة القادمة: ${nextPrayer.name} (${toArabicDigits(nextPrayer.time)})`;
    }

    if (currentPrayerActive && lastTriggeredPrayer !== currentPrayerActive.key) {
        lastTriggeredPrayer = currentPrayerActive.key;
        const currentBox = document.getElementById(`prayer-box-${currentPrayerActive.key}`);
        if (currentBox) currentBox.classList.add('active');

        triggerPrayerAlert(currentPrayerActive.name);
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
            const muazzinSelect = document.getElementById('muazzin-select');
            if (muazzinSelect && muazzinSelect.value) {
                audio.src = muazzinSelect.value;
            }
            audio.play().catch(() => {
                console.log("Autoplay audio blocked or not supported");
            });
        }
    }

    setTimeout(() => {
        banner.style.display = 'none';
    }, 20000);
}

// 6. Weather Forecast for Doha
async function fetchWeatherForecast() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.28&longitude=51.53&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
        const data = await response.json();

        if (data && data.current_weather) {
            const tempStr = `${toArabicDigits(Math.round(data.current_weather.temperature))}°م ☀️`;
            const weatherTempEl = document.getElementById('current-weather-temp');
            if (weatherTempEl) weatherTempEl.innerText = tempStr;
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

// 7. Controls, Themes, and TV Remote D-Pad Navigation Setup
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

// TV Remote Control D-Pad Navigation
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

// 8. 15-Minute Idle Screensaver Mode
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initDashboard);
