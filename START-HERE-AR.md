# ابدأ من هنا — MLBB Esports Hub

النسخة دي جاهزة للنشر كموقع Static كامل، يعني مش محتاجة سيرفر مدفوع أو قاعدة
بيانات أو مفاتيح API في المتصفح. كل صفحات العربي والإنجليزي والماتشات
والريجونز والفرق بتتبني مسبقًا داخل مجلد `out`.

## اتغير إيه؟

- تم حذف الأخبار وصفحتها وتغذيتها بالكامل.
- Light Mode وDark Mode مع حفظ اختيار الزائر.
- كروت Glass ثلاثية الأبعاد تتفاعل مع حركة الماوس.
- أعلام وأيقونات واضحة لكل ريجون.
- التاريخ والساعة المحلية لكل ماتش، والنتيجة والفائز.
- زر مشاهدة يظهر تلقائيًا عندما يكون رابط البث موجودًا.
- عربي RTL وإنجليزي، وتصميم موبايل كامل بدون Scroll أفقي.
- الخطوط محفوظة داخل المشروع، فلا يعتمد البناء على Google Fonts.
- إصلاح Workflow الشعارات: أي شعار جديد يتم حفظه ونشره مع البيانات.

## أفضل نشر مجاني مع تحديث كل ساعة

استخدم GitHub Pages مع Repository عام (Public):

1. أنشئ Repository جديدًا وفاضيًا على GitHub.
2. ارفع محتويات المشروع إليه على فرع `main`.
3. افتح **Settings → Pages** واختر **GitHub Actions** كمصدر النشر.
4. افتح **Settings → Actions → General → Workflow permissions** واختر
   **Read and write permissions** حتى يقدر تحديث البيانات يحفظ النتائج.
5. افتح تبويب **Actions** وشغّل **Harvest Liquipedia** يدويًا أول مرة.

بعدها الموقع ينشر تلقائيًا، والـ Workflow يحدّث الماتشات والنتائج كل ساعة.
الرابط المجاني سيكون بالشكل:

`https://USERNAME.github.io/REPOSITORY/`

## Cloudflare Pages

ممكن تستخدم Cloudflare Pages لو الأولوية لأقوى CDN عالمي:

- Build command: `npm run build`
- Output directory: `out`
- Node version: `20` أو أحدث

Cloudflare يعطي رابط `pages.dev` مجاني ويدعم الدومين الخاص. لكن الخطة
المجانية تسمح حاليًا بـ500 Build شهريًا؛ التحديث كل ساعة قد يتجاوز الرقم.
لو اخترته، غيّر Cron إلى كل ساعتين أو استخدم GitHub Pages للتحديث الساعي.

## الدومين

الرابط الفرعي من GitHub Pages أو Cloudflare مجاني. لو عندك دومين مدفوع، ضيفه
من إعدادات Pages ثم اربط DNS حسب التعليمات التي تظهر لك. HTTPS متاح مجانًا.

## أوامر الفحص

```bash
npm ci
npm test
npm run lint
npm run build
npx playwright test
```

آخر فحص للنسخة: 70 Unit Tests و26 Browser Tests، وكلها ناجحة.
