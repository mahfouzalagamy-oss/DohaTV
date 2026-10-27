function initDashboard() {
    updateDateTimeAndRamadan();
    updateDailyContent();
    fetchPrayerTimes();
    fetchWeatherForecast();
    fetchAlJazeeraTextNews();
}

// 1. التاريخ الميلادي والعد التنازلي لرمضان
function updateDateTimeAndRamadan() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-header').innerText = now.toLocaleDateString('ar-QA', options);

    const ramadanTarget = new Date('2027-02-18T00:00:00'); 
    const diffDays = Math.ceil((ramadanTarget - now) / (1000 * 60 * 60 * 24));
    
    const ramadanElement = document.getElementById('ramadan-countdown');
    if (diffDays > 0) {
        ramadanElement.innerText = `متبقي على رمضان نحو ${diffDays} يوماً 🌙`;
    } else {
        ramadanElement.innerText = "بارك الله لكم في شهر رمضان المبارك 🌙";
    }
}

// حساب اليوم لتغيير الآيات والأحاديث
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
        "﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً ﴾ [البقرة]"
    ];
    document.getElementById('daily-ayah').innerText = ayahs[dayIndex % ayahs.length];

    const ahadith = [
        "«إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى» [البخاري]",
        "«مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ ليَصْمُتْ» [مسلم]",
        "«لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ» [متفق عليه]"
    ];
    document.getElementById('daily-hadith').innerText = ahadith[dayIndex % ahadith.length];

    const adhkar = [
        "«سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ»",
        "«اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي...»"
    ];
    document.getElementById('daily-adhkar').innerText = adhkar[dayIndex % adhkar.length];

    const minutes = new Date().getHours() * 60 + new Date().getMinutes();
    if (minutes >= 300 && minutes <= 660) {
        document.getElementById('time-based-adhkar').innerText = "🌅 أذكار الصباح: «أصبحنا وأصبح الملك لله...»";
    } else if (minutes >= 990 && minutes <= 1020) {
        document.getElementById('time-based-adhkar').innerText = "🌇 أذكار المساء: «أمسينا وأمسى الملك لله...»";
    } else {
        document.getElementById('time-based-adhkar').innerText = "🤲 «سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ العَظِيمِ»";
    }
}

// 2. مواقيت الصلاة (الدوحة) مع تنبيه لمدة 3 ثوانٍ عند وقت الصلاة
async function fetchPrayerTimes() {
    try {
        // استخدام واجهة API مجانية لمواقيت الصلاة لمدينة الدوحة
        const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Doha&country=Qatar&method=4');
        const data = await response.json();
        const timings = data.data.timings;

        const prayers = [
            { name: 'الفجر', time: timings.Fajr },
            { name: 'الظهر', time: timings.Dhuhr },
            { name: 'العصر', time: timings.Asr },
            { name: 'المغرب', time: timings.Maghrib },
            { name: 'العشاء', time: timings.Isha }
        ];

        let html = "";
        const now = new Date();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        prayers.forEach(p => {
            let isCurrent = p.time === currentTimeStr;
            if (isCurrent) {
                triggerPrayerAlert(p.name);
            }
            html += `<div style="background: ${isCurrent ? '#cc0000' : '#1a2238'}; padding: 6px 10px; border-radius: 6px;">
                <div style="color: #ffcc00; font-size: 13px;">${p.name}</div>
                <div style="font-weight: bold; font-size: 15px;">${p.time}</div>
            </div>`;
        });

        document.getElementById('prayer-times-container').innerHTML = html;
    } catch (e) {
        document.getElementById('prayer-times-container').innerHTML = "<span>تعذر تحميل أوقات الصلاة</span>";
    }
}

// إطلاق تنبيه مرئي وبارز لمدة 3 ثوانٍ عند دخول وقت الصلاة
function triggerPrayerAlert(prayerName) {
    const banner = document.getElementById('prayer-alert-banner');
    banner.innerText = `🚨 حان الآن وقت صلاة ${prayerName} تقبل الله طاعتكم`;
    banner.style.display = 'block';
    
    setTimeout(() => {
        banner.style.display = 'none';
    }, 3000); // يختفي التنبيه تلقائياً بعد 3 ثوانٍ
}

// 3. درجات الحرارة والطقس للأسبوع
async function fetchWeatherForecast() {
    try {
        let response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.28&longitude=51.53&daily=temperature_2m_max,temperature_2m_min&timezone=auto');
        let data = await response.json();
        
        let forecastHTML = "";
        const days = ['اليوم', 'الغد', 'بعد الغد', 'الخميس', 'الجمعة'];
        
        for (let i = 0; i < 5; i++) {
            let maxTemp = Math.round(data.daily.temperature_2m_max[i]);
            let minTemp = Math.round(data.daily.temperature_2m_min[i]);
            forecastHTML += `
                <div style="background: #1a2238; padding: 6px; border-radius: 6px; min-width: 50px;">
                    <div style="font-size: 12px; color: #ffcc00;">${days[i]}</div>
                    <div style="font-size: 15px; font-weight: bold;">${maxTemp}°/${minTemp}°</div>
                </div>
            `;
        }
        document.getElementById('weather-forecast').innerHTML = forecastHTML;
    } catch (e) {
        document.getElementById('weather-forecast').innerHTML = "<span>تعذر تحميل الطقس</span>";
    }
}

// 4. أخبار الجزيرة المكتوبة
async function fetchAlJazeeraTextNews() {
    try {
        let response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.aljazeera.net/rss');
        let data = await response.json();
        if (data && data.items && data.items.length > 0) {
            let newsTitles = data.items.map(item => item.title).join("   ***   ");
            document.getElementById('aljazeera-news-text').innerText = newsTitles;
        }
    } catch (e) {
        document.getElementById('aljazeera-news-text').innerText = "عاجل: شبكة الجزيرة الإخبارية - تغطية مكتوبة مستمرة على مدار الساعة.";
    }
}

initDashboard();
setInterval(fetchPrayerTimes, 60000); // تحديث فحص أوقات الصلاة كل دقيقة
setInterval(fetchAlJazeeraTextNews, 120000);
