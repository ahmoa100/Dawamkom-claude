import {escapeHtml as esc,requestCounts,filterRequests,availableLeave,cardIcons,requestIcon,iconBox,requestCardMarkup,recordedDuration,employeeActionDialog} from './employee-experience.js';
import {renderDocumentWallet} from './document-wallet.js';
import {showEmployeeFollowUp} from './employee-follow-up.js';
import {futureAnnualLeave} from './leave-balance.js';
import {documentAlertPresenter} from './document-alert-popup.js';
import {dateText,dateFormatter} from './date-format.js';
import './date-controls.js';
import {submitPunch,punchMessages} from './punch-feedback.js';
import {configureCorrectionTime} from './punch-correction.js';
import './ux.js';
import { displayProfileAvatar } from './profile-avatar.js';
document.addEventListener('profile-avatar-updated',event=>{if(session)session.photo=event.detail;});
import { isMobileDevice } from './device-interface.js';
import ar from './ar.js';
import { pickEmployeeGreeting } from './employee-greetings.js';
import { punchTiming, periodDurationMinutes, periodsOverlap } from './work-schedule.js';

const $ = selector => document.querySelector(selector);
// Explicit presentation-only preview; server authorization remains unchanged.
const mobilePreviewMode = new URLSearchParams(location.search).get('mobile-preview') === '1';
const form = $('#employee-auth');
try {
  const key = 'dawamkom-login-email:' + location.pathname;
  form.elements.email.value = sessionStorage.getItem(key) ?? '';
  sessionStorage.removeItem(key);
} catch {}
const status = $('#employee-status');
const punch = $('#employee-punch');
const change = $('#employee-change');
const refresh = $('#employee-refresh');
const dashboard = $('#employee-dashboard');
const requestForm = $('#employee-request');
const deviceList = $('#employee-device-list');
const requestDialog = $('#employee-request-dialog');
const messagesDialog = $('#employee-messages-dialog');
messagesDialog.addEventListener('click',event=>{if(event.target!==messagesDialog)return;const box=messagesDialog.getBoundingClientRect();if(event.clientY>box.bottom||event.clientY<box.top||event.clientX<box.left||event.clientX>box.right)messagesDialog.close();});
const requestTitle = $('#employee-requests-title');
const employeeClocks = new Map();
function employeeClock() {
  const hourCycle = session?.timeFormat === '24' ? 'h23' : 'h12';
  const key = employeeLanguage + ':' + hourCycle;
  if (!employeeClocks.has(key)) employeeClocks.set(key, new Intl.DateTimeFormat(employeeLanguage, {
    timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hourCycle,
  }));
  return employeeClocks.get(key);
}
const formatHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', hourCycle: 'h23' });
const requestLabels = { 'Missed punch': 'تصحيح البصمة', 'Attendance excuse': 'الاستئذان', leave: 'إجازة', all: 'طلب جديد' };
const english = new Map([...Object.entries(ar).map(([key, value]) => [value, key]), ...Object.entries({
  'حالة الطلب':'Request status','التنقل':'Navigation','الوضع الفاتح':'Light mode','ملخص الفريق':'Team summary','الأمان والمساعدة':'Security and help','حسابي':'My account','طلباتي':'My requests','تعديل الصورة':'Edit photo','بياناتي':'My information','تفضيلاتي':'Preferences','رصيد الإجازات':'Leave balance','التفاصيل ‹':'Details ‹','الهوية والتواصل وبيانات العمل':'Identity, contact and employment','الرصيد والحالية والسابقة':'Balance, current and previous leave','كل طلب، وحالته، والخطوة التالية':'Every request, its status and next step','＋ طلب جديد':'+ New request','عرض الكل ‹':'View all ‹','طلبات تحتاج موافقتك':'Requests awaiting your approval','ما يخص فريقي':'My team','المكتملة':'Completed',
  'الرئيسية': 'Home', 'الحضور': 'Attendance', 'الطلبات': 'Requests', 'المزيد': 'More', 'عرض الملف الشخصي': 'View profile',
  'الملف الشخصي': 'Profile', 'تغيير كلمة المرور': 'Change password', 'كلمة المرور الحالية': 'Current password',
  'شروط كلمة المرور': 'Password requirements', '١٠ أحرف على الأقل': 'At least 10 characters',
  'حرف إنجليزي كبير مثل A': 'An uppercase English letter, such as A',
  'حرف إنجليزي صغير مثل a': 'A lowercase English letter, such as a',
  'رقم مثل 7': 'A number, such as 7', 'رمز مثل !': 'A symbol, such as !',
  'كلمة المرور الجديدة': 'New password', 'تأكيد كلمة المرور': 'Confirm password', 'كلمة المرور': 'Password', 'اللغة': 'Language',
  'البيانات الوظيفية': 'Employment details', 'تسجيل الخروج': 'Sign out', 'التنبيهات': 'Notifications', 'رجوع': 'Back',
  'الشهر السابق': 'Previous month', 'الشهر التالي': 'Next month',
  'الفترة الصباحية': 'Morning shift',
  'حضور مكتمل': 'Complete attendance', 'بصمة ناقصة أو غياب': 'Missing punch or absence',
  'غائب': 'Absent',
  'لا يلزم الحضور': 'Attendance not required', 'الفترة لم تكتمل بعد': 'Shift not yet complete',
  'إجازة معتمدة': 'Approved leave', 'تعذّر تحميل التقويم.': 'Could not load the calendar.',
  'حفظ': 'Save', 'طلب جديد': 'New request', 'عمليات سريعة': 'Quick actions', 'تصحيح البصمة': 'Correct a punch',
  'إضافة اختصارات': 'Add shortcuts',
  'محفظة المستندات': 'Document wallet',
  'إجازة': 'Leave', 'الاستئذان': 'Permission request', 'النوع': 'Type', 'التاريخ': 'Date', 'بدء': 'Start date', 'انتهاء': 'End date',
  'إجمالي الأيام': 'Total days', 'العودة للدوام بتاريخ': 'Return to work on',
  'إرسال': 'Send', 'السبب': 'Reason', 'فئة السبب': 'Reason category', 'البريد الإلكتروني': 'Email', 'الشركة': 'Company',
  'المدير المباشر': 'Direct manager', 'المسمى الوظيفي': 'Job title', 'تاريخ الانضمام': 'Joining date',
  'تسجيل البصمة': 'Clock in', 'تسجيل الانصراف': 'Clock out', 'تسجيل الحضور': 'Clock-in', 'الحضور والانصراف': 'Attendance',
  'تسجيل حضور': 'Clock in', 'تسجيل خروج': 'Clock out',
  'تم تسجيل الحضور بنجاح.': 'Clock-in recorded successfully.', 'تم تسجيل الانصراف بنجاح.': 'Clock-out recorded successfully.',
  'أنت تقع خارج الحدود المكانية للتحضير': 'You are outside the approved attendance area.',
  'خارج المدة الزمنية': 'Outside the punch time window',
  'انتظر قبل تسجيل بصمة أخرى.': 'Wait before recording another punch.',
  'صباح الخير، ': 'Good morning, ', 'مساء الخير، ': 'Good evening, ', 'لا يوجد دوام مجدول اليوم': 'No shift scheduled today',
  'مدة الدوام منذ تسجيل الحضور': 'Time since clock-in', 'لا توجد طلبات بعد.': 'No requests yet.',
  'لا توجد بصمات مسجلة بعد.': 'No attendance records yet.', 'لا توجد تنبيهات بعد.': 'No notifications yet.',
  'تم تغيير كلمة المرور.': 'Password changed.', 'تم إرسال الطلب.': 'Request submitted.',
  'اختر النوع': 'Choose a type', 'نوع الإجازة': 'Leave type', 'نوع الطلب': 'Request type', 'اختر نوع الاستئذان': 'Choose a permission type',
  'اختر فئة السبب': 'Choose a reason category', 'اضغط لإرفاق ملف': 'Attach a file', 'اكتب الوصف…': 'Enter a description…',
  'وقت التصحيح المقترح': 'Proposed correction time', 'وقت الحضور المسجل': 'Recorded clock-in', 'وقت الانصراف المسجل': 'Recorded clock-out',
  'وقت الحضور المقترح': 'Proposed clock-in', 'وقت الانصراف المقترح': 'Proposed clock-out', 'الوصف': 'Description', 'الفترة الثانية': 'Second shift',
  'اختر السبب': 'Choose a reason', 'لا توجد بصمة مسجلة': 'No punch recorded', 'لم ينتهِ الدوام بعد': 'Shift still in progress',
  'تقنية السياج الجغرافي': 'Geofence', 'تعذّر تحميل بصمات اليوم.': 'Could not load punches for this date.',
  'جاري تحميل البصمات…': 'Loading attendance…',
  'طلب إلغاء إجازة': 'Leave cancellation', 'الإجازة المراد إلغاؤها': 'Leave to cancel',
  'اختر الإجازة': 'Choose leave', 'تاريخ العودة للدوام': 'Return to work date',
  'مستقبلية': 'Upcoming', 'حالية': 'Current', 'النوع': 'Type', 'الحالة': 'Status', 'المدة': 'Period', 'عدد الأيام': 'Days', 'لا يوجد': 'None',
  'الإجازات المجدولة والحالية': 'Scheduled and current leave', 'السابقة': 'Previous',
  'تفاصيل الإجازة السنوية': 'Annual leave details', 'الاستحقاق السنوي': 'Earned this contractual year to date', 'الرصيد المستحق حتى اليوم': 'Accrued balance to date',
  'الرصيد الافتتاحي للسنة': 'Year opening balance', 'تاريخ انتهاء الرصيد الافتتاحي': 'Opening balance expiry date',
  'المتاح للاستخدام': 'Available to use', 'لا توجد إجازات في هذه القائمة.': 'No leave in this list.',
  'البحث في الملف الشخصي': 'Search profile', 'ابحث عما تريد': 'Search for anything',
  'البيانات الشخصية': 'Personal data', 'تفعيل تسجيل الدخول بالبصمة': 'Enable biometric sign-in', 'ستتوفر لاحقًا': 'Coming later',
  'أقسام الملف الشخصي': 'Profile sections', 'الكل': 'All', 'الإعدادات': 'Settings',
  'شخصي': 'Personal', 'المعلومات الشخصية، الهوية، العنوان': 'Personal information, identity, address',
  'المعلومات الشخصية': 'Personal information', 'الهوية': 'Identity', 'العنوان': 'Address',
  'الراتب': 'Salary', 'الراتب والتفاصيل المالية': 'Salary and financial details',
  'الأرصدة والإجازات المجدولة والسابقة': 'Balances, scheduled and previous leave',
  'الاسم': 'Name', 'الجوال': 'Phone', 'تاريخ الميلاد': 'Date of birth', 'الجنسية': 'Nationality',
  'الجنس': 'Gender', 'رقم الهوية': 'Identity number', 'الراتب الأساسي': 'Base salary',
  'رقم الإقامة': 'Residence number', 'تاريخ انتهاء الإقامة': 'Residence expiry date',
  'البدلات': 'Allowances', 'الإجمالي الشهري': 'Monthly total', 'لا توجد نتائج مطابقة.': 'No matching results.',
  'مهامي المسندة':'My assigned tasks', 'طلباتي': 'My requests', 'لا توجد طلبات حالية.': 'No current requests.',
  'بطاقات الطلبات التجريبية': 'Sample request cards',
  'عرض الرئيسية': 'Home view', 'الفريق': 'Team', 'أنا': 'Me', 'فريقي': 'My team', 'الطلبات': 'Requests',
  'إجازات الفريق': 'Team leave', 'حضور اليوم': 'Attendance today', 'طلبات الفريق': 'Team requests', 'قادمة': 'Upcoming', 'جارية': 'In progress',
  'لا توجد إجازات قادمة للفريق.': 'No upcoming team leave.', 'لا توجد طلبات معلّقة للفريق.': 'No pending team requests.',
  'تم اعتماد الطلب.': 'Request approved.', 'تم رفض الطلب.': 'Request declined.',
  'تم تحويل الطلب لمسؤول الموافقة التالي.': 'Request forwarded to the next approver.',
  'تفعيل إشعارات الدوام والطلبات': 'Enable attendance and request notifications', 'تم تفعيل إشعارات الدوام.': 'Attendance notifications enabled.', 'تفعيل تذكيرات الدوام': 'Enable shift reminders', 'فعّل الإشعارات لتصلك تذكيرات بداية ونهاية الدوام.': 'Enable notifications to receive shift start and end reminders',
  'تم تفعيل إشعارات الاعتماد.': 'Approval notifications enabled.',
  'لم يتم السماح بالإشعارات.': 'Notifications permission was not granted.',
  'تعذّر تفعيل الإشعارات.': 'Could not enable notifications.',
  'في العمل': 'At work', 'خارج وقت العمل': 'Outside working hours',
  'حساب الموظف': 'Employee account', 'تفعيل حساب دوامكم': 'Activate your Dawamkom account', 'تفعيل الحساب': 'Activate account',
  'تسجيل الدخول': 'Sign in', 'تحقق من الموافقة': 'Check approval', 'طلب تغيير الجوال': 'Request browser change',
  'الطلبات: تغيير الجوال': 'Browser change requests', 'موافقة': 'Approve', 'رفض': 'Decline', 'إدارة': 'Management',
  'لم تحدد الشركة موقع عمل بعد. يتاح تسجيل الحضور والانصراف بعد تحديده.': 'Attendance will be available once the company adds a workplace.',
  'كل شيء في مكان واحد': 'Everything in one place', 'سجل الحضور': 'Attendance history', 'البصمات حسب الشهر': 'Punches by month',
  'عرض الطلبات وحالتها': 'View requests and status', 'لا توجد تنبيهات جديدة': 'No new notifications',
  'الهوية والعقود والمستندات': 'IDs, contracts and documents', 'نواقص تحتاج إجراء': 'Items that need action',
  'عرض الحضور': 'Attendance view', 'حضوري': 'My attendance', 'حالتي اليوم': 'My status today',
})]);
let employeeLanguage = 'ar';
try { if (localStorage.getItem('dawamkom-employee-language') === 'en') employeeLanguage = 'en'; } catch {}
const tr = value => employeeLanguage === 'en' ? english.get(value) ?? value : value;
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
const staticLabels = [];
for (let node = walker.nextNode(); node; node = walker.nextNode()) {
  if (english.has(node.textContent.trim())) staticLabels.push([node, node.textContent.trim()]);
}
const translatedAttributes = [...document.querySelectorAll('[aria-label], [placeholder]')].flatMap(element =>
  ['aria-label', 'placeholder'].filter(name => english.has(element.getAttribute(name))).map(name => [element, name, element.getAttribute(name)]));
function applyEmployeeLanguage() {
  document.documentElement.lang = employeeLanguage;
  document.documentElement.dir = employeeLanguage === 'ar' ? 'rtl' : 'ltr';
  for (const [node, label] of staticLabels) node.textContent = tr(label);
  for (const [element, name, value] of translatedAttributes) element.setAttribute(name, tr(value));
  for(const link of document.querySelectorAll('#employee-account-help a')){const privacy=new URL(link.href).pathname==='/privacy';link.querySelector('strong').textContent=employeeLanguage==='en'?(privacy?'Privacy policy':'Support'):(privacy?'سياسة الخصوصية':'الدعم');const url=new URL(link.href);url.searchParams.set('lang',employeeLanguage);url.searchParams.set('returnTo',location.pathname+'#profile-settings');link.href=url.href;}
}
applyEmployeeLanguage();
let employeeView = /^#view\/(home|attendance|requests|more|profile(?:-personal|-salary|-leaves)?)$/.test(location.hash)?location.hash.slice(6):location.hash === '#profile-settings' ? 'profile' : location.hash === '#requests' ? 'requests' : 'home';
let homeTab = 'personal';
const attendanceCard = $('.employee-attendance-card');
const homeView = $('[data-employee-view="home"]');
let toastTimeout;
function employeeToast(message, tone = 'success') {
  const toast = $('#employee-toast');
  clearTimeout(toastTimeout);
  toast.textContent = tr(message);
  toast.dataset.tone = tone;
  delete toast.dataset.leaving;
  toast.hidden = false;
  toastTimeout = setTimeout(() => {
    toast.dataset.leaving = '';
    toastTimeout = setTimeout(() => { toast.hidden = true; }, 350);
  }, 4200);
}

document.addEventListener('profile-photo-status',event=>employeeToast(event.detail.message,event.detail.tone));

function employeeRequestLabel(type) { return type === futureAnnualLeave && employeeLanguage !== 'ar' ? type : tr(requestLabels[type] ?? ar[type] ?? type); }
const walletShortcut = 'document-wallet';
const followUpShortcut = 'follow-up';
const defaultShortcuts = ['Missed punch','leave','Attendance excuse',walletShortcut];
const shortcutTypes = () => [...new Set([
  ...defaultShortcuts.filter(type => type === walletShortcut ? session.canViewDocuments :
    type === 'leave' ? session.leaveTypes.length : session.attendanceTypes.includes(type)),
  ...(session.canManageFollowUp ? [followUpShortcut] : []), ...session.leaveTypes, ...session.attendanceTypes,
])];
const shortcutLabel = type => type === walletShortcut ? tr('محفظة المستندات') :
  type === followUpShortcut ? (employeeLanguage==='ar'?'مركز المتابعة':'Follow-up centre') :
  type === 'leave' ? tr('إجازة') : employeeRequestLabel(type);
let shortcutAccount;
let extraShortcuts = [];
function renderExtraShortcuts() {
  const grid = $('.employee-quick-grid');
  const key = 'dawamkom-employee-shortcuts:' + location.pathname.replace(/\/$/,'') + ':' + session.email;
  if (shortcutAccount !== key) {
    shortcutAccount = key;
    extraShortcuts = [...defaultShortcuts,followUpShortcut];
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved)) extraShortcuts.push(...saved);
      else if (Array.isArray(saved?.selected)) extraShortcuts = saved.followUpIntroduced ? saved.selected : [...saved.selected,followUpShortcut];
    } catch {}
  }
  const choices = shortcutTypes();
  $('#employee-quick-customize').hidden = !choices.length;
  const enabled = [...new Set(extraShortcuts)].filter(type => choices.includes(type));
  for (const button of grid.querySelectorAll('[data-quick-request]:not([data-extra-shortcut]), #employee-document-wallet')) {
    button.hidden = !enabled.includes(button.dataset.quickRequest ?? walletShortcut);
  }
  const signature = JSON.stringify([employeeLanguage,enabled]);
  if (grid.dataset.extraShortcuts === signature) return;
  grid.dataset.extraShortcuts = signature;
  for (const button of grid.querySelectorAll('[data-extra-shortcut]')) button.remove();
  for (const type of enabled.filter(type => !defaultShortcuts.includes(type))) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button secondary';
    button.dataset.extraShortcut = '';
    button.dataset.shortcutType = type;
    if(type===followUpShortcut)button.onclick=()=>void showEmployeeFollowUp(api,employeeLanguage);
    else button.dataset.quickRequest = type;
    button.setAttribute('aria-haspopup','dialog');
    button.innerHTML = iconBox(session.leaveTypes.includes(type) ? cardIcons.leave : requestIcon(type));
    button.append(shortcutLabel(type));
    grid.append(button);
  }
  for (const button of grid.querySelectorAll('[data-quick-request], #employee-document-wallet'))
    button.dataset.shortcutType = button.dataset.quickRequest ?? walletShortcut;
  const buttons = new Map([...grid.querySelectorAll('[data-shortcut-type]')].map(button=>[button.dataset.shortcutType,button]));
  for (const type of enabled) {
    const button = buttons.get(type);
    if (button) grid.append(button);
  }
}
const shortcutGrid = $('.employee-quick-grid');
let shortcutDrag, suppressShortcutClickUntil = 0;
function startShortcutDrag(button,x,y) {
  if (!button || shortcutDrag) return;
  shortcutDrag = {button,x,y,target:null,active:false,timer:setTimeout(()=>{
    if(!shortcutDrag)return;
    shortcutDrag.active=true;
    button.classList.add('employee-shortcut-dragging');
  },420)};
}
function moveShortcutDrag(event,x,y) {
  if(!shortcutDrag)return;
  if(!shortcutDrag.active){
    if(Math.hypot(x-shortcutDrag.x,y-shortcutDrag.y)>10)finishShortcutDrag(false);
    return;
  }
  if(event.cancelable)event.preventDefault();
  const target=document.elementFromPoint(x,y)?.closest('[data-shortcut-type]');
  shortcutDrag.target?.classList.remove('employee-shortcut-drop');
  shortcutDrag.target=target&&shortcutGrid.contains(target)&&target!==shortcutDrag.button?target:null;
  shortcutDrag.target?.classList.add('employee-shortcut-drop');
}
function finishShortcutDrag(commit) {
  if(!shortcutDrag)return;
  const {timer,active,button,target}=shortcutDrag;
  shortcutDrag=null;
  clearTimeout(timer);
  button.classList.remove('employee-shortcut-dragging');
  target?.classList.remove('employee-shortcut-drop');
  if(!active)return;
  suppressShortcutClickUntil=performance.now()+450;
  if(!commit||!target)return;
  const from=extraShortcuts.indexOf(button.dataset.shortcutType),to=extraShortcuts.indexOf(target.dataset.shortcutType);
  if(from<0||to<0)return;
  const [type]=extraShortcuts.splice(from,1);
  extraShortcuts.splice(to,0,type);
  saveShortcutSelection();
  renderExtraShortcuts();
}
function saveShortcutSelection(){
  try{localStorage.setItem(shortcutAccount,JSON.stringify({selected:extraShortcuts,followUpIntroduced:true}));}catch{}
}
shortcutGrid.addEventListener('touchstart',event=>{
  if(event.touches.length!==1){finishShortcutDrag(false);return;}
  const {clientX,clientY}=event.touches[0];
  startShortcutDrag(event.target.closest('[data-shortcut-type]'),clientX,clientY);
},{passive:true});
shortcutGrid.addEventListener('touchmove',event=>{
  if(event.touches.length!==1){finishShortcutDrag(false);return;}
  const {clientX,clientY}=event.touches[0];
  moveShortcutDrag(event,clientX,clientY);
},{passive:false});
shortcutGrid.addEventListener('touchend',()=>finishShortcutDrag(true));
shortcutGrid.addEventListener('touchcancel',()=>finishShortcutDrag(false));
shortcutGrid.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button===0)startShortcutDrag(event.target.closest('[data-shortcut-type]'),event.clientX,event.clientY);
});
document.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')moveShortcutDrag(event,event.clientX,event.clientY);});
document.addEventListener('pointerup',event=>{if(event.pointerType==='mouse')finishShortcutDrag(true);});
shortcutGrid.addEventListener('contextmenu',event=>{if(event.target.closest('[data-shortcut-type]'))event.preventDefault();});
shortcutGrid.addEventListener('click',event=>{
  if(performance.now()<suppressShortcutClickUntil&&event.target.closest('[data-shortcut-type]')){
    event.preventDefault();event.stopImmediatePropagation();
  }
},true);
function applyRequestAvailability() {
 const available=[...session.leaveTypes,...session.attendanceTypes];
 for(const button of document.querySelectorAll('[data-quick-request]')) {
 const kind=button.dataset.quickRequest;
 button.hidden=kind==='all'?!available.length&&!session.canSubmitForStaff:kind==='leave'?!session.leaveTypes.length:!available.includes(kind);
 }
 renderExtraShortcuts();
}

$('#employee-quick-customize').onclick = () => {
  const dialog = employeeActionDialog(tr('إضافة اختصارات'),tr('إغلاق'),'employee-shortcut-dialog');
  const form = document.createElement('form');
  for (const type of shortcutTypes()) {
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.name = 'shortcut';
    check.value = type;
    check.checked = extraShortcuts.includes(type);
    label.append(check,shortcutLabel(type));
    form.append(label);
  }
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'button primary';
  save.textContent = tr('حفظ');
  form.append(save);
  form.onsubmit = event => {
    event.preventDefault();
    const available = shortcutTypes();
    const selected = new FormData(form).getAll('shortcut');
    extraShortcuts = [...new Set([...extraShortcuts.filter(type => !available.includes(type)||selected.includes(type)),...selected])];
    saveShortcutSelection();
    renderExtraShortcuts();
    dialog.close();
  };
  dialog.append(form);
  dialog.showModal();
};

$('#employee-account-notifications').onclick = () => $('#employee-messages').click();
$('#employee-account-wallet').onclick = () => $('#employee-document-wallet').onclick();
$('#employee-account-follow-up').onclick = () => void showEmployeeFollowUp(api,employeeLanguage);
$('#employee-document-wallet').onclick = () => {
  const endpoint = location.pathname.replace(/\/employee\/?$/, '') + '/api/documents';
  const dialog = employeeActionDialog(tr('محفظة المستندات'), tr('إغلاق'), 'employee-wallet');
  dialog.showModal();
  void renderDocumentWallet(dialog, endpoint, employeeLanguage);
};

function fillHistory(panel, rows, empty) {
  panel.replaceChildren();
  for (const row of rows) {
    const item = document.createElement('p');
    item.textContent = row;
    panel.append(item);
  }
  if (!rows.length) panel.textContent = tr(empty);
}
const employeeScroll = new Map();
let restoringEmployeeHistory=false;
let employeeSalaryVisible = false;
function showEmployeeView(page) {
  if(page==='more')page='profile';
  if(page==='profile-salary')page='profile-personal';
  const previous=employeeView;
  if (previous !== page) {
    if (previous === 'requests') { employeeRequestFilter = 'pending'; requestScope='own'; teamRequestFilter='pending'; renderEmployeeRequests(); }
    if (previous === 'attendance') { attendanceMonth = attendanceDay = undefined; calendarLoad++; }
    if (previous === 'profile-leaves') { employeeLeaveTab = 'all'; renderEmployeeLeaveProfile(); }
    if (previous === 'profile') {
      employeeProfileTab = 'all';
      employeeProfileSearch = '';
      $('#employee-profile-search').value = '';
      filterEmployeeProfile();
    }
  }
  if (previous !== page && employeeSalaryVisible) {
    employeeSalaryVisible = false;
    if (session?.ok) renderPersonalProfile();
  }
  if(previous!==page){employeeScroll.set(previous,window.scrollY);if(!restoringEmployeeHistory){history.replaceState({...history.state,employeeView:previous,scroll:window.scrollY},'');history.pushState({employeeView:page,previousView:previous,profileTab:employeeProfileTab,leaveTab:employeeLeaveTab},'',location.pathname+'#view/'+page);}}
  employeeView = page;
  $('#employee-home-tabs').hidden = page !== 'home' || !session?.ok || !session.canReviewTeam;
  for (const view of dashboard.querySelectorAll('[data-employee-view]')) view.hidden = view.dataset.employeeView !== page;
  for (const button of $('#employee-bottom-nav').querySelectorAll('button')) {
    if (button.dataset.employeePage === (page.startsWith('profile') ? 'profile' : page)) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (page === 'attendance') showAttendanceScope();
  if (page === 'home') homeView.insertBefore(attendanceCard, $('#employee-personal-home'));
  if(previous!==page)requestAnimationFrame(()=>window.scrollTo({top:employeeScroll.get(page)??0}));
}
const attendanceLabels = { complete: 'حضور مكتمل', issue: 'بصمة ناقصة أو غياب', missing: 'بصمة ناقصة', off: 'لا يلزم الحضور', pending: 'الفترة لم تكتمل بعد' };
const attendanceDayLabel = day => day.officialHoliday?.length ? day.officialHoliday.map(name=>employeeLanguage==='ar'?(ar[name]??name):name).join(' / ') : tr(day.date > session?.today ? 'مستقبلية' : day.leave ? 'إجازة معتمدة' :
  day.missingPunchKinds?.length ? (employeeLanguage==='ar'?'بصمة ناقصة':'Missing punch') : day.status === 'issue' && !day.punches.length ? 'غائب' : attendanceLabels[day.status]);
let attendanceMonth, attendanceDay, attendanceCalendar;
let calendarLoad = 0;

function sampleCalendar(month, today) {
  const lastDay = new Date(month);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  return { today, days: Array.from({ length: lastDay.getUTCDate() }, (_, index) => {
    const number = index + 1;
    const date = month.toISOString().slice(0, 7) + '-' + String(number).padStart(2, '0');
    const leave = [7, 8, 21].includes(number);
    const status = leave ? 'off' : [4, 15, 25].includes(number) ? 'issue' : 'complete';
    return { date, leave, status,
      periods: leave ? [] : [{ name: tr('الفترة الصباحية'), start: '09:00', end: '17:00' }],
      punches: status === 'complete' ? [
        { kind: 'in', time: date + 'T09:00:00+03:00' },
        { kind: 'out', time: date + 'T17:00:00+03:00' },
      ] : [] };
  }) };
}

function renderCalendarDay() {
 const details=$('#employee-calendar-details'),day=attendanceCalendar.days.find(item=>item.date===attendanceDay);if(!day)return;
 const L=(a,b)=>employeeLanguage==='ar'?a:b;
 const heading=dateFormatter(employeeLanguage,{day:'numeric',month:'long',calendar:'gregory',timeZone:'UTC'}).format(Date.parse(day.date));
 const badgeTone=day.missingPunchKinds?.length?'amber':day.status==='complete'?'green':day.status==='issue'?'red':'neutral';
 details.innerHTML='<header class="employee-section-heading"><h3>'+esc(L('بصمات ','Punches · ')+heading)+'</h3><span class="badge '+badgeTone+'">'+esc(attendanceDayLabel(day))+'</span></header>';
 const records=document.createElement('div');records.className='employee-daily-punches';
 const punches=[...(day.punches??[])].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 for(const punch of punches){
  const row=document.createElement('div');row.className='employee-daily-punch '+(punch.kind==='in'?'arrival':'departure');
  row.classList.add('employee-punch-record');
  const metadata=[punch.site,punch.device].filter(Boolean).join(' · ');
  if(metadata)row.title=metadata;
  row.innerHTML='<strong>'+L(punch.kind==='in'?'دخول':'خروج',punch.kind==='in'?'Clock-in':'Clock-out')+
    '</strong><bdi class="badge neutral">'+esc(employeeClock().format(Date.parse(punch.time)))+'</bdi>'+
    (punch.period||metadata?'<small>'+esc(punch.period||metadata)+'</small>':'');
  records.append(row);
 }
 for(const kind of day.missingPunchKinds??[]){const row=document.createElement('div');row.className='employee-daily-punch employee-missing-punch';row.innerHTML='<span class="employee-card-copy"><strong>'+L(kind==='in'?'تسجيل الدخول':'تسجيل الانصراف',kind==='in'?'Clock-in':'Clock-out')+'</strong></span><strong>'+L('غير مسجل','Not recorded')+'</strong>';records.append(row);}
 if(!punches.length){const empty=document.createElement('p');empty.className='hint';empty.textContent=tr('لا توجد بصمات مسجلة بعد.');records.append(empty);}
 const total=document.createElement('div');total.className='employee-daily-total';total.innerHTML='<span>'+L('ساعات العمل المسجلة','Recorded working time')+'</span><strong>'+esc(recordedDuration(day.workedMinutes,employeeLanguage))+'</strong>';records.append(total);details.append(records);
 for(const period of day.periods??[]){const p=document.createElement('p');p.className='employee-day-period hint';p.textContent=period.name+' · '+period.start+' — '+period.end;details.append(p);}
 if(day.date<=session.today&&session.attendanceTypes.includes('Missed punch')){
  const correction=document.createElement('button');correction.type='button';correction.className='employee-correction-link';correction.dataset.quickRequest='Missed punch';correction.dataset.correctionDate=day.date;correction.innerHTML=iconBox(cardIcons.correction)+'<span>'+L('توجد مشكلة؟ قدّم طلب تصحيح','Something wrong? Request a correction')+'</span>';details.append(correction);
 }
 for(const button of $('#employee-calendar-grid').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.date===attendanceDay));
}

async function loadAttendanceCalendar(step = 0) {
  const current = session;
  if (!current?.ok) return;
  const month = new Date((attendanceMonth ?? current.today.slice(0, 7)) + '-01T00:00:00Z');
  month.setUTCMonth(month.getUTCMonth() + step);
  const selectedMonth = month.toISOString().slice(0, 7);
  attendanceMonth = selectedMonth;
  const load = ++calendarLoad;
  const grid = $('#employee-calendar-grid');
  const details = $('#employee-calendar-details');
  const options = { calendar: 'gregory', timeZone: 'UTC' };
  $('#employee-calendar-month').textContent = new Intl.DateTimeFormat(employeeLanguage, { ...options, month: 'long', year: 'numeric' }).format(month);
  grid.replaceChildren();
  details.textContent = tr('جاري تحميل البصمات…');
  try {
    const result = sampleRequestPreview ? { ok: true, ...sampleCalendar(month, current.today) } :
      await api('calendar?month=' + encodeURIComponent(selectedMonth));
    if (load !== calendarLoad || current !== session) return;
    if (!result.ok) throw new Error();
    attendanceCalendar = result;
    renderAttendanceTotals(result);
    if (!result.days.some(day => day.date === attendanceDay)) {
      attendanceDay = result.today.startsWith(selectedMonth) ? result.today : result.days[0].date;
    }
    const weekdays = new Intl.DateTimeFormat(employeeLanguage, { ...options, weekday: 'short' });
    const number = new Intl.NumberFormat(employeeLanguage);
    for (let i = 0; i < 7; i++) {
      const label = document.createElement('small');
      label.textContent = weekdays.format(Date.UTC(2026, 0, 4 + i));
      grid.append(label);
    }
    for (let i = 0; i < month.getUTCDay(); i++) grid.append(document.createElement('span'));
    for (const day of result.days) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.date = day.date;
      button.dataset.dayStatus = day.missingPunchKinds?.length ? 'missing' : day.status;
      button.textContent = number.format(Number(day.date.slice(-2)));
      if(day.missingPunchKinds?.length){const flag=document.createElement('span');flag.className='employee-missing-flag';flag.textContent='!';flag.setAttribute('aria-hidden','true');button.append(flag);}
      button.setAttribute('aria-label', number.format(Number(day.date.slice(-2))) + '، ' + attendanceDayLabel(day));
      button.onclick = () => { attendanceDay = day.date; renderCalendarDay(); };
      grid.append(button);
    }
    renderCalendarDay();
  } catch {
    if (load === calendarLoad && current === session) details.textContent = tr('تعذّر تحميل التقويم.');
  }
}

for (const button of document.querySelectorAll('[data-attendance-month]')) {
  button.onclick = () => loadAttendanceCalendar(Number(button.dataset.attendanceMonth));
}

// Month totals above the personal calendar, using the same status colours as the legend.
function renderAttendanceTotals(calendar) {
  const L = (a, b) => employeeLanguage === 'ar' ? a : b;
  const number = new Intl.NumberFormat(employeeLanguage);
  const past = calendar.days.filter(day => day.date <= calendar.today);
  const tiles = [
    [number.format(past.filter(day => day.punches?.length).length), L('أيام الحضور', 'Days attended'), 'complete'],
    [number.format(past.filter(day => day.status === 'issue' || day.missingPunchKinds?.length).length), L('تحتاج مراجعة', 'Need review'), 'issue'],
    [number.format(past.filter(day => day.leave).length), L('أيام الإجازة', 'Leave days'), 'off'],
    [recordedDuration(past.reduce((sum, day) => sum + (day.workedMinutes || 0), 0), employeeLanguage), L('ساعات العمل', 'Hours worked'), ''],
  ];
  $('#employee-attendance-totals').innerHTML = tiles.map(([value, label, status]) =>
    '<div' + (status ? ' data-day-status="' + status + '"' : '') + '><strong>' + esc(value) + '</strong><small>' + esc(label) + '</small></div>').join('');
}

// Managers who also punch can switch between their own attendance and the team's.
const attendanceScopeKey = 'dawamkom-attendance-scope';
let attendanceScope = null, attendanceTeamLoad = 0;
function preferredAttendanceScope() {
  if (!session?.canReviewTeam) return 'personal';
  if (attendanceScope) return attendanceScope;
  try { const saved = localStorage.getItem(attendanceScopeKey); if (saved === 'personal' || saved === 'team') return saved; } catch {}
  return 'team';
}
function showAttendanceScope(scope = preferredAttendanceScope()) {
  const team = Boolean(session?.canReviewTeam) && scope === 'team';
  attendanceScope = team ? 'team' : 'personal';
  $('#employee-attendance-scope').hidden = !session?.canReviewTeam;
  $('#employee-attendance-team').hidden = !team;
  $('#employee-attendance-personal').hidden = team;
  for (const button of document.querySelectorAll('[data-attendance-scope]'))
    button.setAttribute('aria-pressed', String(button.dataset.attendanceScope === attendanceScope));
  if (team) void renderAttendanceTeam(); else void loadAttendanceCalendar();
}
function chooseAttendanceScope(scope) {
  try { localStorage.setItem(attendanceScopeKey, scope); } catch {}
  attendanceScope = scope;
  showAttendanceScope(scope);
}
for (const button of document.querySelectorAll('[data-attendance-scope]'))
  button.onclick = () => chooseAttendanceScope(button.dataset.attendanceScope);

async function renderAttendanceTeam() {
  const L = (a, b) => employeeLanguage === 'ar' ? a : b;
  const load = ++attendanceTeamLoad;
  const list = $('#employee-attendance-team-list');
  list.replaceChildren();
  mountTeamAttendance(list, session.teamSummary, L,
    { cards: true, isOpen: () => load === attendanceTeamLoad && employeeView === 'attendance' && attendanceScope === 'team' });
}
function showHomeTab(tab) {
  homeTab = session.canReviewTeam ? tab : 'personal';
  attendanceCard.hidden=homeTab==='team';
  const taskPanel=$('#employee-assigned-tasks');
  if(homeTab==='team')$('#employee-team-home').insertBefore(taskPanel,$('#employee-team-attendance-section'));
  else $('#employee-personal-home').insertBefore(taskPanel,$('#employee-home-requests-list').parentElement);
  $('#employee-personal-home').hidden = homeTab !== 'personal';
  $('#employee-team-home').hidden = homeTab !== 'team';
  for (const button of $('#employee-home-tabs').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.employeeHome === homeTab));
  }
}
const sampleRequestPreview = ['127.0.0.1', '192.168.1.42'].includes(location.hostname) &&
  new URLSearchParams(location.search).get('preview') === 'requests';
$('#employee-sample-requests').hidden = !sampleRequestPreview;
const reviewedSamples = new Set();

function requestSamples() {
  const today = session.today;
  const day = offset => new Date(Date.parse(today) + offset * 86400000).toISOString().slice(0, 10);
  return [
    { id: 'preview-leave-1', employee: 'سارة أحمد', type: 'Annual leave', status: 'Approved', submittedOn: day(-2), date: day(3), end: day(5) },
    { id: 'preview-leave-2', employee: 'عمر خالد', type: 'Annual leave', status: 'Approved', submittedOn: day(-4), date: day(7), end: day(9) },
    { id: 'preview-request-1', employee: 'نورة علي', type: 'Missed punch', status: 'Pending', submittedOn: today, date: today },
    { id: 'preview-request-2', employee: 'عمر خالد', type: 'Attendance excuse', status: 'Pending', submittedOn: today, date: day(1) },
    { id: 'preview-request-3', employee: 'سارة أحمد', type: 'Attendance excuse', status: 'Declined', submittedOn: day(-2), date: day(-1) },
    { id: 'preview-request-4', employee: 'نورة علي', type: 'Annual leave', status: 'Cancelled', submittedOn: day(-3), date: day(1), end: day(2) },
  ];
}

function showPresentStaff(summary, L) {
  const dialog = employeeActionDialog(L('سجّلوا حضورًا اليوم','Clocked in today'),tr('إغلاق'),'employee-present-staff');
  mountTeamAttendance(dialog, summary, L, {isOpen:()=>dialog.open,setTitle:title=>{dialog.querySelector('h2').textContent=title;dialog.setAttribute('aria-label',title);}});
  dialog.showModal();
}

function mountTeamAttendance(host, summary, L, {isOpen=()=>host.isConnected,setTitle=()=>{},cards=false}={}) {
  const today = session.today;
  const toolbar = document.createElement('div');
  toolbar.className = 'employee-team-attendance-dates';
  const label = document.createElement('label');
  label.textContent = L('تاريخ الحضور','Attendance date');
  if (cards) {
    host.classList.add('employee-team-cards-mode');
    toolbar.classList.add('employee-team-datebar');
    label.replaceChildren(Object.assign(document.createElement('span'),{className:'sr-only',textContent:label.textContent}));
  }
  const picker = document.createElement('input');
  picker.type = 'date';
  picker.setAttribute('aria-label',label.textContent);
  picker.value = picker.max = today;
  label.append(picker);
  const stepButton = text => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button secondary compact';
    button.textContent = text;
    return button;
  };
  const previous = stepButton(cards ? L('›','‹') : L('السابق','Previous'));
  const next = stepButton(cards ? L('‹','›') : L('التالي','Next'));
  if (cards) {
    previous.setAttribute('aria-label',L('اليوم السابق','Previous day'));
    next.setAttribute('aria-label',L('اليوم التالي','Next day'));
    previous.classList.add('employee-icon-button');
    next.classList.add('employee-icon-button');
  }
  const filters = document.createElement('div');
  filters.className = 'employee-team-attendance-filters' + (cards ? ' employee-team-chips' : '');
  filters.setAttribute('role','group');
  filters.setAttribute('aria-label',L('حالة الحضور','Attendance status'));
  const content = document.createElement('div');
  const status = document.createElement('p');
  status.setAttribute('role','status');
  status.hidden = true;
  toolbar.append(previous,label,next);
  host.append(toolbar,filters,status,content);
  let load = 0;
  let selected = today;
  let filter = 'all';
  let attendance;
  const counts = new Map();
  const render = () => {
    content.replaceChildren();
    if (cards) {
      const rows = attendance ? teamShifts([...attendance.punches ?? [],...attendance.absentShifts ?? []]) : [];
      for (const [key,count] of counts) count.textContent = attendance ? new Intl.NumberFormat(employeeLanguage)
        .format(rows.filter(shift => key === 'all' || (shift[0].shiftStatus ?? 'incomplete') === key).length) : '';
    }
    if (attendance) (cards ? renderTeamCards : renderPresentStaff)(content,attendance,L,filter);
  };
  for (const [key,text] of [['all',L('الكل','All')],['complete',L('مكتمل','Complete')],['incomplete',L('غير مكتمل','Incomplete')],['absent',L('غياب','Absent')]]) {
    if (key === 'complete' && !cards) continue;
    const button = stepButton(text);
    if (cards) { const count = document.createElement('b'); counts.set(key,count); button.append(' ',count); }
    button.setAttribute('aria-pressed',String(key === filter));
    button.onclick = () => {
      if (filter === key) return;
      filter = key;
      filters.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed','false');
      button.setAttribute('aria-pressed','true');
      render();
    };
    filters.append(button);
  }
  const select = async day => {
    if (!day || day > today) { picker.value = selected; return; }
    selected = picker.value = day;
    const title = day === today ? L('سجّلوا حضورًا اليوم','Clocked in today') : L('سجل الحضور','Attendance history');
    setTitle(title);
    next.disabled = day >= today;
    const request = ++load;
    attendance = null;
    render();
    status.hidden = day === today;
    status.textContent = status.hidden ? '' : L('جارٍ تحميل الحضور…','Loading attendance…');
    try {
      const result = day === today ? summary : await api('team-attendance?date=' + encodeURIComponent(day));
      if (request !== load || !isOpen()) return;
      if (result.ok === false) throw new Error('Could not load team attendance');
      status.hidden = true;
      attendance = result;
      render();
    } catch {
      if (request === load && isOpen()) status.textContent = L('تعذّر تحميل الحضور لهذا اليوم.','Could not load attendance for this day.');
    }
  };
  const step = delta => void select(new Date(Date.parse(selected) + delta * 86400000).toISOString().slice(0,10));
  previous.onclick = () => step(-1);
  next.onclick = () => step(1);
  picker.onchange = () => void select(picker.value);
  void select(today);
}

function renderPresentStaff(content,{punches, branches = [], absentShifts = []}, L, filter) {
  const rows = [...punches,...absentShifts].filter(row => filter === 'all' || (row.shiftStatus ?? 'incomplete') === filter);
  if (!rows.length) {
    const message = document.createElement('p');
    message.textContent = filter === 'all' ? L('لا توجد سجلات حضور لهذا اليوم.','No attendance records for this day.') :
      L('لا توجد سجلات بهذه الحالة لهذا اليوم.','No records with this status for this day.');
    content.append(message);
    return;
  }
  const table = document.createElement('table');
  table.className = 'employee-team-punch-table';
  const headings = table.createTHead().insertRow();
  for (const label of [L('الموظف','Employee'),L('الفترة','Shift'),L('وقت التحضير','Punch time')]) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headings.append(cell);
  }
  const groups = new Map(branches.length > 1
    ? branches.map(({id,name}) => [id,{name,rows:[]}])
    : [[null,{rows:[]}]]);
  for (const row of rows) {
    const id = groups.has(row.branchId) ? row.branchId : null;
    if (!groups.has(id)) groups.set(id,{name:L('بدون فرع','No branch'),rows:[]});
    groups.get(id).rows.push(row);
  }
  const name = person => employeeLanguage === 'ar' ? person.nameAr || person.name || person.nameEn : person.nameEn || person.name || person.nameAr;
  const collator = new Intl.Collator(employeeLanguage);
  const statusLabels = {
    complete:L('مكتمل','Complete'),
    absent:L('غياب','Absent'),
    incomplete:L('غير مكتمل','Incomplete'),
  };
  let openBranch = null;
  for (const group of groups.values()) {
    if (!group.rows.length) continue;
    const body = table.createTBody();
    if (group.name) {
      const heading = document.createElement('th');
      heading.scope = 'rowgroup';
      heading.colSpan = 3;
      heading.className = 'employee-punch-branch';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = group.name;
      toggle.className = 'employee-punch-branch-toggle';
      const setOpen = open => {
        toggle.setAttribute('aria-expanded', String(open));
        body.classList.toggle('employee-punch-branch-collapsed', !open);
      };
      toggle.onclick = () => {
        const wasOpen = openBranch === setOpen;
        openBranch?.(false);
        openBranch = wasOpen ? null : setOpen;
        openBranch?.(true);
      };
      if (!openBranch) {
        openBranch = setOpen;
        setOpen(true);
      } else setOpen(false);
      heading.append(toggle);
      const headerRow = body.insertRow();
      headerRow.className = 'employee-punch-branch-header';
      headerRow.append(heading);
    }
    const grouped = group.rows.sort((a,b) => Number(b.administrator) - Number(a.administrator) ||
      collator.compare(name(a),name(b)) || a.staffId.localeCompare(b.staffId) ||
      (a.shiftStart ?? Infinity) - (b.shiftStart ?? Infinity) || Date.parse(a.time) - Date.parse(b.time));
    const shifts = [];
    for (const punch of grouped) {
      const previous = shifts.at(-1);
      if (punch.shiftStart != null && previous?.[0].staffId === punch.staffId &&
          previous[0].shiftStart === punch.shiftStart) previous.push(punch);
      else shifts.push([punch]);
    }
    for (const shift of shifts) {
      const [punch] = shift;
      const spacer = body.insertRow();
      spacer.className = 'employee-punch-person-gap';
      spacer.setAttribute('aria-hidden', 'true');
      spacer.insertCell().colSpan = 3;
      const row = body.insertRow();
      const shiftStatus = punch.shiftStatus ?? 'incomplete';
      row.className = 'employee-punch-person employee-punch-person-start employee-punch-person-end';
      row.dataset.shiftStatus = shiftStatus;
      row.insertCell().textContent = name(punch);
      const period = row.insertCell();
      period.textContent = punch.periodName || '—';
      if (Number.isFinite(punch.scheduledStart) && Number.isFinite(punch.scheduledEnd)) {
        const hours = document.createElement('small');
        hours.className = 'employee-punch-shift-hours';
        for (const [index, endpoint] of [punch.scheduledStart, punch.scheduledEnd].entries()) {
          if (index) hours.append(' – ');
          const clock = document.createElement('bdi');
          clock.textContent = employeeClock().format(endpoint);
          hours.append(clock);
        }
        period.append(hours);
      }
      const status = document.createElement('small');
      status.textContent = statusLabels[shiftStatus];
      period.append(status);
      const timing = row.insertCell();
      if (!punch.kind) {
        timing.textContent = '—';
        continue;
      }
      for (const entry of shift) {
        const item = document.createElement('div');
        item.className = 'employee-punch-entry';
        const clock = document.createElement('bdi');
        const time = Date.parse(entry.time);
        clock.textContent = Number.isFinite(time) ? employeeClock().format(time) : '—';
        const kind = document.createElement('small');
        kind.textContent = entry.kind === 'in' ? L('دخول','Clock-in') : L('خروج','Clock-out');
        item.append(clock,kind);
        timing.append(item);
      }
    }
  }
  content.append(table);
}

function teamShifts(rows) {
  const name = person => employeeLanguage === 'ar' ? person.nameAr || person.name || person.nameEn : person.nameEn || person.name || person.nameAr;
  const collator = new Intl.Collator(employeeLanguage);
  const sorted = [...rows].sort((a,b) => Number(b.administrator) - Number(a.administrator) ||
    collator.compare(name(a),name(b)) || a.staffId.localeCompare(b.staffId) ||
    (a.shiftStart ?? Infinity) - (b.shiftStart ?? Infinity) || Date.parse(a.time) - Date.parse(b.time));
  const shifts = [];
  for (const punch of sorted) {
    const previous = shifts.at(-1);
    if (punch.shiftStart != null && previous?.[0].staffId === punch.staffId &&
        previous[0].shiftStart === punch.shiftStart) previous.push(punch);
    else shifts.push([punch]);
  }
  return shifts;
}

// Phone layout for the attendance tab: one card per person and shift instead of a squeezed table.
function renderTeamCards(content,{punches = [], branches = [], absentShifts = []}, L, filter) {
  const shifts = teamShifts([...punches,...absentShifts]).filter(shift => filter === 'all' || (shift[0].shiftStatus ?? 'incomplete') === filter);
  if (!shifts.length) {
    const message = document.createElement('p');
    message.className = 'employee-team-empty';
    message.textContent = filter === 'all' ? L('لا توجد سجلات حضور لهذا اليوم.','No attendance records for this day.') :
      L('لا توجد سجلات بهذه الحالة لهذا اليوم.','No records with this status for this day.');
    content.append(message);
    return;
  }
  const name = person => employeeLanguage === 'ar' ? person.nameAr || person.name || person.nameEn : person.nameEn || person.name || person.nameAr;
  const statusLabels = { complete:L('مكتمل','Complete'), absent:L('غياب','Absent'), incomplete:L('غير مكتمل','Incomplete') };
  const groups = new Map(branches.length > 1 ? branches.map(({id,name}) => [id,{name,shifts:[]}]) : [[null,{shifts:[]}]]);
  for (const shift of shifts) {
    const id = groups.has(shift[0].branchId) ? shift[0].branchId : null;
    if (!groups.has(id)) groups.set(id,{name:L('بدون فرع','No branch'),shifts:[]});
    groups.get(id).shifts.push(shift);
  }
  let first = true;
  for (const group of groups.values()) {
    if (!group.shifts.length) continue;
    const list = document.createElement('div');
    list.className = 'employee-team-card-list';
    for (const shift of group.shifts) {
      const [punch] = shift;
      const shiftStatus = punch.shiftStatus ?? 'incomplete';
      const card = document.createElement('article');
      card.className = 'employee-team-card';
      card.dataset.shiftStatus = shiftStatus;
      const head = document.createElement('div');
      head.className = 'employee-team-card-head';
      const avatar = document.createElement('span');
      avatar.className = 'employee-team-avatar';
      avatar.setAttribute('aria-hidden','true');
      avatar.textContent = [...(name(punch) || '?').trim()][0] ?? '?';
      const who = document.createElement('span');
      who.className = 'employee-team-who';
      const title = document.createElement('b');
      title.textContent = name(punch) + (punch.self ? ' ' + L('(أنت)','(you)') : '');
      const period = document.createElement('small');
      const scheduled = Number.isFinite(punch.scheduledStart) && Number.isFinite(punch.scheduledEnd);
      period.textContent = [punch.jobTitle ? tr(punch.jobTitle) : '', scheduled ? '' : punch.periodName || ''].filter(Boolean).join(' · ');
      if (scheduled) {
        if (period.textContent) period.append(' · ');
        const hours = document.createElement('bdi');
        hours.textContent = employeeClock().format(punch.scheduledStart) + ' – ' + employeeClock().format(punch.scheduledEnd);
        period.append(hours);
      }
      who.append(title,period);
      const pill = document.createElement('span');
      pill.className = 'badge ' + ({complete:'green',absent:'red'}[shiftStatus] ?? 'amber');
      pill.textContent = statusLabels[shiftStatus];
      head.append(avatar,who,pill);
      card.append(head);
      const times = document.createElement('div');
      times.className = 'employee-team-times';
      const firstIn = shift.find(entry => entry.kind === 'in'), lastOut = shift.findLast(entry => entry.kind === 'out');
      for (const [kind,text,entry] of [['in',L('أول تسجيل حضور','First clock-in'),firstIn],['out',L('آخر انصراف','Last clock-out'),lastOut]]) {
        const item = document.createElement('div');
        const caption = document.createElement('small');
        caption.textContent = text;
        const clock = document.createElement('bdi');
        const time = Date.parse(entry?.time);
        clock.textContent = Number.isFinite(time) ? employeeClock().format(time) : '—';
        item.dataset.kind = kind;
        item.append(caption,clock);
        times.append(item);
      }
      card.append(times);
      list.append(card);
    }
    if (group.name) {
      const details = document.createElement('details');
      details.className = 'employee-team-branch';
      details.open = first;
      const summary = document.createElement('summary');
      summary.textContent = group.name + ' ';
      const count = document.createElement('b');
      count.textContent = new Intl.NumberFormat(employeeLanguage).format(group.shifts.length);
      summary.append(count);
      details.append(summary,list);
      content.append(details);
    } else content.append(list);
    first = false;
  }
}

function renderTeamHome() {
 if(!session.canReviewTeam)return;
 const L=(a,b)=>employeeLanguage==='ar'?a:b;
 const requests=sampleRequestPreview?requestSamples().filter(r=>!reviewedSamples.has(r.id)):session.teamRequests??[];
 const pending=pendingTeamRequests(requests);
 const metrics=$('#employee-team-metrics'),summary=session.teamSummary;
 metrics.replaceChildren();
 for (const [value,label,open] of [
   [summary?.staff,L('موظفًا','Employees')],
   [summary?.present,L('سجّلوا حضورًا','Clocked in today'),Array.isArray(summary?.punches) ? () => showPresentStaff(summary,L) : null],
   [pending.length,L('بانتظارك','Awaiting you')],
 ]) {
   const item = document.createElement('div');
   const count = document.createElement('strong'), caption = document.createElement('small');
   count.textContent = Number.isFinite(value) ? new Intl.NumberFormat(employeeLanguage).format(value) : '—';
   caption.textContent = label;
   if (open) {
     const button = document.createElement('button');
     button.type = 'button';
     button.className = 'employee-team-metric-action';
     button.setAttribute('aria-haspopup','dialog');
     button.onclick = open;
     button.append(count,caption);
     item.append(button);
   } else item.append(count,caption);
   metrics.append(item);
 }
 $('#employee-team-requests-title').textContent=L('طلبات تحتاج موافقتك','Requests awaiting your approval')+' ('+pending.length+')';
 const list=$('#employee-team-requests');list.replaceChildren();
 if(!pending.length){const empty=document.createElement('li');empty.className='employee-empty-state';empty.textContent=tr('لا توجد طلبات معلّقة للفريق.');list.append(empty);}
 for(const request of pending){
  const item=document.createElement('li'),button=document.createElement('button');item.className='employee-home-approval';button.type='button';button.className='employee-approval-card';
  button.innerHTML='<span class="employee-card-top"><span class="employee-request-person"><span class="employee-initial" aria-hidden="true">'+esc(Array.from(request.employee?.trim()??'')[0]??'•')+'</span><strong>'+esc(request.employee)+'</strong></span><span class="badge neutral">'+esc(employeeRequestLabel(request.type))+'</span></span><strong class="employee-approval-date">'+esc(requestDates(request))+'</strong>'+((request.proposedIn||request.proposedOut)?'<small>'+esc(L('الوقت المطلوب: ','Requested time: ')+(request.proposedIn||request.proposedOut))+'</small>':'')+'<span class="employee-card-foot"><span>'+esc(dateText(request.submittedOn)||'')+'</span><strong>'+L('مراجعة الطلب ‹','Review request ›')+'</strong></span>';
  button.onclick=()=>openTeamApproval(request);
  item.append(button,teamApprovalActions(request));list.append(item);
 }
 const leaves=requests.filter(r=>r.status==='Approved').sort((a,b)=>a.date.localeCompare(b.date));
 const leaveList=$('#employee-team-leave');leaveList.parentElement.hidden=!leaves.length;
 leaveList.replaceChildren(...leaves.map(request=>{const item=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='employee-approval-card';button.innerHTML='<strong>'+esc(request.employee)+'</strong><small>'+esc(employeeRequestLabel(request.type)+' · '+requestDates(request))+'</small>';button.onclick=()=>openRequestDetails(request);item.append(button);return item;}));
}

function pendingTeamRequests(requests=session.teamRequests??[]) {
 return requests.filter(r=>r.status==='Pending').concat((sampleRequestPreview?[]:session.deviceRequests??[]).map(r=>({id:r.requestId,staffId:r.staffId,employee:r.name,type:tr('طلب تغيير الجوال'),status:'Pending',submittedOn:r.submittedOn,browser:true,approvalIndex:r.approvalIndex,approvalCount:r.approvalCount})));
}

function openTeamApproval(request) {
 const dialog=openRequestDetails(request);
 dialog.append(teamApprovalActions(request,dialog));
 return dialog;
}

function teamApprovalActions(request,dialog) {
 const L=(ar,en)=>employeeLanguage==='ar'?ar:en;
 const panel=document.createElement('div');
 panel.className='employee-approval-controls';
 const actions=document.createElement('div');
 actions.className='employee-team-actions';
 const feedback=document.createElement('p');
 feedback.setAttribute('role','status');
 const form=document.createElement('form');
 form.hidden=true;
 const label=document.createElement('label');
 label.textContent=L('تعليق للموظف (اختياري)','Comment for the employee (optional)');
 const note=document.createElement('textarea');
 note.rows=3;note.maxLength=2000;
 label.append(note);
 const button=(text,style='secondary')=>{
  const control=document.createElement('button');
  control.type='button';control.className='button '+style;control.textContent=text;
  return control;
 };
 const approve=button(tr('موافقة'),'primary'),reject=button(tr('رفض'));
 const confirm=button(L('تأكيد الرفض','Confirm rejection'),'primary'),cancel=button(L('إلغاء','Cancel'));
 confirm.type='submit';
 reject.setAttribute('aria-expanded','false');
 const setReject=open=>{
  form.hidden=!open;
  reject.setAttribute('aria-expanded',String(open));
  if(open)note.focus();else reject.focus();
 };
 const decide=(control,status)=>run(control,async()=>{
  const controls=[approve,reject,confirm,cancel,note];
  controls.forEach(element=>{element.disabled=true;});
  try{
   if(sampleRequestPreview){
    reviewedSamples.add(request.id);dialog?.close();renderTeamHome();renderTeamRequestPage();return;
   }
   const approved=status==='Approved';
   const comment=approved?{}:{rejectionNote:note.value.trim()};
   const result=request.browser?
    await api('device-approval',{staffId:request.staffId,requestId:request.id,decision:approved?'approve':'reject',...comment}):
    await api('team-decision',{id:request.id,status,...comment});
   if(!result.ok)throw Error(result.error);
   dialog?.close();
   await show();
   employeeToast(result.forwarded?'تم تحويل الطلب لمسؤول الموافقة التالي.':approved?'تم اعتماد الطلب.':'تم رفض الطلب.');
  }finally{controls.forEach(element=>{element.disabled=false;});}
 },feedback);
 approve.onclick=()=>decide(approve,'Approved');
 reject.onclick=()=>setReject(form.hidden);
 cancel.onclick=()=>setReject(false);
 form.onsubmit=event=>{event.preventDefault();void decide(confirm,'Declined');};
 form.append(label,confirm,cancel);
 actions.append(approve,reject);
 panel.append(actions,form,feedback);
 return panel;
}

function receiveTaskButton(task,onReceived){
 const button=document.createElement('button');button.type='button';button.className='button secondary compact';button.textContent=employeeLanguage==='ar'?'استلام':'Receive';
 button.onclick=async()=>{button.disabled=true;try{const result=await api('follow-up/receive',{itemId:task.id,expectedVersion:task.version});if(!result.ok)throw Error(result.error);await show();onReceived?.();}catch(error){button.disabled=false;let feedback=button.parentElement.querySelector('[role=status]');if(!feedback){feedback=document.createElement('p');feedback.setAttribute('role','status');button.after(feedback);}feedback.textContent=error.message;}};
 return button;
}
function manageTaskButton(task){
 const button=document.createElement('button');button.type='button';button.className='button secondary compact';button.textContent=employeeLanguage==='ar'?'إدارة المهمة':'Manage task';
 button.onclick=async()=>{
  button.disabled=true;
  try{
   const data=await api('follow-up/options?itemId='+encodeURIComponent(task.id));if(!data.ok)throw Error(data.error);
   const L=(a,b)=>employeeLanguage==='ar'?a:b,dialog=document.createElement('dialog');dialog.className='employee-sheet employee-task-dialog';dialog.setAttribute('aria-label',L('إدارة المهمة','Manage task'));
   dialog.innerHTML='<header class="employee-section-heading"><h2>'+esc(data.name)+'</h2><button type="button" class="button secondary" data-close>'+L('إغلاق','Close')+'</button></header><form><label>'+L('إسناد إلى','Assign to')+'<select name="assigneeId" required><option value="">'+L('اختر المسؤول','Choose assignee')+'</option>'+data.assignees.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===data.assigneeId?' selected':'')+'>'+esc(employeeLanguage==='en'?p.nameEn:p.name)+'</option>').join('')+'</select></label><label>'+L('الحالة','Status')+'<select name="status"><option value="'+esc(data.status)+'">'+(data.status==='in-progress'?L('قيد التنفيذ','In progress'):L('بانتظار الاستلام','Awaiting receipt'))+'</option><option value="completed">'+L('إغلاق المهمة — مكتملة','Close task — completed')+'</option></select></label><p role="status"></p><button class="button primary" type="submit">'+tr('حفظ')+'</button></form>';
   dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
   dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const submit=event.submitter;submit.disabled=true;try{const form=event.currentTarget,result=await api('follow-up/update',{itemId:data.itemId,expectedVersion:data.version,assigneeId:form.elements.assigneeId.value,status:form.elements.status.value});if(!result.ok)throw Error(result.error);dialog.close();await show();}catch(error){dialog.querySelector('[role=status]').textContent=error.message;submit.disabled=false;}};
   document.body.append(dialog);dialog.showModal();
  }catch(error){employeeToast(error.message,'error');}finally{button.disabled=false;}
 };
 return button;
}
function renderAssignedTasks(latest=session){
 const panel=$('#employee-assigned-tasks'),list=$('#employee-assigned-tasks-list');if(!panel||!list)return;
 const tasks=latest.assignedTasks??[];panel.hidden=!latest.canManageCompany||!tasks.length;
 const L=(a,b)=>employeeLanguage==='ar'?a:b;
 list.replaceChildren(...tasks.map(task=>{
  const item=document.createElement('li');item.className='employee-assigned-task-card';
  const state=task.status==='in-progress'?L('قيد التنفيذ','In progress'):L('بانتظار الاستلام','Awaiting receipt');
  item.innerHTML='<div class="employee-card-top"><span class="badge '+(task.overdue?'red':task.status==='new'?'amber':'green')+'">'+esc(task.overdue?L('متأخرة','Overdue'):state)+'</span></div><strong>'+esc(({residence:L('تجديد الإقامة','Residence renewal'),'work-permit':L('تجديد رخصة العمل','Work permit renewal'),staff:L('استكمال البيانات','Complete information'),document:L('تجديد مستند','Renew document')}[task.kind]||'')+' · '+task.name)+'</strong><small>'+esc(L('موعد الإنجاز: ','Completion deadline: ')+(dateText(task.dueOn)||'—'))+'</small>'+(task.expiresOn?'<small>'+esc(L('تاريخ الانتهاء: ','Expiry date: ')+dateText(task.expiresOn))+'</small>':'');
  if(latest.canManageFollowUp){const actions=document.createElement('div');actions.className='employee-task-actions';if(task.status==='new')actions.append(receiveTaskButton(task));actions.append(manageTaskButton(task));item.append(actions);}
  return item;
 }));
}
let employeeRequestFilter='pending';
function requestDates(request){
 const formatter=dateFormatter(employeeLanguage,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 const start=Date.parse(request.date),end=Date.parse(request.end);
 return Number.isFinite(start)?(end>start?formatter.formatRange(start,end):formatter.format(start)):(dateText(request.submittedOn)||'—');
}
function requestTitleLabel(request){return employeeRequestLabel(request.type)+(request.periodName?' · '+request.periodName:'')+(request.loanAmount?' · '+request.loanAmount+' SAR · '+request.repaymentInstallments+' '+(employeeLanguage==='ar'?'دفعات':'installments'):'');}
function requestProgress(request){
 const pending=request.approvalSteps?.find(step=>step.status==='Pending');
 if(request.status==='Pending')return pending?(employeeLanguage==='ar'?'لدى: ':'With: ')+(employeeLanguage==='ar'?(ar[pending.name]??pending.name??'—'):(pending.nameEn||pending.name||'—')):tr(ar.Pending);
 return request.status==='Approved'?(employeeLanguage==='ar'?'اكتمل الطلب':'Request completed'):(employeeLanguage==='ar'?'تاريخ التقديم: ':'Submitted: ')+(dateText(request.submittedOn)||'—');
}
function ownRequestButton(request,compact=false){
 const button=document.createElement('button');button.type='button';button.className=compact?'employee-own-request-compact':'employee-own-request-card';
 button.innerHTML=requestCardMarkup(request,{label:requestTitleLabel(request),statusLabel:tr(ar[request.status]??request.status),dateLabel:requestDates(request),progress:requestProgress(request),compact});button.onclick=()=>openRequestDetails(request);return button;
}
let requestScope='own', teamRequestFilter='pending';
function renderTeamRequestPage() {
 const L=(a,b)=>employeeLanguage==='ar'?a:b;
 const scope=$('#employee-request-scope');
 scope.hidden=!session.canReviewTeam;
 if(scope.hidden)requestScope='own';
 $('#employee-own-requests-panel').hidden=requestScope!=='own';
 $('#employee-team-requests-panel').hidden=requestScope!=='team';
 for(const button of scope.querySelectorAll('[data-request-scope]')){
  button.setAttribute('aria-pressed',String(button.dataset.requestScope===requestScope));
  button.onclick=()=>{requestScope=button.dataset.requestScope;teamRequestFilter='pending';renderTeamRequestPage();};
 }
 if(requestScope!=='team')return;
 const pending=pendingTeamRequests(sampleRequestPreview?requestSamples().filter(r=>!reviewedSamples.has(r.id)):undefined);
 const actionable=new Set(pending.map(r=>r.id));
 const all=[...new Map([...pending,...(session.teamRequestHistory??[]).filter(r=>!actionable.has(r.id))].map(r=>[r.id,r])).values()];
 for(const button of $('#employee-team-request-filters').querySelectorAll('button')){
  const key=button.dataset.teamRequestFilter;
  if(key==='pending')button.textContent=L('تحتاج موافقتي','Needs my approval')+' · '+pending.length;
  button.setAttribute('aria-pressed',String(key===teamRequestFilter));
  button.onclick=()=>{teamRequestFilter=key;renderTeamRequestPage();};
 }
 const panel=$('#employee-team-request-history');
 panel.replaceChildren(...(teamRequestFilter==='all'?all:pending).map(item=>{
  const button=ownRequestButton(item,true);
  const detail=actionable.has(item.id)?L('مراجعة الطلب ‹','Review request ›'):tr(ar[item.status]??item.status);
  button.innerHTML='<strong>'+esc(item.employee??'')+'</strong><span class="badge neutral">'+esc(employeeRequestLabel(item.type))+'</span><small>'+esc([requestDates(item)||dateText(item.submittedOn),detail].filter(Boolean).join(' · '))+'</small>';
  button.onclick=()=>actionable.has(item.id)?openTeamApproval(item):openRequestDetails(item);
  return button;
 }));
 if(!panel.children.length){const empty=document.createElement('p');empty.className='employee-empty-state';empty.textContent=L('لا توجد طلبات لعرضها.','No requests to show.');panel.append(empty);}
}
function updateAccountRequestsNote(){
 const pending=(session.ownRequests??[]).filter(r=>r.status==='Pending').length;
 $('#employee-account-requests-note').textContent=pending?(employeeLanguage==='ar'?pending+' قيد المراجعة':pending+' pending'):tr('عرض الطلبات وحالتها');
}
function renderEmployeeRequests(){
 const own=session.ownRequests??[],counts=requestCounts(own);
 updateAccountRequestsNote();
 for(const button of $('#employee-request-filters').querySelectorAll('[data-request-filter]')){
  const key=button.dataset.requestFilter,label=key==='all'?tr('الكل'):key==='pending'?tr(ar.Pending):tr('المكتملة');button.replaceChildren(document.createTextNode(label+' '));const count=document.createElement('b');count.textContent=new Intl.NumberFormat(employeeLanguage).format(counts[key]);button.append(count);button.setAttribute('aria-pressed',String(employeeRequestFilter===key));button.onclick=()=>{employeeRequestFilter=key;renderEmployeeRequests();};
 }
 const limit=$('#employee-history-limit');limit.hidden=!session.ownRequestsTruncated;limit.textContent=employeeLanguage==='ar'?'تعرض القائمة آخر 30 طلبًا؛ الأعداد تخص الطلبات المعروضة.':'Showing the latest 30 requests; counts apply to this list.';
 const filtered=filterRequests(own,employeeRequestFilter),panel=$('#employee-requests-history');panel.replaceChildren(...filtered.map(request=>ownRequestButton(request)));
 if(!filtered.length){const empty=document.createElement('p');empty.className='employee-empty-state';empty.textContent=tr('لا توجد طلبات لعرضها.');panel.append(empty);}
 renderAssignedTasks();
 const list=$('#employee-home-requests-list'),requests=sampleRequestPreview?requestSamples().slice(1):session.homeRequests??[];
 list.replaceChildren(...requests.slice(0,3).map(request=>{const item=document.createElement('li');item.append(ownRequestButton(request,true));return item;}));
 if(!requests.length){const empty=document.createElement('li');empty.className='employee-empty-state';empty.textContent=tr('لا توجد طلبات حالية.');list.append(empty);}
 renderTeamRequestPage();
}

function openRequestDetails(request) {
  const dialog=document.createElement('dialog');dialog.className='employee-sheet';dialog.setAttribute('aria-label',employeeRequestLabel(request.type));
  const header=document.createElement('header'),heading=document.createElement('h2'),close=document.createElement('button');heading.textContent=employeeRequestLabel(request.type);close.type='button';close.className='button secondary';close.textContent=employeeLanguage==='ar'?'إغلاق':'Close';close.onclick=()=>dialog.close();header.append(heading,close);dialog.append(header);
  const fields=[['الحالة',tr(ar[request.status]??request.status)],['الاعتماد',request.autoApproved?(employeeLanguage==='ar'?'اعتماد تلقائي بواسطة النظام — إداري دون مدير مباشر':'Automatically approved by the system — administrator without a direct manager'):null],['المدة',requestDates(request)],['السبب',request.note],['ملاحظات الرفض',request.rejectionNote]];
  for(const [label,value]of fields){if(!value)continue;const paragraph=document.createElement('p');paragraph.textContent=tr(label)+': '+value;dialog.append(paragraph);}
  for (const period of request.periodCorrections ?? []) {
    const card = document.createElement('fieldset'), legend = document.createElement('legend');
    card.className = 'employee-correction-period';
    legend.textContent = correctionPeriodLabel(period.periodName, period.shiftStart, period.shiftEnd);
    card.append(legend);
    for (const [label, original, proposed] of [
      [tr('دخول'), period.originalIn, period.proposedIn],
      [tr('خروج'), period.originalOut, period.proposedOut],
    ]) {
      if (!proposed) continue;
      const row = document.createElement('div');
      const before = original ? employeeClock().format(new Date(original)) : tr('لا توجد بصمة مسجلة');
      row.textContent = label + ' · ' + before + ' ⟶ ' + proposed;
      card.append(row);
    }
    dialog.append(card);
  }
  if(request.loanAmount){const note=document.createElement('p');note.textContent=request.loanAmount+' SAR · '+request.repaymentInstallments+' '+(employeeLanguage==='ar'?'دفعات':'installments');dialog.append(note);}
  const title=document.createElement('h3');title.textContent=employeeLanguage==='ar'?'مسار الموافقة':'Approval progress';dialog.append(title);
  const timeline=document.createElement('ol');timeline.className='ux-request-timeline';for(const step of request.autoApproved?[{name:'النظام',nameEn:'System',status:'Approved',at:request.decidedAt}]:(request.approvalSteps??[])){const row=document.createElement('li');row.textContent=(employeeLanguage==='en'?step.nameEn:step.name)+' · '+(step.status==='Waiting'?(employeeLanguage==='ar'?'خطوة لاحقة':'Next step'):tr(ar[step.status]??step.status))+(step.at?' · '+dateText(step.at):'');timeline.append(row);}if(!timeline.children.length){const row=document.createElement('li');row.textContent=request.browser?(employeeLanguage==='ar'?'مرحلة الموافقة ':'Approval step ')+((request.approvalIndex??0)+1)+(employeeLanguage==='ar'?' من ':' of ')+(request.approvalCount??1):(employeeLanguage==='ar'?'تتبع الموافقة غير متاح لهذا الطلب القديم.':'Approval tracking is not available for this earlier request.');timeline.append(row);}dialog.append(timeline);
  if(request.attachmentName){const attachment=document.createElement('a');attachment.href=location.pathname.replace(/\/employee\/?$/,'')+'/api/employee/request-attachment/'+encodeURIComponent(request.id);attachment.textContent=request.attachmentName;dialog.append(attachment);}
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();return dialog;
}
let employeeLeaveTab = history.state?.leaveTab ?? 'all';
function renderEmployeeLeaveProfile() {
  $('#employee-leave-balance-summary').hidden = employeeLeaveTab !== 'all';
  const balance = session.leaveBalance;
  const number = new Intl.NumberFormat(employeeLanguage, { maximumFractionDigits: 2 });
  const value = amount => Number.isFinite(amount) ? number.format(amount) : '—';
  const days = new Intl.NumberFormat(employeeLanguage, { style: 'unit', unit: 'day', unitDisplay: 'long', maximumFractionDigits: 2 });
  $('#employee-leave-contract-label').textContent = employeeLanguage === 'ar' ? 'الاستحقاق السنوي حسب العقد' : 'Annual entitlement under the contract';
  $('#employee-leave-contract-entitlement').textContent = Number.isFinite(balance?.entitlement) ? days.format(balance.entitlement) : '—';
  $('#employee-leave-entitlement').textContent = value(balance?.current);
  $('#employee-leave-entitlement').previousElementSibling.textContent = employeeLanguage==='ar'?'المكتسب في السنة التعاقدية حتى اليوم':'Earned this contractual year to date';
  let explanation=$('#employee-leave-explanation');if(!explanation){explanation=document.createElement('p');explanation.id='employee-leave-explanation';explanation.className='hint';$('#employee-leave-balance-summary').append(explanation);}
  explanation.textContent=(employeeLanguage==='ar'?'المتاح = المكتسب هذا العام + الرصيد المرحل. يُستهلك الأقدم أولًا. الرصيد السالب يعني استخدام رصيد مقدمًا.':'Available = earned this year + carried-over balance. The oldest balance is used first. A negative balance means leave was taken in advance.');
  $('#employee-leave-opening').textContent = value(balance?.opening);
  $('#employee-leave-expiry').textContent = balance?.openingExpires ?? '—';
  const available = availableLeave(balance);
  $('#employee-leave-available').textContent = value(available);
  $('#employee-leave-available-detail').textContent = value(available);
  $('#employee-leave-accrued').textContent = value(balance?.accrued);
  const maximum = (balance?.entitlement ?? 0) + (balance?.opening ?? 0);
  const currentProgress = maximum > 0 ? Math.max(0, Math.min(100, (balance?.current ?? 0) / maximum * 100)) : 0;
  const openingProgress = maximum > 0 ? Math.max(0, Math.min(100 - currentProgress, (balance?.opening ?? 0) / maximum * 100)) : 0;
  $('#employee-leave-gauge-value').style.strokeDasharray = currentProgress + ' 100';
  $('#employee-leave-gauge-opening').style.strokeDasharray = openingProgress + ' 100';
  $('#employee-leave-gauge-opening').style.strokeDashoffset = -currentProgress;
  for (const button of dashboard.querySelectorAll('[data-employee-leave-tab]'))
    button.setAttribute('aria-pressed', button.dataset.employeeLeaveTab === employeeLeaveTab ? 'true' : 'false');
  const list = $('#employee-profile-leaves');
  const leaves = (session.ownLeaveRequests ?? []).filter(item => {
    if (item.status !== 'Approved') return false;
    const current = (item.end ?? item.date) >= session.today;
    return employeeLeaveTab === 'all' || (employeeLeaveTab === 'current' ? current : !current);
  }).sort((a, b) => employeeLeaveTab === 'current' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  list.replaceChildren();
  list.hidden = leaves.length === 0;
  for (const item of leaves) {
    const row = document.createElement('li');
    const details = document.createElement('dl');
    const end = item.end ?? item.date;
    const state = item.date > session.today ? 'upcoming' : end < session.today ? 'previous' : 'current';
    const badge = document.createElement('span');
    badge.className = 'employee-leave-status employee-leave-status-' + state;
    badge.textContent = tr(state === 'upcoming' ? 'مستقبلية' : state === 'current' ? 'حالية' : 'السابقة');
    const dateFormat = dateFormatter(employeeLanguage, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const formatDate = date => dateFormat.format(new Date(date + 'T00:00:00Z'));
    const days = Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(item.date + 'T00:00:00Z')) / 86400000) + 1;
    for (const [label, content] of [['النوع', employeeRequestLabel(item.type)], ['الحالة', badge],
      ['المدة', formatDate(item.date) + ' — ' + formatDate(end)], ['عدد الأيام', number.format(days)]]) {
      const field = document.createElement('div'), term = document.createElement('dt'), definition = document.createElement('dd');
      term.textContent = tr(label);
      if (typeof content === 'string') definition.textContent = content;
      else definition.append(content);
      field.append(term, definition); details.append(field);
    }
    row.append(details); list.append(row);
  }
}
let employeeProfileTab = history.state?.profileTab ?? (location.hash === '#profile-settings' ? 'settings' : 'all');
for (const link of document.querySelectorAll('#employee-account-help a[href="/support"], #employee-account-help a[href="/privacy"]')) {
  const url = new URL(link.href);
  url.searchParams.set('returnTo', location.pathname + '#profile-settings');
  link.href = url.href;
}
window.addEventListener('popstate',event=>{if(!session?.ok)return;const data=event.state??{};restoringEmployeeHistory=true;showEmployeeView(data.employeeView??'home');restoringEmployeeHistory=false;requestAnimationFrame(()=>window.scrollTo({top:data.scroll??employeeScroll.get(employeeView)??0}));});
let employeeProfileSearch = '';
const employeeDisplayName = () => (employeeLanguage === 'en' ? session.nameEn : session.nameAr) || session.name;
let greetingPhrase = null;
let greetingEmployee = null;
let greetingDay = null;
let greetingAnimation;
let greetingTimeout;
let greetingExpiresAt = 0;
function renderEmployeeGreeting(animate = false) {
  if (greetingEmployee !== session.email) { greetingEmployee = session.email; greetingPhrase = null; }
  if (greetingPhrase && (Date.now() >= greetingExpiresAt || greetingDay !== session.today || session.encouragement?.enabled === false)) greetingPhrase = null;
  if (!greetingPhrase) clearTimeout(greetingTimeout);
  const heading = $('#employee-greeting');
  const hour = Number(formatHour.format(new Date(Date.now() + (session.clockOffset ?? 0))));
  const firstName = (employeeDisplayName() ?? '').trim().split(/\s+/u)[0];
  const text = greetingPhrase ? greetingPhrase[employeeLanguage] :
    tr(hour < 12 ? 'صباح الخير، ' : 'مساء الخير، ').trimEnd() + (firstName ? ' ' + firstName : '');
  if (heading.textContent === text) return;
  greetingAnimation?.cancel();
  heading.textContent = text;
  heading.classList.toggle('is-encouragement', Boolean(greetingPhrase));
  if (animate && heading.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    greetingAnimation = heading.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 1200, easing: 'ease-out' });
  }
}
function showPunchGreeting(kind) {
  const duration = 10_000;
  clearTimeout(greetingTimeout);
  greetingExpiresAt = Date.now() + duration;
  greetingDay = session.today;
  const hour = Number(formatHour.format(new Date(Date.now() + (session.clockOffset ?? 0))));
  greetingPhrase = pickEmployeeGreeting({ hour, kind, previousId: greetingPhrase?.id, phrases: session.encouragement?.phrases });
  renderEmployeeGreeting(true);
  greetingTimeout = setTimeout(() => {
    greetingPhrase = null;
    if (session?.ok) renderEmployeeGreeting(true);
  }, duration);
}

function filterEmployeeProfile() {
 $('#employee-profile-all-panel').hidden=false;
 $('#employee-profile-settings-panel').hidden=false;
 $('#employee-profile-personal-panel').hidden=true;
 $('#employee-profile-no-results').hidden=true;
}

function renderPersonalProfile() {
  displayProfileAvatar(session.photo);
  $('#employee-profile-name').textContent = employeeDisplayName();
  $('#employee-profile-company').textContent=session.company||'';
  $('#employee-profile-job').textContent = tr(ar[session.jobTitle] ?? session.jobTitle ?? '—');
  const profile = session.profile ?? {};
  const fill = (selector, fields) => {
    for (const list of document.querySelectorAll(selector)) {
      list.replaceChildren();
      for (const [label, value] of fields) {
        const term = document.createElement('dt'), definition = document.createElement('dd');
        term.textContent = tr(label); definition.textContent = dateText(value) || '—'; list.append(term, definition);
      }
    }
  };
  let nationality = profile.nationality;
  if (nationality) { try { nationality = new Intl.DisplayNames(employeeLanguage, { type: 'region' }).of(nationality); } catch {} }
  fill('#employee-personal-details, #employee-tab-personal-details', [['الاسم', employeeDisplayName()], ['البريد الإلكتروني', session.email],
    ['الجوال', profile.phone], ['تاريخ الميلاد', profile.birthDate], ['الجنس', employeeLanguage === 'ar' ? ar[profile.gender] ?? profile.gender : profile.gender]]);
  const residence=Boolean(profile.nationality&&profile.nationality!=='SA');
  fill('#employee-identity-details, #employee-tab-identity-details', [[residence?'رقم الإقامة':'رقم الهوية', profile.identityNumber],
    ...(residence?[['تاريخ انتهاء الإقامة',profile.residencyExpiryDate]]:[]),['الجنسية', nationality]]);
  const address = profile.address;
  $('#employee-address-details').textContent = typeof address === 'string' ? address || '—' :
    address && typeof address === 'object' ? [address.line1, address.line2, address.district, address.city, address.postalCode, address.country].filter(Boolean).join('، ') || '—' : '—';
  $('#employee-tab-address-details').textContent = $('#employee-address-details').textContent;
  const salary = profile.salary;
  const salaryToggle = $('#employee-salary-toggle');
  const salaryToggleLabel = employeeLanguage === 'en' ? (employeeSalaryVisible ? 'Hide salary' : 'Show salary') : (employeeSalaryVisible ? 'إخفاء الراتب' : 'إظهار الراتب');
  salaryToggle.setAttribute('aria-label', salaryToggleLabel);
  salaryToggle.setAttribute('aria-pressed', String(employeeSalaryVisible));
  salaryToggle.querySelector('span').textContent = salaryToggleLabel;
  salaryToggle.querySelector('.employee-salary-eye-slash').style.display = employeeSalaryVisible ? 'none' : '';
  const money = value => !employeeSalaryVisible ? '••••••' : Number.isFinite(value) ? new Intl.NumberFormat(employeeLanguage, { maximumFractionDigits: 2 }).format(value) + ' ' + (salary?.currency ?? 'SAR') : '—';
  fill('#employee-salary-details', [['الراتب الأساسي', money(salary?.monthlyBase)], ['البدلات', money(salary?.monthlyAllowances)],
    ['بدلات أخرى', money(salary ? salary.monthlyOtherAllowances ?? 0 : null)],
    ['الإجمالي الشهري', money(Number.isFinite(salary?.monthlyBase) && Number.isFinite(salary?.monthlyAllowances) ? salary.monthlyBase + salary.monthlyAllowances + (salary.monthlyOtherAllowances ?? 0) : null)]]);
  const balance=availableLeave(session.leaveBalance);
  updateAccountRequestsNote();
  $('#employee-account-wallet').hidden=!session.canViewDocuments;
  $('#employee-account-follow-up').hidden=!session.canManageFollowUp;
  $('#employee-account-leave-balance').textContent=Number.isFinite(balance)?new Intl.NumberFormat(employeeLanguage,{maximumFractionDigits:2}).format(balance)+(employeeLanguage==='ar'?' يومًا':' days'):'—';
  filterEmployeeProfile();
}
$('#employee-profile-search').addEventListener('input', event => { employeeProfileSearch = event.target.value; filterEmployeeProfile(); });
$('#employee-salary-toggle').onclick = () => {
  employeeSalaryVisible = !employeeSalaryVisible;
  renderPersonalProfile();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden && employeeSalaryVisible) {
    employeeSalaryVisible = false;
    if (session?.ok) renderPersonalProfile();
  }
});
function renderEmployeeDetails() {
  documentNotices.update(session.documentAlerts,location.pathname+'|'+session.email);
  renderPersonalProfile();
  renderEmployeeLeaveProfile();
  renderEmployeeRequests();
  $('#employee-more-name').textContent = employeeDisplayName();
  $('#employee-more-title').textContent = tr(ar[session.jobTitle] ?? session.jobTitle ?? '—');
  $('#employee-more-company').textContent = session.company;
  $('#employee-language').value = employeeLanguage;
  const details = $('#employee-job-details');
  details.replaceChildren();
  for (const [label, value] of [['المسمى الوظيفي', $('#employee-more-title').textContent], ['الشركة', session.company],
    ['البريد الإلكتروني', session.email], ['تاريخ الانضمام', session.joinDate], ['المدير المباشر', session.manager]]) {
    if (!value) continue;
    const term = document.createElement('dt'), definition = document.createElement('dd');
    term.textContent = tr(label);
    definition.textContent = value;
    details.append(term, definition);
  }
}

function renderScheduledPeriods() {
  const list = $('#employee-scheduled-periods');
  const periods = session.scheduledPeriods ?? [];
  const clock = employeeClock();
  list.hidden = !periods.length;
  list.replaceChildren(...periods.map(period => {
    const row = document.createElement('li');
    const name = document.createElement('strong');
    const hours = document.createElement('bdi');
    name.textContent = period.name;
    hours.textContent = clock.formatRange(period.start, period.end);
    row.append(name, hours);
    return row;
  }));
}

function updateTime() {
  if (!session?.ok) return;
  const now = new Date(Date.now() + (session.clockOffset ?? 0));
  const timing = currentPunchTiming();
  const label = $('#employee-punch-label');
  const labels = session.punchWindows?.length || session.lastFlexiblePunch
    ? { in: 'تسجيل حضور', out: 'تسجيل خروج' }
    : { in: 'تسجيل البصمة', out: 'تسجيل الانصراف' };
  const text = tr(labels[timing.kind]);
  if (label.textContent !== text) label.textContent = text;
  const started = Date.parse(session.shiftStartsAt);
  const outside = session.punchedOutToday || (session.shiftEndsAt != null && now >= session.shiftEndsAt);
  const working = session.flexibleDay ? session.flexibleActiveSince != null :
    !outside && session.punchedInAt && (!Number.isFinite(started) || now >= started);
  const dayStart = Date.parse(session.today + 'T00:00:00+03:00');
  const activeFlexible = session.flexibleActiveSince == null ? 0 : Math.max(0,
    Math.min(now.valueOf(), session.flexibleActiveUntil ?? dayStart + 86400000) - session.flexibleActiveSince);
  const elapsed = session.flexibleDay ? Math.floor(((session.flexibleCompletedMilliseconds ?? 0) + activeFlexible) / 60000) :
    working ? Math.max(0, Math.floor((now - Date.parse(session.punchedInAt)) / 60000)) : 0;
  const remaining = Math.ceil((started - now) / 60000);
  const durationText = minutes => [Math.floor(minutes / 60), minutes % 60].map(value => String(value).padStart(2, '0')).join(':');
  const flexibleTarget = session.flexibleRequiredMinutes > 0 ? (employeeLanguage === 'en' ? ' · Required ' : ' · المطلوب ') + durationText(session.flexibleRequiredMinutes) +
    (employeeLanguage === 'en' ? ' · Remaining ' : ' · المتبقي ') + durationText(Math.max(0, session.flexibleRequiredMinutes - elapsed)) : '';
  const hint = session.flexibleDay ? (employeeLanguage === 'en' ? 'Total working time today' : 'إجمالي ساعات الدوام اليوم') + flexibleTarget :
    working ? tr('في العمل') : outside ? tr('خارج وقت العمل') : !Number.isFinite(started) ? tr('لا يوجد دوام مجدول اليوم') :
    employeeLanguage === 'en' ? (remaining > 0 && remaining < 120 ? `Shift starts in ${remaining} min` : `Shift ${remaining > 0 ? 'starts' : 'started'} at ${employeeClock().format(started)}`) :
    remaining > 0 && remaining < 120 ? `يبدأ الدوام خلال ${remaining} دقيقة` :
      `${remaining > 0 ? 'يبدأ الدوام الساعة' : 'بدأ الدوام الساعة'} ${employeeClock().format(started)}`;
  const clock = [Math.floor(elapsed / 60), elapsed % 60].map(value => String(value).padStart(2, '0')).join(':');
  if ($('#employee-shift').textContent !== hint) $('#employee-shift').textContent = hint;
  if ($('#employee-timer').textContent !== clock) $('#employee-timer').textContent = clock;
}
function currentPunchTiming() {
  return punchTiming(session.punchWindows ?? [], Date.now() + (session.clockOffset ?? 0),
    session.nextPunch, session.openShiftStart, session.lastFlexiblePunch);
}

let requestApplicantId='', requestApplicantOptions, requestApplicantPending=false, requestApplicantLoad=0;
const requestOptions=()=>requestApplicantOptions??session;
function fillRequestOptions(types, options) {
  requestForm.elements.leaveRequestId.replaceChildren(new Option(tr('اختر الإجازة'), ''),
    ...(options.cancellableLeaves??[]).map(item=>new Option(employeeRequestLabel(item.type)+' · '+item.date+' — '+(item.end??item.date),item.id)));
  requestForm.elements.periodId.replaceChildren(new Option(tr('اختر الفترة'), ''),
    ...(options.availablePeriods??[]).map(period=>new Option(period.name+(period.start&&period.end?' · '+period.start+' — '+period.end:''),period.id)));
  requestForm.elements.type.replaceChildren(...types.map(type=>new Option(employeeRequestLabel(type),type)));
  requestForm.elements.secondPeriodId.value='';
}
function resetRequestApplicant(kind) {
  requestApplicantLoad++;
  requestApplicantId='';requestApplicantOptions=undefined;requestApplicantPending=false;
  const panel=$('#employee-request-applicant'), mode=$('#employee-request-person-mode');
  const branch=$('#employee-request-branch'), person=$('#employee-request-person');
  const L=(ar,en)=>employeeLanguage==='ar'?ar:en;
  panel.hidden=kind!=='all'||!session.canSubmitForStaff;
  branch.closest('label').hidden=person.closest('label').hidden=true;
  mode.replaceChildren(new Option(L('أنا','Me'),''),new Option(L('موظف آخر','Another employee'),'other'));
  const feedback=$('#employee-request-status');
  const resetFields=()=>{
    for(const name of ['date','end','note','attachment','loanAmount','repaymentInstallments','excuseType','reason','correctionReason'])requestForm.elements[name].value='';
    const options=requestOptions();
    fillRequestOptions([...options.leaveTypes,...options.attendanceTypes],options);
    requestForm.elements.type.prepend(new Option(tr('اختر النوع'),'',true,true));
    requestForm.elements.date.value=session.today;
    updateRequestFields();loadCorrectionTimes();
  };
  let branches=[];
  const fillStaff=()=>{
    const members=branches.find(item=>item.id===branch.value)?.staff??[];
    person.replaceChildren(new Option(L('اختر الموظف','Choose employee'),''),...members.map(item=>new Option(
      employeeLanguage==='ar'?(item.nameAr||item.name||item.nameEn):(item.nameEn||item.name||item.nameAr),item.id)));
    person.closest('label').hidden=!branch.value;
    void person.onchange();
  };
  branch.onchange=fillStaff;
  person.onchange=async()=>{
    const load=++requestApplicantLoad, id=person.value;
    requestApplicantId='';requestApplicantOptions=undefined;requestApplicantPending=true;
    feedback.textContent='';resetFields();
    if(!id)return;
    try{
      const result=await api('request-applicants?staffId='+encodeURIComponent(id));
      if(load!==requestApplicantLoad||!requestDialog.open)return;
      if(!result.ok)throw Error();
      requestApplicantId=id;requestApplicantOptions=result;requestApplicantPending=false;
      resetFields();
    }catch{if(load===requestApplicantLoad&&requestDialog.open)feedback.textContent=L('تعذّر تحميل إعدادات الموظف. أعد اختياره.','Could not load employee settings. Select the employee again.');}
  };
  mode.onchange=async()=>{
    const load=++requestApplicantLoad;
    requestApplicantId='';requestApplicantOptions=undefined;requestApplicantPending=Boolean(mode.value);
    branch.closest('label').hidden=person.closest('label').hidden=true;
    feedback.textContent='';resetFields();
    if(!mode.value)return;
    try{
      const result=await api('request-applicants');
      if(load!==requestApplicantLoad||!requestDialog.open)return;
      if(!result.ok)throw Error();
      branches=result.branches;
      if(!branches.length){feedback.textContent=L('لا توجد فروع متاحة.','No branches available.');return;}
      branch.replaceChildren(...(branches.length>1?[new Option(L('اختر الفرع','Choose branch'),'')]:[]),
        ...branches.map(item=>new Option(item.name,item.id)));
      branch.closest('label').hidden=false;fillStaff();
    }catch{if(load===requestApplicantLoad&&requestDialog.open)feedback.textContent=L('تعذّر تحميل الفروع.','Could not load branches.');}
  };
}
function updateRequestFields() {
  const type = requestForm.elements.type.value;
  const leave = requestForm.dataset.kind === 'leave' || requestOptions().leaveTypes.includes(type);
  const cancellation = type === 'Leave cancellation';
  const excuse = type === 'Attendance excuse';
  const correction = type === 'Missed punch';
  const loan = type === 'Loan request';
  const shiftChange = type === 'Shift change';
  const cancellableLeave = requestOptions().cancellableLeaves?.find(item=>item.id===requestForm.elements.leaveRequestId.value);
  const noCancellableLeave = cancellation && !requestOptions().cancellableLeaves?.length;
  requestForm.elements.date.max = correction ? session.today : cancellation ? (cancellableLeave?.end??cancellableLeave?.date??'') : '';
  requestForm.elements.date.min = cancellation ? session.today : '';
  requestForm.elements.date.disabled = noCancellableLeave;
  requestForm.elements.type.disabled = requestApplicantPending;
  requestForm.querySelector('button[type="submit"]').disabled = requestApplicantPending || noCancellableLeave;
  $('#employee-cancel-leave-empty').hidden = !noCancellableLeave;
  $('#employee-cancel-leave-empty').textContent = employeeLanguage==='en'?'You have no approved leave available to cancel.':'لا توجد لديك إجازة معتمدة متاحة للإلغاء.';
  $('#employee-cancel-leave').hidden = !cancellation;
  requestForm.elements.leaveRequestId.disabled = !cancellation;
  requestForm.elements.leaveRequestId.required = cancellation;
  const needsNote = !shiftChange && (!correction || requestForm.elements.correctionReason.value === 'Other');
  $('#employee-request-note span').textContent = tr(correction ? 'الوصف' : 'السبب');
  $('#employee-request-date-label').textContent = tr(shiftChange ? 'من' : cancellation ? 'تاريخ العودة للدوام' : leave ? 'بدء' : 'التاريخ');
  $('#employee-request-end-label').textContent = tr(shiftChange ? 'إلى' : 'انتهاء');
  $('#employee-request-dates').classList.toggle('employee-request-date-range', shiftChange);
  requestForm.elements.end.min = requestForm.elements.date.value || session.today;
  for (const [id, name, visible, required] of [
    ['employee-shift-change', 'periodId', shiftChange, shiftChange],
    ['employee-loan-amount','loanAmount',loan,loan], ['employee-loan-repayment','repaymentInstallments',loan,loan],
    ['employee-request-end', 'end', leave || shiftChange, leave || shiftChange], ['employee-excuse-type', 'excuseType', excuse, excuse],
    ['employee-excuse-reason', 'reason', excuse, excuse],
    ['employee-attachment', 'attachment', excuse || correction || type === 'Sick leave', false],
    ['employee-correction-reason', 'correctionReason', correction, correction], ['employee-request-note', 'note', needsNote, needsNote],
  ]) {
    $('#' + id).hidden = !visible;
    requestForm.elements[name].disabled = !visible;
    requestForm.elements[name].required = required;
  }
  updateSecondShift(); updateLeaveSummary(); updateRequestPreview();
}

function updateSecondShift() {
  const first=requestOptions().availablePeriods?.find(p=>p.id===requestForm.elements.periodId.value);
  const select=requestForm.elements.secondPeriodId;
  const visible=requestForm.elements.type.value==='Shift change' && first && periodDurationMinutes(first)<480;
  $('#employee-shift-change-second').hidden=!visible;
  select.disabled=!visible;
  if (!visible) { select.value=''; return; }
  const previous=select.value;
  select.replaceChildren(new Option(tr('اختر الفترة'),''),...(requestOptions().availablePeriods??[]).map(period=>{
    const option=new Option(period.name+' · '+period.start+' — '+period.end,period.id);
    option.disabled=period.id===first.id || periodsOverlap(first,period);
    return option;
  }));
  if ([...select.options].some(option=>option.value===previous && !option.disabled)) select.value=previous;
}
requestForm.elements.periodId.addEventListener('change',()=>{updateSecondShift();updateRequestPreview();});

function updateLeaveSummary() {
  const { type, date, end } = requestForm.elements;
  const summary = $('#employee-leave-summary');
  const startDay = date.valueAsNumber;
  const endDay = end.valueAsNumber;
  summary.hidden = !requestOptions().leaveTypes.includes(type.value) ||
    !Number.isFinite(startDay) || !Number.isFinite(endDay) || endDay < startDay;
  if (summary.hidden) return;
  const day = 86_400_000;
  const total = new Intl.NumberFormat(employeeLanguage).format((endDay - startDay) / day + 1);
  const returnDate = dateFormatter(employeeLanguage, {
    dateStyle: 'medium', calendar: 'gregory', timeZone: 'UTC',
  }).format(endDay + day);
  const [totalLabel, returnLabel] = summary.children;
  totalLabel.textContent = tr('إجمالي الأيام') + ': ' + total;
  returnLabel.textContent = tr('العودة للدوام بتاريخ') + ' ' + returnDate;
}

function updateRequestPreview(){
  let panel=$('#employee-request-preview');if(!panel){panel=document.createElement('p');panel.id='employee-request-preview';panel.className='ux-request-summary';panel.setAttribute('role','status');requestForm.querySelector('button[type=submit]').before(panel);}
  const values=requestForm.elements,ar=employeeLanguage==='ar',type=values.type.value;panel.hidden=false;
  if(type==='Loan request'){const amount=Number(values.loanAmount.value),count=Number(values.repaymentInstallments.value)||1;const per=Math.round(amount/count*100)/100,last=Math.round((amount-per*(count-1))*100)/100;panel.textContent=amount>0?(ar?'تقدير السداد: ':'Repayment estimate: ')+count+' × '+per.toFixed(2)+' SAR'+(last!==per?' ('+(ar?'الأخيرة ':'last ')+last.toFixed(2)+')':'')+(ar?'، بدءًا من أقرب راتب مؤهل بعد الموافقة.':' starting with the next eligible payroll after approval.'):(ar?'أدخل المبلغ لمعاينة الأقساط.':'Enter an amount to preview installments.');}
  else if(type==='Leave cancellation'){const leave=requestOptions().cancellableLeaves?.find(item=>item.id===values.leaveRequestId.value),returned=values.date.value;const used=leave&&returned?Math.max(0,Math.ceil((Date.parse(returned)-Date.parse(leave.date))/86400000)):0,refund=leave&&returned?Math.max(0,Math.floor((Date.parse(leave.end??leave.date)-Math.max(Date.parse(returned),Date.parse(leave.date)))/86400000)+1):0;panel.textContent=leave?(ar?'المستخدم حتى العودة: ':'Used before return: ')+used+(ar?' يوم · المتوقع إعادته: ':' days · estimated refund: ')+refund+(ar?' يوم. يتأكد بعد الموافقة.':' days. Confirmed after approval.'):(ar?'اختر الإجازة وتاريخ العودة.':'Choose leave and a return date.');}
  else if(type==='Shift change'){const periods=[values.periodId.value,values.secondPeriodId.value].map(id=>requestOptions().availablePeriods?.find(p=>p.id===id)).filter(Boolean);panel.textContent=(periods.map(p=>p.name).join(' + ')||(ar?'اختر الفترة':'Choose period'))+' · '+dateText(values.date.value)+' → '+dateText(values.end.value)+(ar?' (شامل التاريخين، بعد جميع الموافقات)':' (both dates inclusive, after all approvals)');}
  else if(type===futureAnnualLeave)panel.textContent=ar?'بعد الموافقة، تُخصم أيام الإجازة من الرصيد السنوي. إذا أصبح الرصيد المستحق سالبًا، يغطيه الاستحقاق اليومي تدريجيًا.':'After approval, the leave is deducted from your annual balance. Daily accrual gradually repays any negative accrued balance.';
  else panel.hidden=true;
}
requestForm.addEventListener('input',updateRequestPreview);requestForm.addEventListener('change',updateRequestPreview);
let correctionLoad, correctionPeriods = [];
const correctionLimitMessage = 'You have reached the monthly limit for approved punch corrections.';
function correctionPeriodLabel(name, start, end) {
  const clock = employeeClock();
  return name + ' · ' + clock.format(new Date(start)) + ' – ' + clock.format(new Date(end));
}
async function loadCorrectionTimes(focusMissing = false) {
  correctionLoad?.abort();
  const date = requestForm.elements.date.value;
  const correction = requestForm.elements.type.value === 'Missed punch';
  const fieldset = $('#employee-correction-times');
  fieldset.hidden = !correction || !date;
  const cards = $('#employee-correction-periods');
  cards.replaceChildren();
  correctionPeriods = [];
  if (fieldset.hidden) return;
  const controller = new AbortController();
  correctionLoad = controller;
  const feedback = $('#employee-correction-status');
  feedback.textContent = tr('جاري تحميل البصمات…');
  try {
    const prefix = location.pathname.replace(/\/employee\/?$/, '');
    const response = await fetch(prefix + '/api/employee/punches?date=' + encodeURIComponent(date) + (requestApplicantId ? '&staffId=' + encodeURIComponent(requestApplicantId) : ''), { signal: controller.signal });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (controller.signal.aborted) return;
    const clock = employeeClock();
    correctionPeriods = data.periods?.length ? data.periods : [data];
    const missing = [];
    correctionPeriods.forEach((period, index) => {
      const card = document.createElement('fieldset'), legend = document.createElement('legend');
      card.className = 'employee-correction-period';
      // A single unnamed period would only repeat the section title above it.
      if (period.id) { legend.textContent = correctionPeriodLabel(period.name, period.start, period.end); card.append(legend); }
      for (const [kind, entry, label, proposed] of [
        ['In', period.arrival, 'وقت الحضور المسجل', 'وقت الحضور المقترح'],
        ['Out', period.departure, 'وقت الانصراف المسجل', 'وقت الانصراف المقترح'],
      ]) {
        const row = document.createElement('div'), caption = document.createElement('label');
        const box = document.createElement('input'), time = document.createElement('input'), recorded = document.createElement('p');
        row.className = 'employee-correction-option';
        box.type = 'checkbox';
        time.type = 'text';
        configureCorrectionTime(time);
        time.name = 'proposed' + kind + index;
        time.setAttribute('aria-label', tr(proposed));
        time.hidden = time.disabled = true;
        const toggle = () => {
          time.hidden = time.disabled = !box.checked;
          time.required = box.checked;
          if (box.checked) time.focus();
        };
        box.addEventListener('change', toggle);
        caption.append(box, tr(label));
        const inProgress = kind === 'Out' && period.inProgress;
        recorded.textContent = entry ? clock.format(new Date(entry.time)) : tr(inProgress ? 'لم ينتهِ الدوام بعد' : 'لا توجد بصمة مسجلة');
        if (!entry && !inProgress) missing.push(() => { box.checked = true; toggle(); });
        row.append(caption, recorded, time);
        card.append(row);
      }
      cards.append(card);
    });
    if (focusMissing === true && missing.length === 1 && !data.correctionLimitReached) missing[0]();
    feedback.textContent = data.correctionLimitReached ? tr(ar[correctionLimitMessage]) : '';
  } catch {
    if (!controller.signal.aborted) feedback.textContent = tr('تعذّر تحميل بصمات اليوم.');
  }
}

function openRequest(kind, selectedDate) {
  requestForm.reset();
  resetRequestApplicant(kind);
  requestForm.dataset.kind = kind;
  $('#employee-request-status').textContent = '';
  const available = [...requestOptions().leaveTypes, ...requestOptions().attendanceTypes];
  const types = kind === 'all' ? available : kind === 'leave' ? requestOptions().leaveTypes : [kind].filter(type=>available.includes(type));
  if(!types.length && (kind!=='all'||!session.canSubmitForStaff))return;
  fillRequestOptions(types,requestOptions());
  requestForm.elements.excuseType.replaceChildren(new Option(tr('اختر نوع الاستئذان'), ''), ...session.excuseTypes.map(value => new Option(tr(ar[value] ?? value), value)));
  requestForm.elements.reason.replaceChildren(new Option(tr('اختر فئة السبب'), ''), ...session.excuseReasons.map(value => new Option(tr(ar[value] ?? value), value)));
  requestForm.elements.correctionReason.replaceChildren(new Option(tr('اختر السبب'), ''),
    ...session.correctionReasons.map(value => new Option(tr(ar[value] ?? value), value)));
  requestForm.elements.date.value = kind === 'Missed punch' ? selectedDate ?? '' :
    kind === 'Leave cancellation' ? '' : session.today;
  requestForm.elements.end.min = session.today;
  $('#employee-request-type').hidden = kind !== 'all' && kind !== 'leave';
  $('#employee-request-type span').textContent = tr(kind === 'leave' ? 'نوع الإجازة' : 'نوع الطلب');
  if (kind === 'leave' || kind === 'all') requestForm.elements.type.prepend(new Option(tr('اختر النوع'), '', true, true));
  requestTitle.textContent = employeeRequestLabel(kind);
  updateRequestFields();
  loadCorrectionTimes(kind === 'Missed punch' && Boolean(selectedDate));
  requestDialog.showModal();
}

$('#employee-home-tabs').addEventListener('click', event => {
  const home = event.target.closest('[data-employee-home]');
  if (!home || !session?.ok || !session.canReviewTeam) return;
  showHomeTab(home.dataset.employeeHome);
});

dashboard.addEventListener('click', event => {
  const profileTab = event.target.closest('[data-profile-tab]');
  if (profileTab) { employeeProfileTab = profileTab.dataset.profileTab;history.replaceState({...history.state,employeeView,profileTab:employeeProfileTab},''); filterEmployeeProfile(); return; }
  const leaveTab = event.target.closest('[data-employee-leave-tab]');
  if (leaveTab) { employeeLeaveTab = leaveTab.dataset.employeeLeaveTab;history.replaceState({...history.state,employeeView,leaveTab:employeeLeaveTab},''); renderEmployeeLeaveProfile(); return; }
  const page = event.target.closest('[data-employee-page]');
  if (page) {if(page.getAttribute('aria-label')===tr('رجوع')&&history.state?.previousView===page.dataset.employeePage)history.back();else showEmployeeView(page.dataset.employeePage);}
  const button = event.target.closest('[data-quick-request]');
  if (button && session?.ok) {
    openRequest(button.dataset.quickRequest, button.dataset.correctionDate);
    if (button.dataset.quickRequest === 'all') void refreshVisibleSession();
  }
  const close = event.target.closest('[data-employee-close]');
  if (close) close.closest('dialog').close();
});
requestForm.elements.type.addEventListener('change', () => { updateRequestFields(); loadCorrectionTimes(); });
requestForm.elements.correctionReason.addEventListener('change', updateRequestFields);
requestForm.elements.leaveRequestId.addEventListener('change',()=>{
  const leave=requestOptions().cancellableLeaves?.find(item=>item.id===requestForm.elements.leaveRequestId.value);
  const selected=requestForm.elements.date.value;
  if(selected&&(selected<session.today||selected>(leave?.end??leave?.date??'')))requestForm.elements.date.value='';
  updateRequestFields();
});
requestForm.elements.date.addEventListener('input', () => {
  requestForm.elements.end.min = requestForm.elements.date.value;
  updateLeaveSummary();
});
requestForm.elements.date.addEventListener('change', loadCorrectionTimes);
requestForm.elements.end.addEventListener('input', updateLeaveSummary);
let nativePushToken;
const seenAttendanceReminders = new Set();
function showAttendanceReminders(latest) {
  for (const reminder of latest.attendanceReminders ?? []) {
    if (!seenAttendanceReminders.has(reminder.id) && Date.now() + (latest.clockOffset ?? 0) - reminder.createdAt < 120000) {
      employeeToast(employeeLanguage === 'en' ? reminder.bodyEn : reminder.bodyAr);
    }
    seenAttendanceReminders.add(reminder.id);
  }
}
async function registerNativePush(requestPermission = false) {
  if (!window.dawamkomRequestNativePush || !session?.ok) return;
  const current = session;
  const result = await window.dawamkomRequestNativePush(requestPermission);
  if (session !== current) return;
  if (result.token) {
    const saved = await api('native-push-token', {token: result.token, language: employeeLanguage});
    if (!saved.ok) { if (requestPermission) employeeToast(tr('تعذّر تفعيل الإشعارات.'), 'error'); return; }
    nativePushToken = result.token;
    $('#employee-reminder-optin').hidden = true;
    if (requestPermission) employeeToast(tr('تم تفعيل إشعارات الدوام.'));
  } else if (requestPermission) employeeToast(tr(result.error ? 'تعذّر تفعيل الإشعارات.' : 'لم يتم السماح بالإشعارات.'), 'error');
}
window.addEventListener('dawamkom-native-ready', () => {
  if (session?.ok) { $('#employee-reminder-optin').hidden = Boolean(nativePushToken); void registerNativePush(); }
});
$('#employee-enable-reminders').onclick = () => run($('#employee-enable-reminders'), () => registerNativePush(true));
const supportsPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function notificationReadStore(latest){
 const key='dawamkom-notification-read:'+location.pathname+':'+latest.email;
 let ids=[];try{ids=JSON.parse(localStorage.getItem(key)||'[]');}catch{}
 const read=new Set(Array.isArray(ids)?ids:[]);
 return {read,save(){try{localStorage.setItem(key,JSON.stringify([...read].slice(-250)));}catch{}}};
}
function employeeNotices(latest) {
 const L=(a,b)=>employeeLanguage==='ar'?a:b,items=[];
 for(const task of latest.assignedTasks??[]){if(task.status==='completed')continue;items.push({id:'task:'+task.id+':'+task.version,action:task.status==='new',title:L('مهمة مسندة إليك','Assigned task'),body:task.name,date:task.dueOn||task.expiresOn,task});}
 for(const r of pendingTeamRequests(latest.teamRequests??[]))items.push({id:r.browser?'browser:'+r.id+':'+r.approvalIndex:'approval:'+r.id,action:true,title:r.browser?L('طلب تغيير متصفح','Browser change request'):L('طلب يحتاج موافقتك','Request awaiting your approval'),body:r.employee+' · '+employeeRequestLabel(r.type),date:r.submittedOn,open:()=>openTeamApproval(r)});
 for(const alert of latest.documentAlerts??[])items.push({id:'document:'+alert.id+':'+alert.name+':'+alert.expiresOn,action:true,title:L('مستند يحتاج انتباهك','Document needs attention'),body:alert.name,date:alert.expiresOn});
 for(const r of latest.ownRequests??[])items.push({id:'request:'+r.id+':'+r.status,action:false,title:employeeRequestLabel(r.type),body:tr(ar[r.status]??r.status),date:r.decidedAt||r.submittedOn||r.date,open:()=>openRequestDetails(r)});
 for(const r of latest.attendanceReminders??[])items.push({id:'reminder:'+r.id+':'+r.bodyAr,action:false,title:L('تذكير الدوام','Attendance reminder'),body:employeeLanguage==='en'?r.bodyEn:r.bodyAr,expiresAt:r.expiresAt});
 return items.filter(i=>!i.expiresAt||i.expiresAt>Date.now());
}
function updateEmployeeBell(latest=session){
 const count=$('#employee-device-count');
 const read=latest?.ok?notificationReadStore(latest).read:new Set();
 const total=latest?.ok?employeeNotices(latest).filter(i=>!read.has(i.id)).length:0;
 count.hidden=!total;count.textContent=total;
 const tileCount=$('#employee-account-notifications-count');tileCount.hidden=!total;tileCount.textContent=total;
 $('#employee-account-notifications-note').textContent=total?(employeeLanguage==='ar'?total+' غير مقروءة':total+' unread'):tr('لا توجد تنبيهات جديدة');
 $('#employee-messages').setAttribute('aria-label',tr('التنبيهات')+(total?' ('+total+')':''));
}
$('#employee-messages').onclick = () => run($('#employee-messages'), async () => {
 const latest=await api('session');if(!latest.ok){await show();return;}session=latest;
 const L=(a,b)=>employeeLanguage==='ar'?a:b,list=$('#employee-message-list'),store=notificationReadStore(latest);
 let expiryTimer;messagesDialog.addEventListener('close',()=>clearTimeout(expiryTimer),{once:true});
 let filter='focus';const toolbar=$('#employee-notification-toolbar');
 const draw=()=>{
  clearTimeout(expiryTimer);const active=employeeNotices(session);
  const nextExpiry=Math.min(...active.filter(i=>i.expiresAt).map(i=>i.expiresAt));if(Number.isFinite(nextExpiry))expiryTimer=setTimeout(()=>{if(messagesDialog.open)draw();},Math.min(2147483647,Math.max(1,nextExpiry-Date.now())));
  const unread=active.filter(i=>!store.read.has(i.id)).length;
  updateEmployeeBell();
  toolbar.innerHTML='<div class="employee-notification-filters"><button type="button" data-notice-filter="focus" aria-pressed="'+(filter==='focus')+'">'+L('الجديدة','New')+' · '+unread+'</button><button type="button" data-notice-filter="all" aria-pressed="'+(filter==='all')+'">'+L('الكل','All')+'</button></div><button type="button" class="button secondary compact employee-notification-read">'+L('تعليم الكل كمقروء','Mark all as read')+'</button>';
  toolbar.querySelectorAll('[data-notice-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.noticeFilter;draw();});
  toolbar.querySelector('.employee-notification-read').onclick=()=>{active.forEach(i=>store.read.add(i.id));store.save();draw();};list.replaceChildren();
  const visible=active.filter(i=>filter==='all'||!store.read.has(i.id)).sort((a,b)=>String(b.date??'').localeCompare(String(a.date??'')));
  if(!visible.length){const empty=document.createElement('p');empty.className='employee-empty-state';empty.textContent=L('لا توجد تنبيهات هنا.','No notifications here.');list.append(empty);}
  for(const item of visible){const card=document.createElement('button');card.type='button';card.className='employee-notification-card'+(store.read.has(item.id)?' is-read':' is-unread');
   card.innerHTML='<span class="notice-copy"><strong>'+esc(item.title)+'</strong><small>'+esc(item.body||'')+'</small>'+(item.date?'<time>'+esc(dateText(item.date))+'</time>':'')+'</span><span aria-hidden="true">‹</span>';
   card.onclick=()=>{
    store.read.add(item.id);store.save();updateEmployeeBell();
    const detail=item.open?.()??employeeActionDialog(item.title,L('إغلاق','Close'),'employee-notice-detail');
    if(!item.open){
     const description=document.createElement('p');description.textContent=item.body;detail.append(description);
     if(item.date){const date=document.createElement('p');date.textContent=dateText(item.date);detail.append(date);}
     if(item.task&&session.canManageFollowUp){
      const actions=document.createElement('div');actions.className='employee-task-actions';
      if(item.task.status==='new')actions.append(receiveTaskButton(item.task,()=>detail.close()));
      actions.append(manageTaskButton(item.task));detail.append(actions);
     }
     detail.showModal();
    }
    detail.addEventListener('close',()=>{
     if(!messagesDialog.open)return;
     draw();
     (list.querySelector('.employee-notification-card')??toolbar.querySelector('[aria-pressed="true"]'))?.focus();
    },{once:true});
   };
   const row=document.createElement('div');row.className='employee-notice-row';row.append(card);
   if(!store.read.has(item.id)){
    const mark=document.createElement('button');mark.type='button';
    mark.className='button secondary compact employee-notification-read';
    mark.textContent=L('تعليم كمقروء','Mark as read');
    mark.setAttribute('aria-label',mark.textContent+' · '+item.title);
    mark.onclick=()=>{
     store.read.add(item.id);store.save();draw();
     (list.querySelector('.employee-notification-read')??toolbar.querySelector('[aria-pressed="true"]'))?.focus();
    };
    row.append(mark);
   }
   list.append(row);
  }
 };draw();messagesDialog.showModal();
});
window.setInterval(updateTime, 1000);

function renderDeviceRequests(requests) {
  updateEmployeeBell();
  $('#employee-device-inbox').hidden = !requests.length && !$('#employee-device-status').textContent;
  deviceList.replaceChildren();
  for (const request of requests) {
    const row = document.createElement('div');
    row.className = 'actions';
    const name = document.createElement('strong');
    name.textContent = request.name;
    row.append(name);
    for (const [decision, label] of [['approve', 'موافقة'], ['reject', 'رفض']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button secondary compact';
      button.textContent = tr(label);
      button.onclick = () => run(button, async () => {
        const result = await api('device-approval', { staffId: request.staffId, requestId: request.requestId, decision });
        $('#employee-device-status').textContent = result.ok ? tr(result.forwarded?'تم تحويل الطلب لمسؤول الموافقة التالي.':'تم حفظ القرار.') : result.error;
        await show();
      });
      row.append(button);
    }
    deviceList.append(row);
  }
}
let token = new URLSearchParams(location.hash.slice(1)).get('activate');
let invitationLoad = 0;
window.addEventListener('hashchange', () => {
  const nextToken = new URLSearchParams(location.hash.slice(1)).get('activate');
  if (nextToken === token) return;
  token = nextToken;
  form.reset();
  status.textContent = '';
  void show();
});
let session;
const documentNotices=documentAlertPresenter(()=>employeeLanguage);
let punchInFlight = false;

async function api(action, body, timeout) {
  const response = await fetch(location.pathname.replace(/\/employee\/?$/, '') + '/api/employee/' + action, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    ...(timeout ? {signal: AbortSignal.timeout(timeout)} : {}),
  } : { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (action === 'session' && response.status !== 401 && !response.ok) throw new Error('Session temporarily unavailable');
  return { ok: response.ok, ...await response.json(), httpStatus: response.status };
}
let visibleSessionRefresh = 0;
async function refreshVisibleSession(afterPunch = false) {
  const current = session;
  if (!current?.ok || dashboard.hidden || (!afterPunch && (document.hidden || punchInFlight))) return;
  const refreshId = ++visibleSessionRefresh;
  try {
    const latest = await api('session');
    if (!latest.ok || refreshId !== visibleSessionRefresh || current !== session || dashboard.hidden) return;
    const changed = JSON.stringify([current.homeRequests, current.ownRequests]) !== JSON.stringify([latest.homeRequests, latest.ownRequests]);
    const tasksChanged=JSON.stringify(current.assignedTasks)!==JSON.stringify(latest.assignedTasks);
    const documentsChanged=JSON.stringify(current.documentAlerts)!==JSON.stringify(latest.documentAlerts);
    current.documentAlerts=latest.documentAlerts;documentNotices.update(latest.documentAlerts,location.pathname+'|'+current.email);
    const teamChanged = JSON.stringify([current.canReviewTeam, current.teamRequests, current.deviceRequests,current.teamSummary,current.teamRequestHistory]) !==
      JSON.stringify([latest.canReviewTeam, latest.teamRequests, latest.deviceRequests,latest.teamSummary,latest.teamRequestHistory]);
    const formatChanged = current.timeFormat !== latest.timeFormat;
    const leaveChanged = current.today !== latest.today || JSON.stringify(current.leaveBalance) !== JSON.stringify(latest.leaveBalance);
    const scheduleChanged = formatChanged || JSON.stringify(current.scheduledPeriods) !== JSON.stringify(latest.scheduledPeriods);
    Object.assign(current, { homeRequests: latest.homeRequests, ownRequests: latest.ownRequests,
      today: latest.today, leaveBalance: latest.leaveBalance,
      scheduledPeriods: latest.scheduledPeriods, punchFromAnywhere: latest.punchFromAnywhere, timeFormat: latest.timeFormat,
      hasLocations: latest.hasLocations, encouragement: latest.encouragement,
      nextPunch: latest.nextPunch, punchWindows: latest.punchWindows, openShiftStart: latest.openShiftStart,
      lastFlexiblePunch: latest.lastFlexiblePunch,
      flexibleDay: latest.flexibleDay, flexibleCompletedMilliseconds: latest.flexibleCompletedMilliseconds,
      flexibleActiveSince: latest.flexibleActiveSince, flexibleActiveUntil: latest.flexibleActiveUntil,
      flexibleRequiredMinutes: latest.flexibleRequiredMinutes,
      leaveTypes: latest.leaveTypes, attendanceTypes: latest.attendanceTypes,
      canReviewTeam: latest.canReviewTeam, canViewDocuments: latest.canViewDocuments, teamRequests: latest.teamRequests, deviceRequests: latest.deviceRequests, teamRequestHistory:latest.teamRequestHistory,
      clockOffset: Number.isFinite(latest.serverNow) ? latest.serverNow - Date.now() : 0,
      shiftStartsAt: latest.shiftStartsAt, shiftEndsAt: latest.shiftEndsAt,
      punchedInAt: latest.punchedInAt, punchedOutToday: latest.punchedOutToday });
    current.attendanceReminders = latest.attendanceReminders;
    current.teamSummary=latest.teamSummary;current.ownRequestsTruncated=latest.ownRequestsTruncated;current.canManageFollowUp=latest.canManageFollowUp;current.assignedTasks=latest.assignedTasks;current.canManageCompany=latest.canManageCompany;renderAssignedTasks(current);
    showAttendanceReminders(current);
    renderEmployeeGreeting();
    $('#employee-location-note').hidden = current.hasLocations;
    punch.disabled = punchInFlight;
    current.canSubmitForStaff=latest.canSubmitForStaff;
    applyRequestAvailability();
    if (requestDialog.open && requestForm.dataset.kind === 'all' && !requestApplicantId && !requestApplicantPending) {
      const select = requestForm.elements.type;
      const available = [...current.leaveTypes, ...current.attendanceTypes];
      const displayed = [...select.options].map(option => option.value).filter(Boolean);
      if (JSON.stringify(available) !== JSON.stringify(displayed)) {
        const selected = select.value;
        select.replaceChildren(new Option(tr('اختر النوع'), ''), ...available.map(type => new Option(employeeRequestLabel(type), type)));
        select.value = available.includes(selected) ? selected : '';
        if (select.value !== selected) updateRequestFields();
      }
    }
    if (changed) renderEmployeeRequests();
    if(leaveChanged){renderPersonalProfile();if(employeeView==='profile-leaves')renderEmployeeLeaveProfile();}
    if (scheduleChanged) renderScheduledPeriods();
    if (teamChanged||tasksChanged||documentsChanged) {
      showHomeTab(homeTab);
      renderTeamHome();
      renderTeamRequestPage();
      renderDeviceRequests(current.deviceRequests ?? []);
    }
    updateEmployeeBell(current);
    updateTime();
    if (afterPunch && employeeView === 'attendance') void loadAttendanceCalendar();
  } catch {
    // Keep the current display during a transient connection failure.
  }
}
window.setInterval(refreshVisibleSession, 30_000);
async function show(forceLogin = false) {
  const load = ++invitationLoad;
  document.documentElement.classList.add('employee-loading');
  try {
  form.hidden = true;
  status.textContent = employeeLanguage === 'en' ? 'Opening your account…' : 'جارٍ فتح حسابك…';
  dashboard.hidden = true;
  const invitation = $('#employee-invitation');
  invitation.hidden = true;
  $('#invitation-email').textContent = '';
  $('#invitation-company').textContent = '';
  $('#employee-title').textContent = tr(token ? 'تفعيل حساب دوامكم' : 'حساب الموظف');
  if (token !== null) {
    const activeToken = token;
    const details = await api('invitation', { token: activeToken });
    if (load !== invitationLoad || token !== activeToken) return;
    if (!details.ok) {
      status.textContent = details.error;
      return;
    }
    $('#invitation-email').textContent = details.email;
    $('#invitation-company').textContent = details.company;
    invitation.hidden = false;
  }
  const activating = token !== null;
  const recoveryLink=$('#employee-forgot');
  const recoveryCompany=location.pathname.match(/^\/company\/([a-f0-9-]{36})\/employee/)?.[1];
  recoveryLink.hidden=activating;
  recoveryLink.href='/forgot-password'+(recoveryCompany?'?company='+recoveryCompany+'&kind=employee':'');
  session = activating || forceLogin === true ? null : await api('session');
  if(!session?.ok)documentNotices.update([],null);
  if (load !== invitationLoad) return;
  if (!activating && !session?.ok && !session?.pending) {
    try { localStorage.removeItem('dawamkom-remembered-workspace'); } catch {}
    location.replace('/?signed-out=1');
    return;
  }
  if (session?.canManageCompany && !isMobileDevice() && !mobilePreviewMode) {
    location.replace(location.pathname.replace(/\/employee\/?$/, '/#home'));
    return;
  }
  $('#employee-title').hidden = Boolean(session?.ok);
  $('#employee-messages').hidden = !session?.ok;
  $('#employee-home-tabs').hidden = employeeView !== 'home' || !session?.ok || !session.canReviewTeam;
  refresh.hidden = !session?.pending;
  if (session?.ok) {
    session.clockOffset = Number.isFinite(session.serverNow) ? session.serverNow - Date.now() : 0;
    showAttendanceReminders(session);
    $('#employee-reminder-optin').hidden = !window.dawamkomRequestNativePush || Boolean(nativePushToken);
    void registerNativePush();
    session.clockOffset = Number.isFinite(session.serverNow) ? session.serverNow - Date.now() : 0;
    status.textContent = '';
    dashboard.hidden = false;
    renderEmployeeGreeting();
    renderDeviceRequests(session.deviceRequests ?? []);
    $('#employee-location-note').hidden = session.hasLocations;
    punch.disabled = punchInFlight;
    applyRequestAvailability();
    renderScheduledPeriods();
    updateTime();
    renderEmployeeDetails();
    showHomeTab(homeTab);
    renderTeamHome();
    showEmployeeView(employeeView);
    return;
  }
  status.textContent = session?.pending ? 'طلب تغيير الجوال بانتظار موافقة المدير المباشر.' : '';
  $('#employee-email').hidden = activating;
  $('#employee-password-rules').hidden = !activating;
  if (activating) form.elements.password.setAttribute('aria-describedby', 'employee-password-rules');
  else form.elements.password.removeAttribute('aria-describedby');
  $('#employee-confirm').hidden = !activating;
  form.elements.email.required = !activating;
  form.elements.confirmation.required = activating;
  form.elements.password.autocomplete = activating ? 'new-password' : 'current-password';
  form.elements.password.minLength = activating ? 10 : 0;
  $('#employee-submit').textContent = tr(activating ? 'تفعيل الحساب' : 'تسجيل الدخول');
  change.hidden = true;
  form.hidden = Boolean(session?.pending);
  } finally {
    if (load === invitationLoad) document.documentElement.classList.remove('employee-loading');
  }
}
async function authenticate(requestChange = false) {
  if (!form.reportValidity()) return;
  const credentials = Object.fromEntries(new FormData(form));
  const result = await api(token ? 'activate' : 'login', { ...credentials, token, requestChange });
  if (result.changeRequired) {
    status.textContent = 'هذا المتصفح غير معتمد. قدّم طلب تغيير الجوال.';
    change.hidden = false;
  } else if (!result.ok) {
    status.textContent = result.error;
  } else {
    const activated = token !== null;
    if (result.approved && /^\/company\/[a-f0-9-]{36}\/employee$/.test(location.pathname)) {
      try {
        localStorage.setItem('dawamkom-remembered-workspace', location.pathname);
      } catch {}
    }
    const activatedEmail = $('#invitation-email').textContent;
    if (activated) history.replaceState(null, '', location.pathname + location.search);
    token = null;
    form.reset();
    if (activated) form.elements.email.value = activatedEmail;
    await show(activated);
  }
}
async function run(control, action, feedback = status) {
  control.disabled = true;
  try { await action(); }
  catch { feedback.textContent = tr('تعذّر إكمال الإجراء. حاول مرة أخرى.');if(!$('#employee-retry')){const retry=document.createElement('button');retry.id='employee-retry';retry.type='button';retry.className='button secondary';retry.textContent=employeeLanguage==='ar'?'إعادة المحاولة':'Retry';retry.onclick=()=>{retry.remove();run(control,action,feedback);};feedback.after(retry);} }
  finally { control.disabled = false; }
}
form.onsubmit = event => {
  event.preventDefault();
  run($('#employee-submit'), () => authenticate());
};
change.onclick = () => run(change, () => authenticate(true));
refresh.onclick = () => run(refresh, show);
const logout = $('#employee-logout');
logout.onclick = () => run(logout, async () => {
  const registration = supportsPush ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
  const subscription = await registration?.pushManager.getSubscription().catch(() => null);
  const result = await api('logout', { pushEndpoint: subscription?.endpoint, nativePushToken });
  if (!result.ok) throw new Error(result.error);
  nativePushToken = undefined;
  seenAttendanceReminders.clear();
  employeeSalaryVisible = false;
  form.reset();
  requestForm.reset();
  employeeView = 'home';
  homeTab = 'personal';
  $('#employee-request-status').textContent = '';
  $('#employee-device-status').textContent = '';
  try { localStorage.removeItem('dawamkom-remembered-workspace'); } catch {}
  session = null;documentNotices.update([],null);
  location.replace('/?signed-out=1');
});
$('#employee-language').onchange = event => {
  employeeLanguage = event.target.value;
  try { localStorage.setItem('dawamkom-employee-language', employeeLanguage); } catch {}
  applyEmployeeLanguage();
  if (session?.ok) show();
};
const passwordDialog = $('#employee-password-dialog');
const passwordForm = $('#employee-password-form');
const passwordStatus = $('#employee-password-status');
$('#employee-password-open').onclick = () => { passwordForm.reset(); passwordStatus.textContent = ''; passwordDialog.showModal(); };
passwordForm.onsubmit = event => {
  event.preventDefault();
  run(event.submitter, async () => {
    const result = await api('password', Object.fromEntries(new FormData(passwordForm)));
    if (!result.ok) { passwordStatus.textContent = tr(result.error); return; }
    passwordForm.reset();
    passwordDialog.close();
    employeeToast('تم تغيير كلمة المرور.');
  }, passwordStatus);
};
// Native validation bubbles are not reliably visible inside the mobile WebView.
requestForm.noValidate = true;
requestForm.onsubmit = event => {
  event.preventDefault();
  if(requestApplicantPending)return;
  const message = $('#employee-request-status');
  message.textContent = '';
  for (const control of requestForm.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid');
  const invalid = [...requestForm.elements].find(control => control.willValidate && !control.validity.valid);
  if (invalid) {
    const names = {date:['تاريخ الطلب','request date'],end:['تاريخ الانتهاء','end date'],
      correctionReason:['سبب تصحيح البصمة','correction reason'],proposedIn:['وقت الحضور المقترح','proposed clock-in time'],
      proposedOut:['وقت الانصراف المقترح','proposed clock-out time'],note:['وصف الطلب','request description'],
      type:['نوع الطلب','request type'],periodId:['الفترة المطلوبة','requested shift'],
      leaveRequestId:['الإجازة المطلوب إلغاؤها','leave to cancel'],excuseType:['نوع الاستئذان','permission type'],
      reason:['السبب','reason'],loanAmount:['مبلغ السلفة','loan amount'],repaymentInstallments:['طريقة السداد','repayment plan']};
    const label=names[invalid.name.replace(/^(proposedIn|proposedOut)\d+$/, '$1')] ?? ['الخانة المطلوبة','required field'];
    message.textContent=employeeLanguage==='en'?'Check the '+label[1]+'. Fill it in with a valid value.':'تحقّق من '+label[0]+' وأدخل قيمة صحيحة.';
    (invalid.closest('label') ?? invalid).before(message);
    invalid.setAttribute('aria-invalid','true');
    invalid.setAttribute('aria-describedby','employee-request-status');
    invalid.scrollIntoView({block:'center',behavior:'smooth'});
    invalid.focus({preventScroll:true});
    return;
  }
  run(event.submitter, async () => {
    const values = Object.fromEntries(new FormData(requestForm));
    if(requestApplicantId)values.onBehalfOf=requestApplicantId;
    if (values.type === 'Missed punch') {
      const edits = correctionPeriods.flatMap((period, index) => {
        const proposedIn = values['proposedIn' + index], proposedOut = values['proposedOut' + index];
        delete values['proposedIn' + index];
        delete values['proposedOut' + index];
        return proposedIn || proposedOut ? [{
          periodId:period.id, shiftStart:period.start, shiftEnd:period.end, proposedIn, proposedOut,
        }] : [];
      });
      if (!edits.length) {
        message.textContent = tr(ar['Choose at least one valid proposed time.']);
        return;
      }
      if (edits[0].periodId) values.periodCorrections = edits;
      else Object.assign(values, {proposedIn:edits[0].proposedIn, proposedOut:edits[0].proposedOut});
    }
    const file = values.attachment;
    delete values.attachment;
    if (file?.size) {
      if (file.size > 2 * 1024 * 1024) { message.textContent = 'حجم المرفق يتجاوز 2 ميجابايت.'; return; }
      const encoded = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      values.attachment = { name: file.name, data: encoded };
    }
    const result = await api('requests', values);
    if (result.ok) {
      requestForm.dataset.uxDirty='';requestForm.reset();requestForm.querySelector('.ux-unsaved')?.remove();requestDialog.close();
      await show();
      employeeToast('تم إرسال الطلب.');
    } else message.textContent = result.error === correctionLimitMessage ? tr(ar[correctionLimitMessage]) : ar[result.error] ?? result.error;
  }, message);
};
function showPunchFeedback(messages, tone) {
  const message = messages[employeeLanguage === 'en' ? 1 : 0];
  employeeToast(message, tone);
}
punch.onclick = async () => {
  if (punchInFlight) return;
  punchInFlight = true;
  punch.disabled = true;
  punch.setAttribute('aria-busy', 'true');
  try {
    const timing = currentPunchTiming();
    const result = await submitPunch({
      timing, nextPunch: session.nextPunch,
      hasLocations: session.hasLocations, anywhere: session.punchFromAnywhere,
      online: navigator.onLine !== false,
      locate: () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Location unavailable')); return; }
        // The native WebView bridge may not enforce the browser's timeout option.
        const timer = setTimeout(() => reject({code:3}), 15000);
        const finish = callback => value => { clearTimeout(timer); callback(value); };
        try { navigator.geolocation.getCurrentPosition(finish(resolve), finish(reject), {enableHighAccuracy:true,timeout:15000,maximumAge:0}); }
        catch(error) { clearTimeout(timer); reject(error); }
      }),
      send: values => api('punch', values, 20000), feedback: showPunchFeedback,
    });
    if (result?.saved) {
      // A failed dashboard refresh must never replace a confirmed saved result.
      await refreshVisibleSession(true);
      if (result.showEncouragement === true) showPunchGreeting(timing.kind);
    }
  } catch {
    showPunchFeedback(punchMessages.uncertain, 'error');
  } finally {
    punchInFlight = false;
    punch.disabled = false;
    punch.removeAttribute('aria-busy');
  }
};
run($('#employee-submit'), show);
