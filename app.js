// محتوى الشاشات المتعددة في شاشة واحدة تتنقل تلقائياً
const slides = [
    "🔴 البث الحي الرئيسي - قناة الجزيرة والعام",
    "📺 باقة قنوات الرياضة والترفيه المتميزة",
    "🎬 أحدث الأفلام والمسلسلات المختارة",
    "⭐ القنوات المفضلة والمخصصة للمستخدم"
];

let currentSlideIndex = 0;
let isAutoScrollEnabled = true;

function nextTvSlide() {
    if (isAutoScrollEnabled) {
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        document.getElementById('tv-view').innerText = slides[currentSlideIndex];
    }
}

// التنقل التلقائي كل 5 ثوانٍ
setInterval(nextTvSlide, 5000);

// دالة لجلب الأخبار المكتوبة فقط من قناة الجزيرة عبر RSS
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

// جلب الأخبار عند البداية وتحديثها كل دقيقتين
fetchAlJazeeraTextNews();
setInterval(fetchAlJazeeraTextNews, 120000);
