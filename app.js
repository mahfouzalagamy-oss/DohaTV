// Global State
let azanEnabled = true;
let dhikrSecondsLeft = 60;
let dhikrIndex = 0;
let prayerTimings = null;
let currentHijriDateStr = "";

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
    startClockAndTimers();
    updateDailyContent();
    fetchPrayerTimes();
    fetchWeatherForecast();
    fetchTodayMatches();
    fetchAlJazeeraTextNews();

    // Dhikr Rotation Timer (Every Second)
    setInterval(updateDhikrRotation, 1000);
}

// 1. Clock, Date (Gregorian & Hijri), Ramadan Countdown
function startClockAndTimers() {
    function updateClock() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');

        document.getElementById('large-clock').innerText = `${hrs}:${mins}:${secs}`;

        // Gregorian Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('gregorian-date').innerText = now.toLocaleDateString('ar-QA', options);

        // Update Ramadan Countdown
        updateRamadanCountdown(now);

        // Check Prayer Times every second
        if (prayerTimings) {
            checkCurrentAndNextPrayer(now);
        }
    }

    updateClock();
    setInterval(updateClock, 1000);
}

function updateRamadanCountdown(now) {
    // Ramadan Target (Approximate or Next Ramadan date)
    let ramadanYear = now.getFullYear();
    // Assuming next Ramadan start estimated date
    let ramadanTarget = new Date(`${ramadanYear}-02-28T00:00:00`);
    if (now > ramadanTarget) {
        ramadanTarget = new Date(`${ramadanYear + 1}-02-18T00:00:00`);
    }

    const diff = ramadanTarget - now;
    if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        document.getElementById('ramadan-days').innerText = String(days).padStart(2, '0');
        document.getElementById('ramadan-hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('ramadan-minutes').innerText = String(minutes).padStart(2, '0');
        document.getElementById('ramadan-seconds').innerText = String(seconds).padStart(2, '0');
    } else {
        document.getElementById('ramadan-countdown').innerHTML = "<div style='color: var(--accent-gold); font-weight: bold;'>رمضان مبارك! تقبل الله منا ومنكم 🌙</div>";
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
        "﴿ وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ ﴾ [البقرة]",
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

    // Sub Adhkar based on time of day
    const hours = new Date().getHours();
    if (hours >= 5 && hours <= 11) {
        document.getElementById('time-based-adhkar').innerText = "🌅 أذكار الصباح: «أصبحنا وأصبح الملك لله، والحمد لله»";
    } else if (hours >= 15 && hours <= 19) {
        document.getElementById('time-based-adhkar').innerText = "🌇 أذكار المساء: «أمسينا وأمسى الملك لله، والحمد لله»";
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
    document.getElementById('dhikr-timer').innerText = `${dhikrSecondsLeft} ثانية`;
    document.getElementById('rotating-dhikr').innerText = rotatingDhikrList[dhikrIndex];
}

// 4. Prayer Times & Hijri Date Fetching
async function fetchPrayerTimes() {
    try {
        const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Doha&country=Qatar&method=4');
        const data = await response.json();

        if (data && data.data) {
            prayerTimings = data.data.timings;
            const hijri = data.data.date.hijri;

            // Set Hijri Date Display
            const hijriMonthAr = hijri.month.ar;
            currentHijriDateStr = `${hijri.day} ${hijriMonthAr} ${hijri.year} هـ`;
            document.getElementById('hijri-date').innerText = currentHijriDateStr;

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
                <div class="prayer-time">${p.time}</div>
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

    // Reset box classes
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
        nextPrayer = prayers[0]; // Next day's Fajr
    }

    // Highlight next prayer
    if (nextPrayer) {
        const nextBox = document.getElementById(`prayer-box-${nextPrayer.key}`);
        if (nextBox) nextBox.classList.add('next');
        document.getElementById('next-prayer-timer').innerText = `الصلاة القادمة: ${nextPrayer.name} (${nextPrayer.time})`;
    }

    // Trigger Azan Alert
    if (currentPrayerActive && lastTriggeredPrayer !== currentPrayerActive.key) {
        lastTriggeredPrayer = currentPrayerActive.key;
        const currentBox = document.getElementById(`prayer-box-${currentPrayerActive.key}`);
        if (currentBox) currentBox.classList.add('active');

        triggerPrayerAlert(currentPrayerActive.name);
    }
}

function triggerPrayerAlert(prayerName) {
    const banner = document.getElementById('prayer-alert-banner');
    banner.innerText = `🕌 حان الآن وقت صلاة ${prayerName} حسب توقيت الدوحة المحلي`;
    banner.style.display = 'block';

    if (azanEnabled) {
        const audio = document.getElementById('azan-audio');
        if (audio) {
            audio.play().catch(() => {
                console.log("Autoplay audio blocked or not supported");
            });
        }
    }

    setTimeout(() => {
        banner.style.display = 'none';
    }, 15000); // 15 seconds banner display
}

// 5. Today's Matches
async function fetchTodayMatches() {
    const matchesContainer = document.getElementById('matches-container');

    // Static fallback list with popular teams and competitions if live API is unavailable
    const fallbackMatches = [
        { league: "دوري أبطال أوروبا", home: "ريال مدريد", away: "مانشستر سيتي", time: "23:00", status: "اليوم" },
        { league: "الدوري الإنجليزي الممتاز", home: "ليفربول", away: "أرسنال", time: "19:30", status: "اليوم" },
        { league: "الدوري الإسباني", home: "برشلونة", away: "أتلتيكو مدريد", time: "22:00", status: "اليوم" },
        { league: "الدوري المصري الممتاز", home: "الأهلي", away: "الزمالك", time: "20:00", status: "اليوم" },
        { league: "دوري أبطال أفريقيا", home: "الوداد الرياضي", away: "الترجي التونسي", time: "18:00", status: "اليوم" }
    ];

    try {
        // Fetching from free TheSportsDB event schedule for popular events
        const response = await fetch('https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=' + new Date().toISOString().split('T')[0]);
        const data = await response.json();

        if (data && data.events && data.events.length > 0) {
            let html = "";
            const events = data.events.slice(0, 5); // Show top 5
            events.forEach(match => {
                html += `
                    <div class="match-item">
                        <div class="match-league">🏆 ${match.strLeague || 'مباراة مهمة'}</div>
                        <div class="match-teams">
                            <span>${match.strHomeTeam}</span>
                            <span>VS</span>
                            <span>${match.strAwayTeam}</span>
                        </div>
                        <div class="match-time-status">⏰ ${match.strTime ? match.strTime.substring(0,5) : 'اليوم'}</div>
                    </div>
                `;
            });
            matchesContainer.innerHTML = html;
        } else {
            renderFallbackMatches(fallbackMatches);
        }
    } catch (e) {
        renderFallbackMatches(fallbackMatches);
    }
}

function renderFallbackMatches(matches) {
    let html = "";
    matches.forEach(m => {
        html += `
            <div class="match-item">
                <div class="match-league">🏆 ${m.league}</div>
                <div class="match-teams">
                    <span>${m.home}</span>
                    <span style="color:var(--accent-gold)">ضد</span>
                    <span>${m.away}</span>
                </div>
                <div class="match-time-status">⏰ ${m.time} - ${m.status}</div>
            </div>
        `;
    });
    document.getElementById('matches-container').innerHTML = html;
}

// 6. Weather Forecast for Doha
async function fetchWeatherForecast() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.28&longitude=51.53&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
        const data = await response.json();

        if (data && data.current_weather) {
            document.getElementById('current-weather-temp').innerText = `${Math.round(data.current_weather.temperature)}°C ☀️`;
        }

        if (data && data.daily) {
            let forecastHTML = "";
            const days = ['اليوم', 'الغد', 'بعد الغد', 'الخميس', 'الجمعة'];

            for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
                let maxTemp = Math.round(data.daily.temperature_2m_max[i]);
                let minTemp = Math.round(data.daily.temperature_2m_min[i]);
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

// 7. AlJazeera Breaking Text News Ticker
async function fetchAlJazeeraTextNews() {
    try {
        const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.aljazeera.net/rss');
        const data = await response.json();
        if (data && data.items && data.items.length > 0) {
            let newsTitles = data.items.map(item => item.title).join("   ✦   ");
            document.getElementById('aljazeera-news-text').innerText = newsTitles;
        }
    } catch (e) {
        document.getElementById('aljazeera-news-text').innerText = "عاجل: شبكة الجزيرة الإخبارية - تغطية إخبارية مستمرة ومباشرة للأحداث العالمية والإقليمية.";
    }
}

// 8. Controls & Themes Setup
function setupThemeAndAudioControls() {
    // Theme Switcher Buttons
    const themeBtns = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('dohatv_theme') || 'theme-dark';

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

    // Azan Audio Toggle
    const azanBtn = document.getElementById('azan-toggle-btn');
    azanBtn.addEventListener('click', () => {
        azanEnabled = !azanEnabled;
        if (azanEnabled) {
            azanBtn.innerText = "🔊 صوت الأذان: مفعل";
            azanBtn.style.borderColor = "var(--accent-cyan)";
            azanBtn.style.color = "var(--accent-cyan)";
        } else {
            azanBtn.innerText = "🔇 صوت الأذان: مكتوم";
            azanBtn.style.borderColor = "var(--accent-red)";
            azanBtn.style.color = "var(--accent-red)";
            const audio = document.getElementById('azan-audio');
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initDashboard);
