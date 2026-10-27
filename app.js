// دالة لتحديد المحتوى المعروض بناءً على الوقت الحالي والشاشات الدورية
function getCurrentTvSlides() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    let dynamicSlides = [];

    // 1. أذكار الصباح (من 5:00 صباحاً [300 دقيقة] إلى 11:00 صباحاً [660 دقيقة])
    if (currentTimeInMinutes >= 300 && currentTimeInMinutes <= 660) {
        dynamicSlides.push({
            title: "🌅 أذكار الصباح المباركة (تلقائي حسب الوقت)",
            content: "• «أصبحنا وأصبح الملك لله، والحمد لله...»<br>• «اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ»<br>• آية الكرسي والمعوذات ثلاث مرات."
        });
    }

    // 2. أذكار المساء (من 4:30 عصراً [990 دقيقة] إلى 5:00 مساءً [1020 دقيقة])
    if (currentTimeInMinutes >= 990 && currentTimeInMinutes <= 1020) {
        dynamicSlides.push({
            title: "🌇 أذكار المساء المباركة (تلقائي حسب الوقت)",
            content: "• «أمسينا وأمسى الملك لله، والحمد لله...»<br>• «اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ»<br>• سيد الاستغفار والمعوذات."
        });
    }

    // الشاشات العامة والدورية الأخرى
    const standardSlides = [
        { title: "🔴 البث الحي الرئيسي", content: "قناة الجزيرة والبث المباشر على مدار الساعة" },
        { title: "📺 باقة القنوات الرياضية والترفيهية", content: "أفضل المحتويات والقنوات المختارة خصيصاً لك" },
        { title: "📖 آية اليوم", content: getDailyAyah() },
        { title: "📜 حديث اليوم (صحيح البخاري ومسلم)", content: getDailyHadith() },
        { title: "🤲 ذكر اليوم المأثور", content: getDailyAdhkar() },
        { title: "🎬 أحدث الأفلام والبرامج الوثائقية", content: "مكتبة ضخمة ومتجددة من الأفلام والمسلسلات" }
    ];

    // دمج الشاشات الزمنية مع الشاشات القياسية
    return [...dynamicSlides, ...standardSlides];
}

let currentSlideIndex = 0;
let isAutoScrollEnabled = true;

// دالة العرض التلقائي والتنقل بين الشاشات كل 5 ثوانٍ
function nextTvSlide() {
    if (isAutoScrollEnabled) {
        const slides = getCurrentTvSlides();
        if (slides.length === 0) return;
        
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        const slide = slides[currentSlideIndex];
        
        document.getElementById('tv-view').innerHTML = `
            <div style="font-size: 26px; color: #ff3333; margin-bottom: 15px; font-weight: bold;">${slide.title}</div>
            <div style="font-size: 20px; color: #ffffff; padding: 0 20px; line-height: 1.6; text-align: right; max-height: 70vh; overflow-y: auto;">${slide.content}</div>
        `;
    }
}

// حساب مؤشر يعتمد على رقم اليوم في السنة لتغير الآيات والأحاديث يومياً
function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function getDailyAyah() {
    const ayahs = [
        "﴿ وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجاً وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ﴾ [الطلاق: 2-3]",
        "﴿ إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُمْ مُحْسِنُونَ ﴾ [النحل: 128]",
        "﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ﴾ [البقرة: 201]"
    ];
    return ayahs[getDayOfYear() % ayahs.length];
}

function getDailyHadith() {
    const ahadith = [
        "«إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى» [صحيح البخاري]",
        "«مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ ليَصْمُتْ» [صحيح البخاري ومسلم]",
        "«لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ» [صحيح البخاري ومسلم]"
    ];
    return ahadith[getDayOfYear() % ahadith.length];
}

function getDailyAdhkar() {
    const adhkar = [
        "«سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ»",
        "«اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ...»"
    ];
    return adhkar[getDayOfYear() % adhkar.length];
}

// بدء التبديل التلقائي كل 5 ثوانٍ
setInterval(nextTvSlide, 5000);
nextTvSlide();

// دالة جلب أخبار الجزيرة المكتوبة فقط
async function fetchAlJazeeraTextNews() {
    try {
        let response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.aljazeera.net/rss');
        let data = await response.json();
        
        if (data && data.items && data.items.length > 0) {
            let newsTitles = data.items.map(item => item.title).join("   ***   ");
            document.getElementById('aljazeera-news-text').innerText = newsTitles;
        }
    } catch (e) {
        console.error("خطأ في جلب الأخبار:", e);
        document.getElementById('aljazeera-news-text').innerText = "عاجل: شبكة الجزيرة الإخبارية - تغطية مستمرة على مدار الساعة.";
    }
}

fetchAlJazeeraTextNews();
setInterval(fetchAlJazeeraTextNews, 120000);
