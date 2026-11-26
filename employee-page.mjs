import {cardIcons} from './public/employee-experience.js';
const passwordRules = (id, hidden = false) => `<div class="employee-password-rules hint" id="${id}"${hidden ? ' hidden' : ''}>
<strong>شروط كلمة المرور</strong>
<ul><li>١٠ أحرف على الأقل</li><li>حرف إنجليزي كبير مثل A</li><li>حرف إنجليزي صغير مثل a</li><li>رقم مثل 7</li><li>رمز مثل !</li></ul>
</div>`;

export const employeePage = `<!doctype html>
<html lang="ar" dir="rtl" class="employee-page employee-loading">
<head><script src="/theme.js"></script><link rel="modulepreload" href="/employee.js"><link rel="modulepreload" href="/punch-feedback.js"><link rel="modulepreload" href="/ux.js"><link rel="modulepreload" href="/profile-avatar.js"><link rel="modulepreload" href="/device-interface.js"><link rel="modulepreload" href="/ar.js"><link rel="modulepreload" href="/employee-greetings.js"><link rel="modulepreload" href="/work-schedule.js"><meta charset="utf-8"><meta name="dawamkom-release" content="__DAWAMKOM_RELEASE__"><script type="module" src="/update-notice.js"></script><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#14282e">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><meta name="apple-mobile-web-app-title" content="دوامكم">
<link rel="manifest" href="./employee.webmanifest">
<title>حساب الموظف | dawamkom</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/theme.css"><script type="module" src="/employee.js"></script></head>
<body class="employee-portal"><div class="employee-loading-screen" role="status" aria-label="جارٍ تحميل البيانات"><img src="/apple-touch-icon.png" width="88" height="88" alt=""><strong>دوامكم</strong></div><header class="employee-topbar">
<a class="brand" href="/"><span class="mark" aria-hidden="true"></span><span>دوامكم</span></a>
<div class="employee-topbar-actions">
<!-- company-workspace-link -->
<div id="employee-home-tabs" class="employee-home-tabs" role="group" aria-label="عرض الرئيسية" hidden>
<button type="button" class="button" data-employee-home="personal" aria-pressed="true">أنا</button>
<button type="button" class="button" data-employee-home="team" aria-pressed="false">فريقي</button>
</div>
<button type="button" class="button secondary employee-icon-button" id="employee-messages" aria-label="التنبيهات" aria-haspopup="dialog" hidden><span class="employee-bell" aria-hidden="true"></span><span id="employee-device-count" aria-hidden="true" hidden></span></button></div></header>
<div id="employee-toast" role="status" hidden></div>
<main class="preview-access employee-content">
<div class="employee-heading"><h1 id="employee-title">حساب الموظف</h1><p id="employee-status" role="status"></p></div>
<dl id="employee-invitation" hidden>
<dt>البريد الإلكتروني</dt><dd><bdi id="invitation-email"></bdi></dd>
<dt>الشركة</dt><dd><bdi id="invitation-company"></bdi></dd>
</dl>
<form id="employee-auth" hidden>
<label id="employee-email">البريد الإلكتروني<input name="email" type="email" autocomplete="username" inputmode="email" dir="ltr"></label>
<div class="auth-password-field"><div class="auth-password-heading"><label for="employee-login-password">كلمة المرور</label><a id="employee-forgot" href="/forgot-password">هل نسيت كلمة المرور؟</a></div><input id="employee-login-password" name="password" type="password" maxlength="128" required></div>
${passwordRules('employee-password-rules', true)}
<label id="employee-confirm">تأكيد كلمة المرور<input name="confirmation" type="password" autocomplete="new-password" maxlength="128"></label>
<button class="button primary" id="employee-submit"></button>
<button type="button" class="button secondary" id="employee-change" hidden>طلب تغيير الجوال</button>
</form>
<section id="employee-dashboard" hidden>
<div data-employee-view="home">
<div id="employee-reminder-optin" class="card" hidden><p>فعّل الإشعارات لتصلك تذكيرات بداية ونهاية الدوام.</p><button type="button" class="button secondary" id="employee-enable-reminders">تفعيل تذكيرات الدوام</button></div>
<h2 class="employee-greeting" id="employee-greeting" aria-live="polite" aria-atomic="true"></h2>
<p id="employee-sample-requests" class="hint" hidden>بطاقات الطلبات التجريبية</p>
<section class="card employee-attendance-card" aria-label="الحضور والانصراف">
<p id="employee-shift" class="employee-shift" aria-live="polite"></p>
<time id="employee-timer" class="employee-timer" dir="ltr">00:00</time>
<p id="employee-location-note" class="hint" hidden>لم تحدد الشركة موقع عمل بعد. يتاح تسجيل الحضور والانصراف بعد تحديده.</p>
<button type="button" class="button primary" id="employee-punch"><img src="/punch-fingerprint.png" class="employee-punch-icon" alt="" width="30" height="30"><span id="employee-punch-label">تسجيل البصمة</span></button>
<ul id="employee-scheduled-periods" class="employee-scheduled-periods" hidden></ul>
</section>
<div id="employee-personal-home">
<section class="employee-quick-actions" aria-labelledby="employee-quick-title">
<header><h2 id="employee-quick-title">عمليات سريعة</h2><button type="button" class="button secondary employee-icon-button" id="employee-quick-customize" aria-label="إضافة اختصارات" aria-haspopup="dialog" hidden>+</button></header>
<div class="employee-quick-grid">
<button type="button" class="button secondary" data-quick-request="Missed punch" aria-haspopup="dialog">
<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M33 32a16.5 16.5 0 1 1 4-10M20 11v10l6 3"/><path class="employee-quick-accent" d="m26 38 13-13 5 5-13 13-6 1z"/></svg>تصحيح البصمة</button>
<button type="button" class="button secondary" data-quick-request="leave" aria-haspopup="dialog">
<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="7" y="13" width="34" height="26" rx="2"/><path d="M19 13V7h10v6M13 39v4m22-4v4"/><path class="employee-quick-accent" d="M15 18v16m18-16v16"/></svg>إجازة</button>
<button type="button" class="button secondary" data-quick-request="Attendance excuse" aria-haspopup="dialog">
<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M33 35a17 17 0 1 1 3-20M21 14v9l5 3"/><path class="employee-quick-accent" d="M31 28h13m-5-5 5 5-5 5"/></svg>الاستئذان</button>
<button type="button" class="button secondary" id="employee-document-wallet" aria-haspopup="dialog" hidden><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 13h15l4 5h17v21H6z"/><path class="employee-quick-accent" d="M15 26h18m-18 6h12"/></svg>محفظة المستندات</button>
</div>
</section>
<section id="employee-assigned-tasks" class="employee-home-requests" hidden aria-labelledby="employee-assigned-tasks-title"><h2 id="employee-assigned-tasks-title">مهامي المسندة</h2><ul id="employee-assigned-tasks-list"></ul></section>
<section class="employee-home-requests" aria-labelledby="employee-home-requests-title">
<header class="employee-section-heading"><h2 id="employee-home-requests-title">طلباتي</h2><button type="button" data-employee-page="requests">عرض الكل ‹</button></header>
<ul id="employee-home-requests-list" tabindex="0" aria-labelledby="employee-home-requests-title"></ul>
</section>
</div>
<div id="employee-team-home" hidden>
<section id="employee-team-pending-section" aria-labelledby="employee-team-requests-title"><h2 id="employee-team-requests-title">طلبات تحتاج موافقتك</h2><ul id="employee-team-requests" aria-labelledby="employee-team-requests-title" tabindex="0"></ul></section>
<section id="employee-team-attendance-section" aria-labelledby="employee-team-attendance-title"><h2 id="employee-team-attendance-title">حضور اليوم</h2><div id="employee-team-metrics" class="employee-team-metrics" aria-label="ملخص الفريق"></div></section>
<section aria-labelledby="employee-team-leave-title"><h2 id="employee-team-leave-title">إجازات الفريق</h2><ul id="employee-team-leave" aria-labelledby="employee-team-leave-title" tabindex="0"></ul></section>
<p id="employee-team-status" role="status"></p>
</div>
</div>
<section data-employee-view="attendance" hidden>
<h2>الحضور</h2>
<div class="employee-calendar-header">
<button type="button" class="button secondary employee-icon-button" data-attendance-month="-1" aria-label="الشهر السابق"><span dir="ltr" aria-hidden="true">‹</span></button>
<strong id="employee-calendar-month"></strong>
<button type="button" class="button secondary employee-icon-button" data-attendance-month="1" aria-label="الشهر التالي"><span dir="ltr" aria-hidden="true">›</span></button>
</div>
<div id="employee-calendar-grid" class="employee-calendar-grid"></div>
<div class="employee-calendar-legend"><span data-day-status="complete">حضور مكتمل</span><span data-day-status="missing">بصمة ناقصة</span><span data-day-status="issue">غياب أو سجل يحتاج مراجعة</span><span data-day-status="off">لا يلزم الحضور</span></div>
<div id="employee-calendar-details" class="card" aria-live="polite"></div>
</section>
<section data-employee-view="requests" hidden><h2>الطلبات</h2>
<div id="employee-request-scope" class="employee-home-tabs" role="group" aria-label="الطلبات" hidden><button type="button" class="button" data-request-scope="own" aria-pressed="true">طلباتي</button><button type="button" class="button" data-request-scope="team" aria-pressed="false">طلبات الفريق</button></div>
<div id="employee-own-requests-panel"><button type="button" class="button primary employee-new-request" data-quick-request="all">＋ طلب جديد</button><div id="employee-request-filters" class="employee-request-filters" role="group" aria-label="حالة الطلب"><button type="button" data-request-filter="pending" aria-pressed="true">قيد المراجعة <b>0</b></button><button type="button" data-request-filter="completed" aria-pressed="false">المكتملة <b>0</b></button><button type="button" data-request-filter="all" aria-pressed="false">الكل <b>0</b></button></div><p id="employee-history-limit" class="hint" hidden></p><div id="employee-requests-history"></div></div>
<div id="employee-team-requests-panel" hidden><div id="employee-team-request-filters" class="employee-home-tabs" role="group" aria-label="حالة الطلب"><button type="button" class="button" data-team-request-filter="pending" aria-pressed="true"></button><button type="button" class="button" data-team-request-filter="all" aria-pressed="false">الكل</button></div><div id="employee-team-request-history"></div></div>
<section class="card" id="employee-device-inbox" aria-labelledby="employee-device-title" hidden>
<h2 id="employee-device-title">الطلبات: تغيير الجوال</h2>
<div id="employee-device-list"></div>
<p id="employee-device-status" role="status"></p>
</section>
</section>
<section data-employee-view="more" hidden><div class="card employee-profile-summary"><h2 id="employee-more-name"></h2><p id="employee-more-title"></p><p id="employee-more-company"></p><button type="button" class="button secondary" data-employee-page="profile">عرض الملف الشخصي</button></div></section>
<section data-employee-view="profile" hidden>
<header class="employee-account-heading"><h2>حسابي</h2></header>
<div class="employee-profile-heading"><button type="button" class="employee-profile-avatar" data-profile-avatar aria-label="تغيير الصورة الشخصية"><svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M3 22v-3a9 9 0 0 1 18 0v3z"/></svg></button><div><h3 id="employee-profile-name"></h3><p id="employee-profile-job"></p><small id="employee-profile-company"></small></div></div>
<label class="employee-profile-search" hidden><span class="sr-only">البحث في الملف الشخصي</span><input id="employee-profile-search" type="search" placeholder="ابحث عما تريد" autocomplete="off"></label>
<div hidden class="employee-profile-tabs" role="group" aria-label="أقسام الملف الشخصي"><button type="button" data-profile-tab="all" aria-pressed="true">الكل</button><button type="button" data-profile-tab="settings" aria-pressed="false">الإعدادات</button><button type="button" data-profile-tab="personal" aria-pressed="false">البيانات الشخصية</button></div>
<div id="employee-profile-all-panel" class="employee-profile-directory">
<div class="employee-account-hub" role="group" aria-label="كل شيء في مكان واحد">
<button type="button" data-employee-page="profile-leaves" class="employee-account-leave"><span class="employee-card-icon" aria-hidden="true">${cardIcons.leave}</span><strong id="employee-account-leave-balance">—</strong><small>رصيد الإجازات</small></button>
<button type="button" data-employee-page="profile-personal" data-profile-searchable="personal"><span class="employee-card-icon" aria-hidden="true">${cardIcons.person}</span><strong>المعلومات الشخصية</strong><small>الهوية والتواصل وبيانات العمل</small></button>
<button type="button" data-employee-page="requests"><span class="employee-card-icon" aria-hidden="true">${cardIcons.request}</span><strong>طلباتي</strong><small id="employee-account-requests-note">عرض الطلبات وحالتها</small></button>
<button type="button" data-employee-page="attendance"><span class="employee-card-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 16h32m-24-8v8m16-8v8M39 21v-9H7v28h17"/><path d="M34 23a10 10 0 1 0 0 20a10 10 0 1 0 0-20m0 4v6l4 2"/></svg></span><strong>سجل الحضور</strong><small>البصمات حسب الشهر</small></button>
<button type="button" id="employee-account-notifications" aria-haspopup="dialog"><span class="employee-card-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M12 34V22a12 12 0 0 1 24 0v12l3 4H9zM20 42h8"/></svg></span><strong>التنبيهات</strong><small id="employee-account-notifications-note">لا توجد تنبيهات جديدة</small><b class="employee-account-badge" id="employee-account-notifications-count" hidden></b></button>
<button type="button" id="employee-account-wallet" aria-haspopup="dialog" hidden><span class="employee-card-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M6 13h15l4 5h17v21H6z"/><path d="M15 26h18m-18 6h12"/></svg></span><strong>محفظة المستندات</strong><small>الهوية والعقود والمستندات</small></button>
<button type="button" id="employee-account-follow-up" aria-haspopup="dialog" hidden><span class="employee-card-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><path d="M24 15v11m0 7v1"/></svg></span><strong>مركز المتابعة</strong><small>نواقص تحتاج إجراء</small></button>
</div>
</div>
<h3 class="employee-section-label">تفضيلاتي</h3>
<div id="employee-profile-settings-panel" class="card employee-profile-options employee-settings-list">
<div hidden class="employee-setting-row" data-profile-searchable="biometric fingerprint face id بصمة"><div><strong>تفعيل تسجيل الدخول بالبصمة</strong><small id="employee-biometric-unavailable">ستتوفر لاحقًا</small></div><button type="button" class="employee-biometric-switch" role="switch" aria-checked="false" aria-label="تفعيل تسجيل الدخول بالبصمة" aria-describedby="employee-biometric-unavailable" disabled><span></span></button></div>
<label class="employee-setting-row" data-profile-searchable="appearance theme light dark المظهر فاتح داكن"><span><strong>المظهر</strong><small>محفوظ على هذا الجهاز</small></span><input type="checkbox" role="switch" class="employee-theme-switch" data-theme-switch aria-label="الوضع الفاتح"></label>
<label class="employee-setting-row" data-profile-searchable="language اللغة"><span><strong>اللغة</strong></span><select id="employee-language"><option value="ar">العربية</option><option value="en">English</option></select></label>
</div>
<h3 class="employee-section-label">الأمان والمساعدة</h3>
<div class="card employee-profile-options employee-settings-list employee-account-group" id="employee-account-help"><button type="button" class="employee-setting-row" id="employee-password-open" data-profile-searchable="password كلمة المرور"><strong>تغيير كلمة المرور</strong><span aria-hidden="true">‹</span></button>
<a class="employee-setting-row" href="/support"><strong>الدعم / Support</strong><span aria-hidden="true">‹</span></a><a class="employee-setting-row" href="/privacy"><strong>سياسة الخصوصية / Privacy</strong><span aria-hidden="true">‹</span></a></div>
<div class="card employee-profile-options employee-settings-list employee-account-group"><button type="button" class="employee-setting-row employee-settings-logout" id="employee-logout" data-profile-searchable="sign out logout تسجيل الخروج"><strong>تسجيل الخروج</strong><span aria-hidden="true">↪</span></button></div>
<div id="employee-profile-personal-panel" hidden>
<section class="card" data-profile-searchable="personal name email phone birth gender المعلومات الشخصية الاسم البريد الجوال الميلاد الجنس"><h3>المعلومات الشخصية</h3><dl id="employee-tab-personal-details"></dl></section>
<section class="card" data-profile-searchable="identity nationality الهوية الجنسية"><h3>الهوية</h3><dl id="employee-tab-identity-details"></dl></section>
<section class="card" data-profile-searchable="address العنوان"><h3>العنوان</h3><p id="employee-tab-address-details"></p></section>
</div>
<p id="employee-profile-no-results" role="status" hidden>لا توجد نتائج مطابقة.</p></section>
<section data-employee-view="profile-personal" hidden><header class="employee-back-header"><button type="button" class="button secondary employee-icon-button" data-employee-page="profile" aria-label="رجوع">›</button><h2>شخصي</h2></header>
<section class="card"><h3>المعلومات الشخصية</h3><dl id="employee-personal-details"></dl></section><section class="card"><h3>الهوية</h3><dl id="employee-identity-details"></dl></section><section class="card"><h3>العنوان</h3><p id="employee-address-details"></p></section><section class="card" data-profile-searchable="employment job البيانات الوظيفية"><h3>البيانات الوظيفية</h3><dl id="employee-job-details"></dl></section>
<section class="card"><h3>الراتب والتفاصيل المالية</h3><button type="button" class="button secondary employee-salary-toggle" id="employee-salary-toggle" aria-label="إظهار الراتب" aria-controls="employee-salary-details" aria-pressed="false"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="employee-salary-eye-slash" d="m3 3 18 18"/></svg><span>إظهار الراتب</span></button><dl id="employee-salary-details"></dl></section></section>
<section data-employee-view="profile-leaves" hidden><header class="employee-back-header"><button type="button" class="button secondary employee-icon-button" data-employee-page="profile" aria-label="رجوع">›</button><h2>الإجازات</h2></header>
<section class="card employee-leave-profile" aria-labelledby="employee-leave-profile-title">
<h3 id="employee-leave-profile-title">الإجازات</h3>
<div class="employee-leave-tabs" role="group" aria-label="الإجازات">
<button type="button" data-employee-leave-tab="all" aria-pressed="true">الكل</button>
<button type="button" data-employee-leave-tab="current" aria-pressed="false">الإجازات المجدولة والحالية</button>
<button type="button" data-employee-leave-tab="previous" aria-pressed="false">السابقة</button></div>
<div id="employee-leave-balance-summary">
<h4>تفاصيل الإجازة السنوية</h4>
<div class="employee-leave-gauge"><svg viewBox="0 0 220 120" aria-hidden="true"><path class="leave-gauge-track" d="M12 110 A98 98 0 0 1 208 110" pathLength="100"/><path id="employee-leave-gauge-value" d="M12 110 A98 98 0 0 1 208 110" pathLength="100"/><path id="employee-leave-gauge-opening" d="M12 110 A98 98 0 0 1 208 110" pathLength="100"/></svg>
<div><strong id="employee-leave-available"></strong><small>المتاح للاستخدام</small></div></div>
<dl class="employee-leave-numbers"><div><dt id="employee-leave-contract-label">الاستحقاق السنوي حسب العقد</dt><dd id="employee-leave-contract-entitlement"></dd></div>
<div><dt>المكتسب في السنة التعاقدية حتى اليوم</dt><dd id="employee-leave-entitlement"></dd></div>
<div><dt>الرصيد الافتتاحي للسنة</dt><dd id="employee-leave-opening"></dd></div>
<div><dt>تاريخ انتهاء الرصيد الافتتاحي</dt><dd id="employee-leave-expiry"></dd></div>
<div><dt>الرصيد المستحق حتى اليوم</dt><dd id="employee-leave-accrued"></dd></div>
<div><dt>المتاح للاستخدام</dt><dd id="employee-leave-available-detail"></dd></div></dl>
</div>
<ul id="employee-profile-leaves"></ul></section>
</section>
<nav class="employee-bottom-nav" aria-label="التنقل" id="employee-bottom-nav">
<button type="button" data-employee-page="home" aria-current="page"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M5 23 24 7l19 16M10 20v20h28V20"/><path class="employee-nav-accent" d="M19 24h10v9H19z"/></svg><span>الرئيسية</span></button>
<button type="button" data-employee-page="attendance"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M7 16h32m-24-8v8m16-8v8M39 21v-9H7v28h17"/><path class="employee-nav-accent" d="M34 23a10 10 0 1 0 0 20a10 10 0 1 0 0-20m0 4v6l4 2"/></svg><span>الحضور</span></button>
<button type="button" data-employee-page="requests"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M12 7h17l7 7v27H12zM29 7v8h7M18 23h12"/><path class="employee-nav-accent" d="M18 30h9"/></svg><span>الطلبات</span></button>
<button type="button" data-employee-page="profile"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="15" r="8"/><path d="M8 41v-4a16 16 0 0 1 32 0v4z"/></svg><span>حسابي</span></button>
</nav>
<dialog class="employee-sheet" id="employee-password-dialog" aria-labelledby="employee-password-title">
<header><button type="button" data-employee-close class="button secondary employee-icon-button" aria-label="رجوع">›</button><h2 id="employee-password-title">تغيير كلمة المرور</h2></header>
<form id="employee-password-form">
<label>كلمة المرور الجديدة<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" aria-describedby="employee-change-password-rules" required></label>
${passwordRules('employee-change-password-rules')}
<label>تأكيد كلمة المرور<input name="confirmation" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label>
<button type="submit" class="button primary">حفظ</button><p id="employee-password-status" role="status"></p></form></dialog>
<dialog class="employee-sheet" id="employee-request-dialog" aria-labelledby="employee-requests-title">
<header class="employee-back-header"><button type="button" data-employee-close class="button secondary employee-icon-button" aria-label="رجوع"><span dir="ltr" aria-hidden="true">›</span></button><h2 id="employee-requests-title" dir="auto">طلب جديد</h2></header>
<form id="employee-request">
<div id="employee-request-applicant" hidden>
<label>الموظف<select id="employee-request-person-mode"></select></label>
<label id="employee-request-branch-label" hidden>الفرع<select id="employee-request-branch"></select></label>
<label id="employee-request-person-label" hidden>الموظف<select id="employee-request-person"></select></label>
</div>
<label id="employee-request-type"><span>نوع الطلب</span><select name="type" required></select></label>
<label id="employee-loan-amount" hidden>مبلغ السلفة (ر.س)<input name="loanAmount" type="number" min="0.01" max="100000000" step="0.01" disabled></label>
<label id="employee-loan-repayment" hidden>طريقة السداد<select name="repaymentInstallments" disabled><option value="1">كامل المبلغ</option><option value="2">دفعتين</option><option value="3">3 دفعات</option><option value="4">4 دفعات</option></select></label>
<label id="employee-shift-change" hidden><span>الفترة المطلوبة</span><select name="periodId" disabled></select></label>
<label id="employee-shift-change-second" hidden><span>الفترة الثانية</span><select name="secondPeriodId" disabled></select></label>
<label id="employee-cancel-leave" hidden><span>الإجازة المراد إلغاؤها</span><select name="leaveRequestId" disabled></select></label>
<p id="employee-cancel-leave-empty" class="hint" role="status" hidden></p>
<label id="employee-excuse-type" hidden>النوع<select name="excuseType"></select></label>
<div id="employee-request-dates"><label><span id="employee-request-date-label">التاريخ</span><input name="date" type="date" required></label>
<label id="employee-request-end"><span id="employee-request-end-label">انتهاء</span><input name="end" type="date"></label></div>
<fieldset id="employee-correction-times" class="employee-correction-times" hidden><legend>وقت التصحيح المقترح</legend><p id="employee-correction-status" role="status"></p>
<div id="employee-correction-periods"></div>
</fieldset>
<div id="employee-leave-summary" role="status" hidden><span></span><span></span></div>
<label id="employee-excuse-reason" hidden>فئة السبب<select name="reason"></select></label>
<label id="employee-correction-reason" hidden>السبب<select name="correctionReason"></select></label>
<label id="employee-request-note"><span>السبب</span><textarea name="note" maxlength="1000" placeholder="اكتب الوصف…" required></textarea></label>
<label class="employee-upload" id="employee-attachment" hidden><span>اضغط لإرفاق ملف</span><small>SVG, PNG, JPG, PDF, DOC, DOCX, GIF · 2 MB</small><input type="file" name="attachment" accept=".svg,.png,.jpg,.jpeg,.pdf,.doc,.docx,.gif"></label>
<button class="button primary" type="submit">إرسال</button><p id="employee-request-status" role="status"></p>
</form></dialog>
<dialog class="employee-sheet" id="employee-messages-dialog" aria-labelledby="employee-messages-title">
<header><button type="button" data-employee-close class="button secondary employee-icon-button" aria-label="إغلاق"><span dir="ltr" aria-hidden="true">×</span></button><h2 id="employee-messages-title">التنبيهات</h2></header>
<div id="employee-notification-toolbar"></div><div id="employee-message-list"></div></dialog>
</section>
<button class="button secondary" id="employee-refresh" hidden>تحقق من الموافقة</button>
</main></body></html>`;
