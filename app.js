// Global State
let azanEnabled = true;
let quranRadioPlaying = false;
let mosqueModeActive = false;
let dhikrSecondsLeft = 60;
let dhikrIndex = 0;
let prayerTimings = null;
let idleTimer = null;
const IDLE_LIMIT = 15 * 60 * 1000;

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
    setupMosqueAndRadioControls();
    setupRemoteNavigation();
    setupIdleScreensaver();
    startClockAndTimers();
    updateDailyContent();
    fetchPrayerTimes();
    fetchWeatherForecast();
    fetchFinancialRatesAndGold();
    setInterval(updateDhikrRotation, 1000);
    setInterval(fetchFinancialRatesAndGold, 60000);
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
        const container = document.getElementById('ramadan-countdown-days');
        if (container) container.innerHTML = "<span class='days-label' style='color: var(--accent-gold);'>رمضان مبارك! 🌙</span>";
    }
}

function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor(((now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000)) / (1000 * 60 * 60 * 24));
}

function updateDailyContent() {
    const dayIndex = getDayOfYear();

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

async function fetchFinancialRatesAndGold() {
    const usdEgpEl = document.getElementById('rate-usd-egp');
    const goldQar24El = document.getElementById('gold-qar-24');

    if (usdEgpEl) usdEgpEl.innerText = `${toArabicDigits('56.09')} ج.م`;
    if (goldQar24El) goldQar24El.innerText = `${toArabicDigits('473')} ر.ق`;
}

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
            checkCurrentAndNextPrayer(new Date());
        }
    } catch (e) {
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

async function fetchWeatherForecast() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.28&longitude=51.53&current_weather=true&hourly=apparent_temperature,uv_index&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
        const data = await response.json();

        if (data && data.current_weather) {
            const tempStr = `${toArabicDigits(Math.round(data.current_weather.temperature))}°م ☀️`;
            const weatherTempEl = document.getElementById('current-weather-temp');
            if (weatherTempEl) weatherTempEl.innerText = tempStr;

            const windStr = `الرياح: ${toArabicDigits(Math.round(data.current_weather.windspeed))} كم/س`;
            const windEl = document.getElementById('weather-wind');
            if (windEl) windEl.innerText = windStr;
        }

        if (data && data.hourly) {
            const feels = data.hourly.apparent_temperature[0];
            const uv = data.hourly.uv_index[0];
            const feelsEl = document.getElementById('weather-feels');
            if (feels !== undefined && feelsEl) feelsEl.innerText = `المحسوسة: ${toArabicDigits(Math.round(feels))}°م`;
            const uvEl = document.getElementById('weather-uv');
            if (uv !== undefined && uvEl) uvEl.innerText = `الأشعة UV: ${toArabicDigits(Math.round(uv))}`;
        }

        if (data && data.daily) {
            let forecastHTML = '';
            const days = ['اليوم', 'الغد', 'بعد الغد', 'الخميس', 'الجمعة'];

            for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
                const maxTemp = toArabicDigits(Math.round(data.daily.temperature_2m_max[i]));
                const minTemp = toArabicDigits(Math.round(data.daily.temperature_2m_min[i]));
                forecastHTML += `
                    <div class="weather-day-box">
                        <div class="weather-day-title">${days[i] || 'اليوم'}</div>
                        <div class="weather-temp">${maxTemp}° / ${minTemp}°</div>
                    </div>
                `;
            }
            const forecastEl = document.getElementById('weather-forecast');
            if (forecastEl) forecastEl.innerHTML = forecastHTML;
        }
    } catch (e) {
        const forecastEl = document.getElementById('weather-forecast');
        if (forecastEl) forecastEl.innerHTML = "<span class='loading-text'>تعذر جلب بيانات الطقس</span>";
    }
}

function setupMosqueAndRadioControls() {
    const quranBtn = document.getElementById('quran-radio-btn');
    const quranAudio = document.getElementById('quran-radio-audio');

    if (quranBtn && quranAudio) {
        quranBtn.addEventListener('click', () => {
            quranRadioPlaying = !quranRadioPlaying;
            const span = quranBtn.querySelector('span');
            if (quranRadioPlaying) {
                quranAudio.play().then(() => {
                    if (span) span.innerText = 'إذاعة القرآن: تعمل';
                    quranBtn.classList.add('active');
                }).catch(() => {
                    if (span) span.innerText = 'إذاعة القرآن: متعذرة';
                });
            } else {
                quranAudio.pause();
                if (span) span.innerText = 'إذاعة القرآن الكريم';
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
                if (span) span.innerText = 'وضع المصلى: مفعل';
                mosqueBtn.classList.add('active');
            } else {
                document.body.classList.remove('mosque-mode-active');
                if (span) span.innerText = 'وضع المصلى';
                mosqueBtn.classList.remove('active');
            }
        });
    }
}

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












































































































































































































































































































































a








































































































































































































































.

































































































n










































































































































n



























































































n


























n























n











n







































































































n
























n





















-n





n





n



n










n











n









n










n






n



n



n



n




n




n





n





n





n


n





n






n


n



n






n




n


n



n



n


n




n



n



n




n



n


n



n



n



n



n

n




n


n



n



n



n



n








n

n
n



n




n



n



n



n




n



n



n



n



n

n
n


n




n


n


n



n



n



n


n



n



n



n



n



n



n



n



n


n
n



n



n


n



n



n



n


n



n



n



n



n



n



n



n



n



n



n



n



n



n


n
n



n


n



n



n



n



n



n



n


n


n



n



n



n



n



n



n



n



n



n


n



n


n


n
n


n


n



n





n


n
n


n



n



n


n



n



n


n



n



n



n



n



n



n


n
n


n


n

n

n


n


n


n



n


n


n



n


n


n


n


n



n



n


n


n


n


n


n


n


n


n


n


n


n


n


n



n


n
n



n


n



n


n


n



n



n


n


n


n


n


n


n


n


n


n


n


n



n


n


n


n


n



n


n
n


n


n



n


n


n



n


n


n



n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n

n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n
n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n


n
a













































































n







n





























































































n




n










n








n

















n








n




n



n

















n








n















n




n








n










n















n
















n















n








n














n








n




n







n










n







n




n











n








n














n




n







n










n










n













n




n










n








n














n



n







n










n




n







n










n








n




n


n



n



n



n



n



n



n



n



n



n



n



n



n




n



n



n


n
n






n



n



n



n


n



n



n



n



n



n



n



n



n



n



n



n


n
n


n


n


n


n



n



n



n



n



n



n



n


n



n


n