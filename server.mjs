import {isDeepStrictEqual} from 'node:util';
import {browserChangeType,approvalRequestTypes,browserApprovalMembers,beginBrowserApproval,decideBrowserApproval} from './public/browser-approval.js';
import {monthlyEmployeeSummary} from './monthly-employee-mail.mjs';
import {documentAlerts} from './public/document-alerts.js';
import {documentMaxBytes,documentDisplayName} from './public/document-reader.js';
import {documentSuggestionTextLimit,suggestDocument} from './document-suggestions.mjs';
import {hasAdministration,hasRolePermission,eligibleRequestApprover,canDistributePermissions,authorizeRoleAction,updateRolePermissions,permissionsFor,approvalRole,approvalStepMembers,eligibleApprovalRoles} from './public/role-permissions.js';
import {enrichmentPatch} from './public/employee-enrichment.js';
import {followUpItems,eligibleFollowUpAssignees,assignFollowUp,assignFollowUpBatch,receiveFollowUp,updateFollowUp,publicFollowUpRecords,createFollowUpTicket,deleteFollowUpTicket,materializeRecurringFollowUps} from './public/follow-up.js';
import {claimAttendanceSummaryMessages,finishAttendanceSummaryMessage} from './attendance-summary-mail.mjs';
import {residencyAlerts} from './public/residency-alerts.js';
import {officialHolidays,holidaySettings,officialHolidaysOn,holidayCalendarSnapshot,refreshHolidayCalendar} from './public/official-holidays.js';
import {runtime, assertRuntimeWrite} from './runtime-mode.mjs';
import {effectiveNotificationPreferences,effectiveNotificationSettings,documentReminderDays} from './public/notification-preferences.js';
import {applyPunchCorrection, correctionPeriods, periodPunches} from './public/punch-correction.js';
import {requestRecovery,consumeRecovery,RecoveryThrottle,recoveryMessage} from './password-recovery.mjs';
import {accountEmail,followUpAssignmentEmail,activationEmailSent,recordActivationEmail} from './public/account-email.js';
import { normalizeIban, validSaudiIban } from './public/saudi-iban.js';
import {claimMonthlyMessages, finishMonthlyMessage} from './monthly-employee-mail.mjs';
import { attendanceReminders, recordAttendanceReminder, visibleAttendanceReminders } from './attendance-reminders.mjs';
import { validateNotificationDisplay } from './public/notification-display.js';
import { assignBranchRole, updateBranchAdministrators, managesBranch, roleBranches, eligibleDirectManager, isAdministrator, needsDirectManager } from './public/branch-roles.js';
import { employeeRequestTypes, employeeRequestEnabled, effectiveRequestPreferences, requestContractTypes, correctionMonthlyLimit, reachedCorrectionMonthlyLimit, loanRequestTerms, legacySickLeave } from './public/request-settings.js';
import { scheduleApprovedLoan } from './loans.mjs';
import { mutatePayroll, publicPayrollRuns } from './payroll.mjs';
import { updatedCompanyCredentials } from './company-credentials.mjs';
import { encouragementSettings, validateEncouragementPhrases, dailyGreetingDecision } from './public/employee-greetings.js';
import { annualLeaveBalance, annualLeaveRequired, futureAnnualLeave } from './public/leave-balance.js';
import { approvedAttendanceLeaves } from './public/ux-model.js';
import { createServer } from 'node:http';
import { gzip, gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { employeePage } from './employee-page.mjs';
import { handleAdmin, isAdmin, companyViewAccess, beginCompanyView, endCompanyView } from './admin-auth.mjs';
import { openStorage, storageConflict } from './storage.mjs';
import { notifyAttendance, validExpoPushToken, notifyApproval, pushPublicKey, pushSubscription } from './push.mjs';
import { allowsAnywhere, allowsCompanyLocation, assignedToPunchLocation, defaultPeriodIds, effectivePeriodIds, flexibleDayTotals, isDefaultRestDay, isFlexiblePeriod, isScheduleRestDay, nextPeriodColor, periodColors, periodDisplayColor,
  periodBounds, periodOnDay, periodSchedule, punchTiming, punchSession, canRecordUnpairedCheckout, scheduleWeekday, periodActiveOn, validPeriodColor, reassignShiftPunches, periodDurationMinutes, periodsOverlap, periodAvailableFor, assignedStaffForPeriod } from './public/work-schedule.js';
import { annualLeaveDays, contractTerms, contractTypes, genders, jobTitles, nationalityCodes, probationDays, westernDigits } from './public/staff-options.js';
import { staffRoles } from './public/staff-options.js';

const releaseDigest = createHash('sha256');
for (const file of ['attendance-summary-mail.mjs', 'document-suggestions.mjs', 'server.mjs', 'password-recovery.mjs', 'runtime-mode.mjs', 'monthly-employee-mail.mjs', 'employee-page.mjs', 'attendance-reminders.mjs', 'push.mjs', 'loans.mjs', 'payroll.mjs', 'admin-auth.mjs', 'storage.mjs', 'company-credentials.mjs', ...readdirSync(new URL('./public/', import.meta.url), {withFileTypes:true}).filter(entry => entry.isFile()).map(entry => 'public/' + entry.name)].sort()) {
  releaseDigest.update(file).update(readFileSync(new URL(file, import.meta.url)));
}
const releaseVersion = releaseDigest.digest('hex').slice(0,16);
const staticResponses = new Map();
const files = new Map([
  ['/font-inter-latin-400-800.woff2', ['font-inter-latin-400-800.woff2', 'font/woff2']],
  ['/font-tajawal-arabic-400.woff2', ['font-tajawal-arabic-400.woff2', 'font/woff2']],
  ['/font-tajawal-arabic-500.woff2', ['font-tajawal-arabic-500.woff2', 'font/woff2']],
  ['/font-tajawal-arabic-700.woff2', ['font-tajawal-arabic-700.woff2', 'font/woff2']],
  ['/font-tajawal-arabic-800.woff2', ['font-tajawal-arabic-800.woff2', 'font/woff2']],
  ['/font-tajawal-latin-400.woff2', ['font-tajawal-latin-400.woff2', 'font/woff2']],
  ['/font-tajawal-latin-500.woff2', ['font-tajawal-latin-500.woff2', 'font/woff2']],
  ['/font-tajawal-latin-700.woff2', ['font-tajawal-latin-700.woff2', 'font/woff2']],
  ['/font-tajawal-latin-800.woff2', ['font-tajawal-latin-800.woff2', 'font/woff2']],

  ['/forgot-password', ['password-recovery.html', 'text/html']],
  ['/reset-password', ['password-recovery.html', 'text/html']],
  ['/password-recovery.js', ['password-recovery.js', 'text/javascript']],
  ['/account-email.js', ['account-email.js', 'text/javascript']],
  ['/saudi-iban.js', ['saudi-iban.js', 'text/javascript']],
  ['/browser-approval.js', ['browser-approval.js', 'text/javascript']],
  ['/employee-experience.js', ['employee-experience.js', 'text/javascript']],
  ['/document-wallet.js', ['document-wallet.js', 'text/javascript']],
  ['/profile-avatar.js', ['profile-avatar.js', 'text/javascript']],
  ['/update-notice.js', ['update-notice.js', 'text/javascript']],
  ['/notification-display.js', ['notification-display.js', 'text/javascript']],
  ['/branch-roles.js', ['branch-roles.js', 'text/javascript']],
  ['/privacy', ['privacy.html', 'text/html']],
  ['/support', ['support.html', 'text/html']],
  ['/leave-balance.js', ['leave-balance.js', 'text/javascript']],
  ['/', ['index.html', 'text/html']],
  ['/demo', ['index.html', 'text/html']],
  ['/workspace-login.js', ['workspace-login.js', 'text/javascript']],
  ['/super-admin', ['index.html', 'text/html']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/request-settings.js', ['request-settings.js', 'text/javascript']],
  ['/official-holidays.js', ['official-holidays.js', 'text/javascript']],
  ['/bank-payroll.js', ['bank-payroll.js', 'text/javascript']],
  ['/payroll.js', ['payroll.js', 'text/javascript']],
  ['/payroll-model.js', ['payroll-model.js', 'text/javascript']],
  ['/device-interface.js', ['device-interface.js', 'text/javascript']],
  ['/setup-guide.js', ['setup-guide.js', 'text/javascript']],
  ['/ar.js', ['ar.js', 'text/javascript']],
  ['/staff-options.js', ['staff-options.js', 'text/javascript']],
  ['/theme.js', ['theme.js', 'text/javascript']],
  ['/theme.css', ['theme.css', 'text/css']],
  ['/ux.js', ['ux.js', 'text/javascript']],
  ['/ux-model.js', ['ux-model.js', 'text/javascript']],
  ['/work-schedule.js', ['work-schedule.js', 'text/javascript']],
  ['/punch-correction.js', ['punch-correction.js', 'text/javascript']],
  ['/report-files.js', ['report-files.js', 'text/javascript']],
  ['/employee.js', ['employee.js', 'text/javascript']],
  ['/employee-follow-up.js', ['employee-follow-up.js', 'text/javascript']],
  ['/punch-feedback.js', ['punch-feedback.js', 'text/javascript']],
  ['/employee-greetings.js', ['employee-greetings.js', 'text/javascript']],
  ['/employee-notifications-sw.js', ['employee-notifications-sw.js', 'text/javascript']],
  ['/company-auth.js', ['company-auth.js', 'text/javascript']],
  ['/style.css', ['style.css', 'text/css']],
  ['/leaflet.css', ['leaflet.css', 'text/css']],
  ['/brand-reference.png', ['brand-reference.png', 'image/png']],
  ['/apple-touch-icon.png', ['apple-touch-icon.png', 'image/png']],
  ['/app-icon-192.png', ['app-icon-192.png', 'image/png']],
  ['/app-icon-512.png', ['app-icon-512.png', 'image/png']],
  ['/dawamkom-logo.svg', ['dawamkom-logo.svg', 'image/svg+xml']],
  ['/punch-fingerprint.png', ['punch-fingerprint.png', 'image/png']],
]);
for(const file of readdirSync(new URL('./public/vendor/document-reader/',import.meta.url))) {
 const extension=file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream';
 files.set('/vendor/document-reader/'+file,['vendor/document-reader/'+file,extension]);
}
files.set('/follow-up.js',['follow-up.js','text/javascript']);
files.set('/employee-template.js',['employee-template.js','text/javascript']);
files.set('/employee-import.js',['employee-import.js','text/javascript']);
files.set('/role-permissions.js',['role-permissions.js','text/javascript']);
files.set('/staff-financial.js',['staff-financial.js','text/javascript']);
files.set('/document-alerts.js',['document-alerts.js','text/javascript']);
files.set('/notification-preferences.js',['notification-preferences.js','text/javascript']);
files.set('/document-alert-popup.js',['document-alert-popup.js','text/javascript']);
files.set('/employee-enrichment.js',['employee-enrichment.js','text/javascript']);
files.set('/date-format.js',['date-format.js','text/javascript']);
files.set('/date-controls.js',['date-controls.js','text/javascript']);
files.set('/pdf-font-recovery.js',['pdf-font-recovery.js','text/javascript']);
files.set('/document-reader.js',['document-reader.js','text/javascript']);

const dataFile = new URL('./.dawamak-demo.json', import.meta.url);
const tempFile = new URL('./.dawamak-demo.tmp', import.meta.url);
const host = process.env.DAWAMAK_HOST || '127.0.0.1';
const hostedDemo = host !== '127.0.0.1';
const previewLifetime = 8 * 60 * 60;
const digest = (value) => createHash('sha256').update(value).digest();
const date = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', dateStyle: 'short' }).format(new Date());
const acceptsGzip = req => (req.headers['accept-encoding'] ?? '').split(',').some(item => {
  const [encoding, ...params] = item.trim().toLowerCase().split(';');
  return encoding === 'gzip' && !params.some(param => /^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(param));
});
const leavePolicies = [
  ['Annual leave', null, true],
  [futureAnnualLeave, null, false],
  ['Death of a spouse, ancestor or descendant', 5, false],
  ['Care for a child with special needs', 30, false, 'Starts immediately after birth and may be extended for one unpaid month.'],
  ['Hajj leave', 15, false],
  ['Marriage leave', 5, false],
  ['Maternity leave', 84, false, 'Six weeks are taken immediately after childbirth. The other six can start up to four weeks before the expected date.'],
  ['Newborn leave', 3, false, 'May be taken within seven days of birth.'],
  ['Death of a sibling', 3, false],
  ['Sick leave', 120, true],
  ['Exam leave', 0, false],
  ['Unpaid leave', 60, true],
  ['Widow leave', 130, false],
  ['Widow leave (non-Muslim)', 15, false],
];
const defaultLeaveTypes = leavePolicies.map(([name]) => name);
const defaultLeaveSettings = Object.fromEntries(leavePolicies.map(([name, maxDays, active, description]) =>
  [name, { maxDays, active, description }]));
const activeLeaveTypes = (workspace,person) => workspace.leaveTypes.filter(name => employeeRequestEnabled(workspace,person,name));
const requestAttendanceTypes = (workspace,person) => [...attendanceTypes,'Leave cancellation'].filter(type=>employeeRequestEnabled(workspace,person,type));
const requestPeriods = (workspace,person) => workspace.workPeriods.filter(period=>periodAvailableFor(period,person)).map(({id,name,start,end,kind,duration})=>({id,name,start,end,kind,duration}));
const requestCancellableLeaves = (workspace,person,today,now) => {
  const own=workspace.requests.filter(item=>item.staffId===person.id);
  return own.filter(item=>item.status==='Approved'&&workspace.leaveTypes.includes(item.type)&&(item.end??item.date)>=today&&
    !own.some(other=>other.type==='Leave cancellation'&&other.leaveRequestId===item.id&&requestStatus(other,now)==='Pending'))
    .map(({id,type,date,end})=>({id,type,date,end}));
};
const attendanceTypes = ['Missed punch', 'Attendance excuse', 'Loan request', 'Shift change'];
const directApprovalStep = 'direct-manager';
const eligibleApprover = (person,workspace) => eligibleRequestApprover(workspace,person);
const approvalQueueDelay = 4000;
function queuedDecisionReviewer(workspace, request, actor) {
  const members = request.approvalSteps ? approvalStepMembers(workspace, request) : null;
  if (actor === 'account-owner') {
    if (!members) return null;
    const reviewer = workspace.staff.find(person => members.includes(person.id));
    demand(reviewer, 'Only the current approver can decide this request.');
    return {...reviewer, accountOwnerAction:true};
  }
  const reviewer = workspace.staff.find(person => person.id === actor);
  demand(eligibleApprover(reviewer, workspace) && managesBranch(reviewer, workspace.staff.find(person => person.id === request.staffId)?.branchId)
    && (!members || members.includes(actor)), 'Only the current approver can decide this request.');
  return reviewer;
}
function approvalQueueSnapshot(workspace, actor) {
  return {
    jobs:(workspace.pendingApprovals ?? []).filter(job=>job.actor===actor).map(({id,runAt})=>({id,runAt})),
    failure:(workspace.approvalQueueFailures ?? []).findLast(item=>item.actor===actor) ?? null,
    now:Date.now(),
  };
}
const currentApprover = request => request.approvalSteps?.[request.approvalIndex];
const systemApprovalActor = Object.freeze({id:'system'});
const autoApprovesOwnRequests = (workspace,person) => Boolean(person?.status==='Active' && isAdministrator(person,workspace) && !person.managerId);
function requestApprovalSteps(workspace, type, employeeId, { skipDirectManager = false } = {}) {
  if (!approvalRequestTypes(workspace).includes(type)) return;
  const employee = workspace.staff.find(person => person.id === employeeId);
  const configured = workspace.approvalChains?.[type];
  const steps = (configured ?? [directApprovalStep]).filter(step => !skipDirectManager || step !== directApprovalStep).map(step =>
    step === directApprovalStep ? employee?.managerId : step);
  if (skipDirectManager && !steps.length) return;
  const members=step=>approvalStepMembers(workspace,{staffId:employeeId},step);
  if (!configured && !steps.some(step=>members(step).length)) return;
  demand(steps.every(step=>members(step).length),
    'An approver is unavailable. Check the approval chain.');
  const approvers = [...new Set(steps)].filter(id => id !== employeeId);
  demand(approvers.length, 'An approver is unavailable. Check the approval chain.');
  return approvers;
}
const excuseTypes = ['Late arrival', 'Early departure', 'During work'];
const excuseReasons = ['Personal', 'Medical', 'Other'];
const correctionReasons = ['Forgot to punch', 'Mobile app issue', 'Internet issue', 'Off-site visit', 'Other'];
const attachmentMaxBytes = 2 * 1024 * 1024;
const followUpDeleteError={403:'Follow-up centre permission is required.',404:'Ticket not found.',409:'Follow-up changed. Refresh and try again.'};
const attachmentBodyLimit = Math.ceil(attachmentMaxBytes / 3) * 4 + 8192;
const documentBase64Limit = Math.ceil(documentMaxBytes / 3) * 4;
const documentBodyLimit = documentBase64Limit + 8192;
const documentAiKey = process.env.DAWAMAK_DOCUMENT_AI_KEY?.trim();
const documentAiOllama = process.env.DAWAMAK_DOCUMENT_AI_OLLAMA_URL?.trim();
const documentAiModel = process.env.DAWAMAK_DOCUMENT_AI_MODEL?.trim() || (documentAiOllama ? '' : 'gpt-4.1-mini');
const documentAiProvider = documentAiOllama ? (documentAiModel ? 'Ollama' : null) : documentAiKey ? 'OpenAI' : null;
const dayMilliseconds = 86_400_000;
const requestTimestamp = (timestamp, fallbackDay) => Date.parse(timestamp ?? (fallbackDay ? fallbackDay + 'T00:00:00+03:00' : ''));
function requestStatus(request, now = Date.now()) {
  const pendingSince = requestTimestamp(request.approvalStepStartedAt ?? request.submittedAt, request.submittedOn);
  return request.status === 'Pending' && now - pendingSince >= 3 * dayMilliseconds ? 'Cancelled' : request.status;
}
const requestSummary = ({ attachment, ...item },workspace) => ({
  ...item, status: requestStatus(item),
  approverId: item.status === 'Pending' ? currentApprover(item) : item.decidedBy,
  approverIds: item.status === 'Pending'&&workspace ? approvalStepMembers(workspace,item) : [],
  approverRole: approvalRole(currentApprover(item)),
  ...(attachment ? { attachmentName: attachment.name } : {}),
});
let state = {
  company: 'XYZ Company', slug: 'xyz', site: 'Main office', latitude: null, longitude: null, radius: 100,
  staff: [
    { id: 'demo', name: 'Sara Ahmed', email: 'sara@example.com', role: 'Employee', status: 'Active' },
    { id: 'omar', name: 'Omar Khalid', email: 'omar@example.com', role: 'Manager', status: 'Active' },
    { id: 'noura', name: 'Noura Ali', email: 'noura@example.com', role: 'Employee', status: 'Active' },
  ],
  punches: [],
  leaveTypes: defaultLeaveTypes,
  leaveSettings: defaultLeaveSettings,
  jobTitles: [...jobTitles],
  staffRoles: [...staffRoles],
  workSchedule: { days: [0, 1, 2, 3, 4, 6], start: '09:00', end: '17:00' },
  workPeriods: [],
  workAssignments: [],
  requests: [{ id: 'sample', staffId: 'noura', type: 'Annual leave', date: date(), end: date(), note: 'Personal appointment', status: 'Pending' }],
};
const partnersFile = new URL('./.dawamkom-partners.json', import.meta.url);
const partnersTemp = new URL('./.dawamkom-partners.tmp', import.meta.url);
let partners = [];
let platformProfile = { name: 'Dawamkom' };
let demoCompanyStatus = 'active';
try {
  const saved = JSON.parse(readFileSync(partnersFile, 'utf8'));
  partners = Array.isArray(saved) ? saved : saved.partners;
  platformProfile = saved.profile ?? platformProfile;
  demoCompanyStatus = saved.demoCompanyStatus ?? 'active';
}
catch (error) { if (error.code !== 'ENOENT') throw error; }
async function persistPlatform(nextPartners, profile, nextDemoStatus = demoCompanyStatus) {
  assertRuntimeWrite();
  if (storage) {
    await storage.write({ state, partners: nextPartners, profile, demoCompanyStatus: nextDemoStatus });
  } else {
    writeFileSync(partnersTemp, JSON.stringify({ partners: nextPartners, profile, demoCompanyStatus: nextDemoStatus }, null, 2));
    renameSync(partnersTemp, partnersFile);
  }
  partners = nextPartners;
  platformProfile = profile;
  demoCompanyStatus = nextDemoStatus;
}
const demoSeed = structuredClone({ ...state, locations: [] });
const demos = new Map();
function demoWorkspace(req) {
  const now = Date.now();
  for (const [id, demo] of demos) {
    if (demo.expires <= now) demos.delete(id);
  }
  const id = req.headers.cookie?.match(/(?:^|;\s*)dawamak_demo=([a-f0-9-]{36})(?:;|$)/)?.[1];
  if (demos.has(id)) return { demo: demos.get(id) };
  if (demos.size >= 250) demos.delete(demos.keys().next().value);
  const newId = randomUUID();
  const demo = { state: structuredClone(demoSeed), expires: now + previewLifetime * 1000 };
  demos.set(newId, demo);
  return { demo, cookie: `dawamak_demo=${newId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${previewLifetime}${host === '127.0.0.1' ? '' : '; Secure'}` };
}
try { state = JSON.parse(readFileSync(dataFile, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const storage = await openStorage();
function consolidateSickLeave(workspace) {
  if (!workspace.leaveTypes?.some(legacySickLeave) && !workspace.requests?.some(request => legacySickLeave(request.type))) return;
  workspace.leaveTypes = [...new Set((workspace.leaveTypes ?? []).map(type => legacySickLeave(type) ? 'Sick leave' : type))];
  workspace.leaveSettings = { 'Sick leave': { ...defaultLeaveSettings['Sick leave'] }, ...workspace.leaveSettings };
  for (const request of workspace.requests ?? []) {
    if (legacySickLeave(request.type)) request.type = 'Sick leave';
  }
}
function applyStorage(saved) {
  if (!saved) return;
  ({ state, partners, profile: platformProfile, demoCompanyStatus } = saved);
  consolidateSickLeave(state);
  for (const partner of partners) consolidateSickLeave(partner.workspace);
}
const initialSnapshot = await storage?.read({ bootstrap: process.env.DAWAMAK_STORAGE_BOOTSTRAP === '1' });
applyStorage(initialSnapshot);
if (!initialSnapshot) {
  consolidateSickLeave(state);
  for (const partner of partners) consolidateSickLeave(partner.workspace);
}
state.locations ??= state.latitude === null ? [] : [{
  id: 'original', name: state.site, latitude: state.latitude, longitude: state.longitude, radius: state.radius,
}];
state.leaveTypes = [...new Set([...defaultLeaveTypes, ...(state.leaveTypes ?? [])])];
state.leaveSettings = Object.fromEntries(state.leaveTypes.map(name => [name,
  (Object.hasOwn(state.leaveSettings ?? {}, name) && state.leaveSettings[name]) ||
  (Object.hasOwn(defaultLeaveSettings, name) && defaultLeaveSettings[name]) ||
  { maxDays: null, active: true },
]));
state.jobTitles ??= [...jobTitles];
state.staffRoles ??= [...staffRoles];
state.workSchedule ??= structuredClone(demoSeed.workSchedule);
state.workPeriods ??= [];
for (const period of state.workPeriods) period.id ??= randomUUID();
state.workAssignments ??= [];

function demand(condition, message) {
  if (!condition) throw new Error(message);
}
class PunchRejected extends Error {
  constructor(message, attempt) {
    super(message);
    this.attempt = attempt;
  }
}
function distance(lat, lng, site) {
  const rad = (degrees) => degrees * Math.PI / 180;
  const a = Math.sin(rad(lat - site.latitude) / 2) ** 2 +
    Math.cos(rad(site.latitude)) * Math.cos(rad(lat)) * Math.sin(rad(lng - site.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}
const coordinate = (value, max) => Number.isFinite(value) && Math.abs(value) <= max;
function scheduledRange(assignment, period) {
  return { assignment, ...periodBounds(period, assignment.date), period };
}
const shiftDayBy = (day, offset) => new Date(Date.parse(day) + offset * dayMilliseconds).toISOString().slice(0, 10);
function effectiveRanges(workspace, person, day) {
  return effectivePeriodIds(workspace, person, day).flatMap(id => {
    const period = periodOnDay(workspace.workPeriods.find(item => item.id === id), day);
    return period ? [scheduledRange({ date: day }, period)] : [];
  });
}
function employeePunchWindows(workspace, person, today) {
  if (person.attendanceExempt) return [];
  const minute = 60_000;
  const dayStart = Date.parse(today + 'T00:00:00+03:00');
  return [-2, -1, 0, 1].flatMap(offset => effectiveRanges(workspace, person, shiftDayBy(today, offset)))
    .map(({ start, end, period }) => ({
      start, end,
      flexible: isFlexiblePeriod(period),
      arrivalStart: isFlexiblePeriod(period) ? start : start - (period.arrival?.before ?? 60) * minute,
      arrivalEnd: isFlexiblePeriod(period) ? end - 1 : start + (period.arrival?.after ?? 60) * minute,
      departureStart: isFlexiblePeriod(period) ? start : end - (period.departure?.before ?? 60) * minute,
      departureEnd: isFlexiblePeriod(period) ? end - 1 : end + (period.departure?.after ?? 60) * minute,
    }))
    .filter(shift => (shift.start >= dayStart && shift.start < dayStart + dayMilliseconds) ||
      (shift.start < dayStart && shift.departureEnd >= dayStart) ||
      shift.arrivalStart < dayStart + dayMilliseconds && shift.start >= dayStart + dayMilliseconds)
    .sort((a, b) => a.start - b.start);
}
function openPunchShift(windows, lastPunch) {
  if (lastPunch?.kind !== 'in') return null;
  if (lastPunch.shiftStart != null) return lastPunch.shiftStart;
  const time = Date.parse(lastPunch.time);
  return windows.find(shift => time >= shift.arrivalStart && time <= shift.arrivalEnd)?.start ?? null;
}
function employeeCalendar(workspace, employee, firstDay, today, now) {
  const punches = workspace.punches.filter(entry => entry.staffId === employee.id);
  const leaves = approvedAttendanceLeaves(workspace,employee);
  const days = [];
  for (let day = firstDay; day.slice(0, 7) === firstDay.slice(0, 7); day = shiftDayBy(day, 1)) {
    const ranges = effectiveRanges(workspace, employee, day);
    const starts = new Set(ranges.map(range => range.start));
    const isLeave = leaves.some(leave => leave.date <= day && (leave.end ?? leave.date) >= day);
    const holiday=officialHolidaysOn(workspace,employee,day);
    const records = punches.filter(entry => holiday.length ? (entry.shiftStart==null?entry.date===day:new Date(entry.shiftStart+10800000).toISOString().slice(0,10)===day) : entry.shiftStart == null ? entry.date === day : starts.has(entry.shiftStart));
    const windows = employeePunchWindows(workspace, employee, day).filter(window => starts.has(window.start));
    const missingPunchKinds = new Set();
    const punchPeriods = new Map();
    const checks = windows.map(window => {
      const entries = records.filter(entry => entry.shiftStart === window.start || (entry.shiftStart == null &&
        (windows.length === 1 || (entry.kind === 'in'
          ? Date.parse(entry.time) >= window.arrivalStart && Date.parse(entry.time) <= window.arrivalEnd
          : Date.parse(entry.time) >= window.departureStart && Date.parse(entry.time) <= window.departureEnd))));
      const period = ranges.find(range => range.start === window.start)?.period;
      for (const entry of entries) {
        punchPeriods.set(entry, punchPeriods.has(entry) ? null : period?.name);
      }
      const arrival = entries.find(entry => entry.kind === 'in');
      const departure = entries.findLast(entry => entry.kind === 'out');
      if (!isLeave && !holiday.length && now > window.departureEnd && Boolean(arrival) !== Boolean(departure)) missingPunchKinds.add(arrival ? 'out' : 'in');
      if (arrival && departure && entries.at(-1)?.kind === 'out' && Date.parse(departure.time) >= Date.parse(arrival.time)) {
        // Evaluate the effective schedule, not historical punch classification flags.
        if (window.flexible && period?.duration > 0 && flexibleDayTotals(entries.map(entry => ({...entry, flexible:true, shiftEnd:window.end})), day, now, window).completedMilliseconds < period.duration * 60000)
          return now > window.end ? 'issue' : 'pending';
        return 'complete';
      }
      return now > (arrival ? window.departureEnd : window.arrivalEnd) ? 'issue' : 'pending';
    });
    const status = isLeave || employee.attendanceExempt || !ranges.length ? 'off' : day > today ? 'pending' :
      checks.includes('issue') ? 'issue' : checks.every(check => check === 'complete') ? 'complete' : 'pending';
    days.push({ date: day, status, missingPunchKinds:[...missingPunchKinds], leave: isLeave, officialHoliday:officialHolidaysOn(workspace,employee,day).map(h=>h.name),
      periods: ranges.map(({ period }) => ({ name: period.name, start: period.start, end: period.end, flexible: isFlexiblePeriod(period) })),
      workedMinutes: monthlyEmployeeSummary(workspace,employee,firstDay.slice(0,7),now,{first:day,last:day}).workedMinutes,
      punches: records.map(entry => {
        const { kind, time, site, device } = entry;
        const period = punchPeriods.get(entry);
        return { kind, time, ...(site?{site}:{}), ...(device?{device}:{}), ...(period?{period}:{}) };
      }) });
  }
  return { today, days };
}
function teamAttendanceSummary(workspace,employee,metricStaff,branchManager,signedIntoCompany,today,now) {
  metricStaff = metricStaff.filter(person => !person.attendanceExempt);
  const metricPeople = new Map(metricStaff.map(person => [person.id,person]));
  const teamBranchIds = new Set(metricStaff.map(person => person.branchId).filter(Boolean));
  const teamBranches = workspace.locations.filter(site => signedIntoCompany ||
    (branchManager ? managesBranch(branchManager, site.id) : teamBranchIds.has(site.id) || managesBranch(employee, site.id)))
    .map(({id,name}) => ({id,name}));
  const arrivals = new Set();
  const teamPunches = [];
  const teamPeriods = new Map();
  const scheduledShift = range => ({
    periodName: range?.period.name ?? null,
    scheduledStart: range?.period.start && range?.period.end ? range.start : null,
    scheduledEnd: range?.period.start && range?.period.end ? range.end : null,
  });
  for (const person of metricStaff) {
    const metadata = {staffId:person.id,name:person.name,nameAr:person.nameAr,nameEn:person.nameEn,jobTitle:person.jobTitle ?? '',
      self:person.id === employee?.id,branchId:person.branchId ?? null,administrator:isAdministrator(person,workspace)};
    const ranges = effectiveRanges(workspace,person,today);
    const windows = employeePunchWindows(workspace,person,today).filter(window => ranges.some(range => range.start === window.start));
    teamPeriods.set(person.id,{metadata,ranges,windows,entries:new Map()});
  }
  for (const punch of workspace.punches) {
    const person = metricPeople.get(punch.staffId);
    if (!person || !['in','out'].includes(punch.kind)) continue;
    const day = punch.shiftStart == null ? punch.date : new Date(punch.shiftStart + 10800000).toISOString().slice(0,10);
    if (day !== today) continue;
    if (punch.kind === 'in') arrivals.add(punch.staffId);
    const {metadata,ranges,windows,entries} = teamPeriods.get(person.id);
    let shiftStart = punch.shiftStart;
    if (shiftStart == null) {
      const time = Date.parse(punch.time);
      const matching = windows.filter(window => punch.kind === 'in' ?
        time >= window.arrivalStart && time <= window.arrivalEnd : time >= window.departureStart && time <= window.departureEnd);
      if (matching.length === 1) shiftStart = matching[0].start;
    }
    const range = ranges.find(shift => shift.start === shiftStart);
    const row = {...metadata,shiftStart:shiftStart ?? null,...scheduledShift(range),kind:punch.kind,time:punch.time};
    if (!entries.has(row.shiftStart)) entries.set(row.shiftStart,[]);
    entries.get(row.shiftStart).push(row);
    teamPunches.push(row);
  }
  const absentShifts = [];
  const approvedLeaveStaff = new Set(workspace.requests.filter(request => request.status === 'Approved' &&
    workspace.leaveTypes.includes(request.type) && request.date <= today && (request.end ?? request.date) >= today).map(request => request.staffId));
  for (const {metadata,ranges,windows,entries} of teamPeriods.values()) {
    for (const [start,rows] of entries) {
      rows.sort((a,b) => Date.parse(a.time) - Date.parse(b.time));
      const window = windows.find(item => item.start === start);
      const period = ranges.find(item => item.start === start)?.period;
      const paired = Boolean(window && rows.some(item => item.kind === 'in') && rows.at(-1)?.kind === 'out');
      const sufficient = paired && (!window.flexible || !(period?.duration > 0) || flexibleDayTotals(
        rows.map(row => ({...row,date:today,flexible:true,shiftEnd:window.end})),today,now,window).completedMilliseconds >= period.duration * 60000);
      for (const row of rows) row.shiftStatus = sufficient ? 'complete' : 'incomplete';
    }
    if (approvedLeaveStaff.has(metadata.staffId) || entries.has(null)) continue;
    for (const window of windows) {
      if (!entries.has(window.start) && now > window.arrivalEnd) absentShifts.push({...metadata,shiftStart:window.start,
        ...scheduledShift(ranges.find(range => range.start === window.start)),shiftStatus:'absent'});
    }
  }
  teamPunches.sort((a,b) => Date.parse(b.time) - Date.parse(a.time));
  const presentStaff = metricStaff.filter(person => arrivals.has(person.id)).map(({name,nameAr,nameEn}) => ({name,nameAr,nameEn}));
  return {staff:metricStaff.length,present:arrivals.size,presentStaff,punches:teamPunches,branches:teamBranches,absentShifts};
}
function validateWorkOverlap(workspace, person, overrideDay) {
  function validateDay(schedule, staff, day) {
    const ranges = effectiveRanges(schedule, staff, day);
    const nextDay = effectiveRanges(schedule, staff, shiftDayBy(day, 1));
    for (const range of ranges) {
      demand(![...ranges, ...nextDay].some(other => other !== range &&
        range.start < other.end && other.start < range.end), 'Assigned periods cannot overlap.');
    }
  }
  if (!overrideDay) {
    const baseline = { ...workspace, workAssignments: [], workPeriods: workspace.workPeriods.map(period => ({ ...period, priorDefinitions: undefined })) };
    for (let day = 0; day < 7; day++) validateDay(baseline, { ...person, joinDate: null }, shiftDayBy('2000-01-02', day));
  }
  const dates = overrideDay ? [overrideDay] : [...new Set(workspace.workAssignments
    .filter(entry => entry.staffId === person.id).map(entry => entry.date))];
  for (const day of dates) {
    validateDay(workspace, person, shiftDayBy(day, -1));
    validateDay(workspace, person, day);
  }
}
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const string = (value) => typeof value === 'string' ? value.trim() : '';
function staffPhoneKey(value) {
  const digits = westernDigits(string(value)).replace(/[\s()-]/g, '')
    .replace(/^(?:\+|00)/, '');
  return /^0?5\d{8}$/.test(digits) ? '966' + digits.replace(/^0/, '') : digits;
}
const logoMaxBytes = 5 * 1024 * 1024;
const organizationBodyLimit = Math.ceil(logoMaxBytes / 3) * 4 + 8192;
function organizationProfile(body, previous = {}) {
  const profile = {};
  for (const field of ['name', 'city', 'country', 'region', 'email', 'contactName', 'phone', 'address']) {
    profile[field] = string(body[field]);
    demand(profile[field].length <= 300, 'Organization information is too long.');
  }
  demand(profile.name && profile.name.length <= 120, 'Enter a company name.');
  demand(!profile.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email), 'Enter a valid email.');
  profile.logo = previous.logo ?? '';
  if (body.logo !== undefined) {
    const logo = body.logo;
    demand(typeof logo === 'string' && logo.length <= organizationBodyLimit &&
      (logo === '' || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)),
    'Choose a PNG, JPEG or WebP image up to 5 MB.');
    if (logo) demand(Buffer.byteLength(logo.slice(logo.indexOf(',') + 1), 'base64') <= logoMaxBytes,
      'Choose a PNG, JPEG or WebP image up to 5 MB.');
    profile.logo = logo;
  }
  return profile;
}

function validateAnnualLeaveRequest(workspace, staffId, start, end, excludeId) {
  const person = workspace.staff.find(item => item.id === staffId);
  const requests = workspace.requests.map(item => ({ ...item, status: requestStatus(item) }));
  const balance = person && annualLeaveBalance(person, date(), requests, workspace.leavePreferences);
  if (balance?.available == null) return;
  const required = annualLeaveRequired(requests, staffId, date(), { date: start, end }, excludeId);
  demand(required <= balance.available + 1e-8, 'The request exceeds the available annual leave balance.');
}
function mutate(next, path, body, employeeId = 'demo', reviewer, salaryRestricted = false) {
  switch (path) {
    case '/api/official-holidays': {
      demand(Object.hasOwn(officialHolidays,body.id) && typeof body.enabled==='boolean' &&
        (body.days===null || (Number.isInteger(body.days)&&body.days>=1&&body.days<=365)), 'Choose valid holiday settings.');
      demand(!body.enabled || body.days!==null, 'Set the holiday duration first.');
      if(Object.hasOwn(body,'startOverride')) demand(Number.isInteger(body.year)&&body.year>=2000&&body.year<=2100&&(body.startOverride===null||validDate(body.startOverride)&&body.startOverride.startsWith(String(body.year))), 'Choose a valid holiday date.');
      const previous=holidaySettings(next,body.scopeBranchId)[body.id];
      const settings={...previous,enabled:body.enabled,days:body.days};
      if(Object.hasOwn(body,'startOverride')){settings.startOverrides={...previous.startOverrides};if(body.startOverride===null)delete settings.startOverrides[body.year];else settings.startOverrides[body.year]=body.startOverride;}

      if(body.scopeBranchId) next.branchOfficialHolidaySettings={...next.branchOfficialHolidaySettings,[body.scopeBranchId]:{...next.branchOfficialHolidaySettings?.[body.scopeBranchId],[body.id]:settings}};
      else next.officialHolidaySettings={...next.officialHolidaySettings,[body.id]:settings};
      break;
    }
    case '/api/attendance-report-settings': {
      demand(body.enabled===undefined||typeof body.enabled==='boolean','Choose a valid report setting.');
      const previous=next.branchAttendanceReportSettings?.[body.scopeBranchId]??next.attendanceReportSettings;
      const frequency=body.frequency??previous?.frequency??'monthly';
      demand(['monthly','both'].includes(frequency),'Choose a valid report frequency.');
      const enabled=body.enabled??previous?.enabled??true;
      const settings={frequency,enabled,startsOn:previous?.enabled?previous.startsOn??date():date()};
      if(body.scopeBranchId)next.branchAttendanceReportSettings={...next.branchAttendanceReportSettings,[body.scopeBranchId]:settings};
      else next.attendanceReportSettings=settings;
      break;
    }
    case '/api/follow-up-mail-settings': {
      const {enabled,reassignments,scopeBranchId}=body;
      demand((typeof enabled==='boolean'||typeof reassignments==='boolean')&&
        (enabled===undefined||typeof enabled==='boolean')&&(reassignments===undefined||typeof reassignments==='boolean'),'Choose a valid follow-up mail setting.');
      const settings={...followUpMailSettings(next,scopeBranchId),...(enabled===undefined?{}:{enabled}),...(reassignments===undefined?{}:{reassignments})};
      if(scopeBranchId)next.branchFollowUpMailSettings={...next.branchFollowUpMailSettings,[scopeBranchId]:settings};
      else next.followUpMailSettings=settings;
      break;
    }
    case '/api/request-preferences': {
      demand(employeeRequestTypes(next).includes(body.type) && (typeof body.enabled === 'boolean' || Array.isArray(body.contractTypes) || Object.hasOwn(body,'correctionMonthlyLimit')),'Choose a valid request type.');
      if(Object.hasOwn(body,'contractTypes')) {
        demand(Array.isArray(body.contractTypes)&&body.contractTypes.every(value=>['Annual','Tamheer'].includes(value)), 'Choose valid contract types.');
        const values=[...new Set(body.contractTypes)];
        if(body.scopeBranchId) next.branchRequestContracts={...next.branchRequestContracts,[body.scopeBranchId]:{...next.branchRequestContracts?.[body.scopeBranchId],[body.type]:values}};
        else next.requestContracts={...next.requestContracts,[body.type]:values};
      }
      if(Object.hasOwn(body,'correctionMonthlyLimit')){
        const limit=body.correctionMonthlyLimit;
        demand(body.type==='Missed punch'&&(limit===null||Number.isSafeInteger(limit)&&limit>=0),
          'Enter a valid monthly correction limit.');
        if(body.scopeBranchId)next.branchCorrectionMonthlyLimits={...next.branchCorrectionMonthlyLimits,[body.scopeBranchId]:limit};
        else next.correctionMonthlyLimit=limit;
      }
      if(typeof body.enabled!=='boolean')break;
      if(body.scopeBranchId) next.branchRequestPreferences={...next.branchRequestPreferences,[body.scopeBranchId]:{...next.branchRequestPreferences?.[body.scopeBranchId],[body.type]:body.enabled}};
      else next.requestPreferences={...next.requestPreferences,[body.type]:body.enabled};
      break;
    }
    case '/api/setup-guide': {
      demand(Number.isInteger(body.step) && body.step >= 0 && body.step <= 21, 'Invalid setup step.');
      next.setupGuide = { ...(body.step === 0 ? {} : next.setupGuide), step: body.step, ...(body.branchId ? { branchId: body.branchId } : {}) };
      break;
    }
    case '/api/encouragement-settings': {
      const previous = body.scopeBranchId ? next.branchEncouragementSettings?.[body.scopeBranchId] : next.encouragementSettings;
      const settings = { ...previous };
      if (Object.hasOwn(body, 'enabled')) {
        demand(typeof body.enabled === 'boolean', 'Choose a valid notification preference.');
        settings.enabled = body.enabled;
      }
      if (Object.hasOwn(body, 'phrases')) settings.phrases = validateEncouragementPhrases(body.phrases);
      if (body.scopeBranchId) next.branchEncouragementSettings = { ...next.branchEncouragementSettings, [body.scopeBranchId]: settings };
      else next.encouragementSettings = settings;
      break;
    }
    case '/api/notification-preferences': {
      const { key, enabled } = body;
      demand(['attendance', 'documents'].includes(key) && typeof enabled === 'boolean', 'Choose a valid notification preference.');
      if(body.scopeBranchId) next.branchNotificationPreferences={...next.branchNotificationPreferences,
        [body.scopeBranchId]:{...next.branchNotificationPreferences?.[body.scopeBranchId],[key]:enabled}};
      else next.notificationPreferences = { ...next.notificationPreferences, [key]: enabled };
      break;
    }
    case '/api/notification-settings': {
      const { key, rules, recipients } = body;
      const settings = { ...(body.scopeBranchId ? next.branchNotificationSettings?.[body.scopeBranchId] : next.notificationSettings) };
      if (key === 'display') {
        const display = validateNotificationDisplay(body.display);
        if (body.scopeUserId) next.notificationDisplayByUser = { ...next.notificationDisplayByUser, [body.scopeUserId]: display };
        else settings.display = display;
      } else if (key === 'attendance') {
        const names = ['beforeStart', 'beforeDeduction', 'beforeEnd', 'afterEnd'];
        demand(rules && names.every(name => typeof rules[name]?.enabled === 'boolean' &&
          Number.isInteger(rules[name].minutes) && rules[name].minutes >= 0 && rules[name].minutes <= 1440),
        'Choose reminder times from 0 to 1440 minutes.');
        settings.attendance = Object.fromEntries(names.map(name => [name,
          { enabled: rules[name].enabled, minutes: rules[name].minutes }]));
      } else {
        const eligible = new Set(['account-owner',...next.staff.filter(person => person.status === 'Active'&&isAdministrator(person,next)).map(person => person.id)]);
        demand(key === 'documents' && (recipients === null ||
          (Array.isArray(recipients) && recipients.every(id => eligible.has(id)))), 'Choose valid notification recipients.');
        demand(body.documentAlertMode===undefined||['normal','prominent'].includes(body.documentAlertMode),'Choose a valid document alert style.');
        settings.documentRecipients = recipients === null ? null : [...new Set(recipients)];
        settings.documentAlertMode=body.documentAlertMode??settings.documentAlertMode??'normal';
        demand(body.documentReminderDays===undefined||(Number.isInteger(body.documentReminderDays)&&body.documentReminderDays>=0&&body.documentReminderDays<=365),'Choose a reminder lead time from 0 to 365 days.');
        if(body.documentReminderDays!==undefined)settings.documentReminderDays=body.documentReminderDays;
        const second=body.documentSecondReminderDays;
        const effective={...effectiveNotificationSettings(next,body.scopeBranchId),...settings};
        demand(second===undefined||second===null||(Number.isInteger(second)&&second>=0&&second<documentReminderDays(effective)), 'The second reminder must be closer to expiry than the first.');
        demand(body.documentSecondAlertMode===undefined||['normal','prominent'].includes(body.documentSecondAlertMode),'Choose a valid document alert style.');
        if(second!==undefined)settings.documentSecondReminderDays=second;
        if(body.documentSecondAlertMode!==undefined)settings.documentSecondAlertMode=body.documentSecondAlertMode;
      }
      if(body.scopeBranchId) next.branchNotificationSettings={...next.branchNotificationSettings,[body.scopeBranchId]:settings};
      else next.notificationSettings = settings;
      break;
    }
    case '/api/staff/assign-direct-manager': {
      const { staffIds, managerId } = body;
      demand(Array.isArray(staffIds) && staffIds.length > 0 && staffIds.length <= next.staff.length &&
        new Set(staffIds).size === staffIds.length, 'Select employees to assign.');
      const staff = new Map(next.staff.map(person => [person.id, person]));
      const manager = staff.get(managerId);
      const selected = staffIds.map(id => staff.get(id));
      demand(selected.every(person => needsDirectManager(next, person)), 'The employee list changed. Reload and try again.');
      demand(selected.every(person => eligibleDirectManager(next, manager, person.branchId, person.id)),
        'Choose a direct manager eligible for all selected employees.');
      for (const person of selected) person.managerId = managerId;
      break;
    }
    case '/api/documents': {
      const { name, mime, data, expiresOn, suggestedExpiresOn = '', suggestedHijri = '' } = body;
      const title = documentDisplayName(string(name));
      demand(title && title.length <= 180 && !/[\u0000-\u001f]/.test(title) &&
        ['application/pdf', 'image/png', 'image/jpeg'].includes(mime) &&
        typeof data === 'string' && data.length <= documentBase64Limit &&
        data.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(data) &&
        (expiresOn === '' || validDate(expiresOn)) && (suggestedExpiresOn === '' || validDate(suggestedExpiresOn)) && (suggestedHijri === '' || (typeof suggestedHijri==='string' && /^1[34]\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|30)$/.test(suggestedHijri))), 'Choose a PDF, PNG or JPEG up to 10 MB and a valid expiry date.');
      const file = Buffer.from(data, 'base64');
      const signature = { 'application/pdf': '255044462d', 'image/png': '89504e470d0a1a0a', 'image/jpeg': 'ffd8ff' }[mime];
      demand(file.length <= documentMaxBytes && file.subarray(0, signature.length / 2).toString('hex') === signature,
        'Choose a PDF, PNG or JPEG up to 10 MB and a valid expiry date.');
      next.documents ??= [];
      const existing = body.replaceId ? next.documents.find(item=>item.id===body.replaceId) : null;
      demand(!body.replaceId || existing, 'Document not found.');
      const branchId = body.branchId;
      demand(branchId === undefined || branchId === '' || branchId === existing?.branchId ||
        next.locations.some(branch => branch.id === branchId), 'Choose an available branch.');
      const fields = {name:title,mime,data,expiresOn,suggestedExpiresOn,suggestedHijri,
        ...(branchId === undefined ? {} : {branchId:branchId || null})};
      if(existing) {
        Object.assign(existing,fields,{updatedAt:new Date().toISOString()});
        delete existing.expiryConfirmedAt;
      }
      else next.documents.unshift({id:randomUUID(),...fields});
      break;
    }
    case '/api/documents/rename': {
      const document = next.documents?.find(item => item.id === body.id);
      demand(document, 'Document not found.');
      const name = documentDisplayName(string(body.name));
      demand(name && name.length <= 180 && !/[\u0000-\u001f]/.test(name), 'Enter a valid document name.');
      demand(document.name === body.expectedName, 'The document name changed. Reopen it and try again.');
      if (body.expiresOn !== undefined) {
        demand(body.expiresOn === '' || validDate(body.expiresOn), 'Choose a valid expiry date.');
        demand((document.expiresOn || '') === body.expectedExpiresOn, 'The document changed. Reopen it and try again.');
        document.expiresOn = body.expiresOn;
        document.expiryConfirmedAt = new Date().toISOString();
      }
      if (body.branchId !== undefined) {
        demand(document.branchId === body.branchId || body.branchId === '' ||
          next.locations.some(branch => branch.id === body.branchId), 'Choose an available branch.');
        demand((document.branchId || '') === body.expectedBranchId, 'The document changed. Reopen it and try again.');
        document.branchId = body.branchId || null;
      }
      document.name = name;
      break;
    }
    case '/api/documents/remove': {
      demand(next.documents?.some(item=>item.id===body.id),'Document not found.');
      next.documents=next.documents.filter(item=>item.id!==body.id);
      break;
    }
    case '/api/documents/expiry': {
      const document = next.documents?.find(item => item.id === body.id);
      demand(document && (body.expiresOn === '' || validDate(body.expiresOn)), 'Choose a valid expiry date.');
      if (body.expectedExpiresOn !== undefined) demand((document.expiresOn || '') === body.expectedExpiresOn &&
        !document.expiryConfirmedAt && document.suggestedExpiresOn === body.expectedSuggestedExpiresOn,
        'The document changed. Reopen it and try again.');
      document.expiresOn = body.expiresOn;
      document.expiryConfirmedAt=new Date().toISOString();
      break;
    }
    case '/api/issued-reports': {
      const { type = 'attendance-follow-up', format, language, start, end, rows } = body;
      const titles = {
        'attendance-follow-up': ['تقرير متابعة الحضور والانصراف', 'Attendance follow-up report'],
        'attendance-summary': ['تقرير الحضور والانصراف', 'Attendance and clock-out report'],
        'attendance-performance': ['لوحة أداء الحضور والانصراف', 'Attendance performance dashboard'],
        'attendance-records': ['تقرير سجلات الحضور والغياب', 'Attendance and absence records'],
      };
      demand(Object.hasOwn(titles, type) && ['xlsx', 'pdf'].includes(format) && ['ar', 'en'].includes(language) &&
        validDate(start) && validDate(end) && start <= end && Array.isArray(rows) && rows.length > 1 &&
        Array.isArray(rows[0]) && rows[0].length >= 3 && rows[0].length <= 368 &&
        rows.every(row => Array.isArray(row) && row.length === rows[0].length &&
          row.every(cell => typeof cell === 'string' && cell.length <= 250)), 'Invalid report data.');
      const title = titles[type][language === 'ar' ? 0 : 1];
      next.issuedReports ??= [];
      next.issuedReports.unshift({ id: randomUUID(), createdAt: new Date().toISOString(),
        type, title, format, language, start, end, rows });
      break;
    }
    case '/api/job-titles/assign': {
      const { jobTitle, staffIds } = body;
      demand(next.jobTitles.includes(jobTitle) && Array.isArray(staffIds), 'Choose a valid job title and employees.');
      const staff = next.staff.filter(person => person.status !== 'Removed');
      const eligible = new Set(staff.map(person => person.id));
      demand(staffIds.every(id => eligible.has(id)), 'Choose a valid job title and employees.');
      const selected = new Set(staffIds);
      for (const person of staff) {
        if (selected.has(person.id)) person.jobTitle = jobTitle;
        else if (person.jobTitle === jobTitle) person.jobTitle = null;
      }
      break;
    }
    case '/api/staff/roles/create': {
      const name = string(body.name).normalize('NFC');
      demand(name && name.length <= 120, 'Enter a role name of up to 120 characters.');
      demand(!next.staffRoles.some(role => role.toLowerCase() === name.toLowerCase()), 'This role already exists.');
      demand(body.administrator===undefined||typeof body.administrator==='boolean','Choose valid role permissions.');
      demand(body.createJobTitle===undefined||typeof body.createJobTitle==='boolean','Choose valid role permissions.');
      next.staffRoles.push(name);
      if(body.createJobTitle&&!next.jobTitles.some(title=>title.toLowerCase()===name.toLowerCase()))next.jobTitles.push(name);
      updateRolePermissions(next,{role:name,expectedVersion:0,administrator:body.administrator??false,values:permissionsFor({},name)});
      break;
    }
    case '/api/job-titles/remove': {
      demand(next.jobTitles.includes(body.name), 'Job title not found.');
      next.jobTitles = next.jobTitles.filter(name => name !== body.name);
      for (const person of next.staff) {
        if (person.jobTitle === body.name) person.jobTitle = null;
      }
      break;
    }
    case '/api/staff/roles/remove': {
      const { role } = body;
      demand(next.staffRoles.includes(role), 'Role not found.');
      next.staffRoles = next.staffRoles.filter(name => name !== role);
      if(next.rolePermissions)delete next.rolePermissions[role];
      const removedManagers = new Set(next.staff.filter(person => role === 'Manager' && person.role === role).map(person => person.id));
      for (const person of next.staff) {
        if (person.role === role) person.role = null;
        if (removedManagers.has(person.managerId)) person.managerId = null;
      }
      break;
    }
    case '/api/job-titles': {
      const name = string(body.name).normalize('NFC');
      demand(name && name.length <= 120, 'Enter a job title of up to 120 characters.');
      demand(!next.jobTitles.some(title => title.toLowerCase() === name.toLowerCase()), 'This job title already exists.');
      next.jobTitles.push(name);
      break;
    }
    case '/api/work-periods/branch': {
      const period=next.workPeriods.find(p=>p.id===body.id);
      demand(period && next.locations.some(branch=>branch.id===body.branchId) && typeof body.enabled==='boolean', 'Choose valid branches for this period.');
      const scope=period.branchIds ?? next.locations.map(branch=>branch.id);
      period.branchIds=[...new Set(body.enabled ? [...scope,body.branchId] : scope)];
      period.disabledBranchIds=[...new Set((period.disabledBranchIds??[]).filter(id=>id!==body.branchId).concat(body.enabled?[]:[body.branchId]))];
      break;
    }
    case '/api/work-periods': {
      const name = string(body.name);
      const { start, end, flexible, arrival, departure } = body;
      const flexibleDay = body.kind === 'flexible';
      demand(name && name.length <= 80, 'Enter a period name.');
      const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
      demand((typeof start === 'string' && typeof end === 'string' && time.test(start) && time.test(end) && start !== end),
        'Choose different start and end times.');
      const validWindow = (window) => ['before', 'grace', 'after'].every(key =>
        Number.isInteger(window?.[key]) && window[key] >= 0 && window[key] <= 720);
      demand(flexibleDay || ((flexible === undefined || typeof flexible === 'boolean') && validWindow(arrival) && validWindow(departure)), 'Enter valid punch settings.');
      const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
      const windowDuration = (toMinutes(end) - toMinutes(start) + 1440) % 1440;
      const duration = flexibleDay ? body.duration : windowDuration;
      demand(!flexibleDay || (Number.isInteger(duration) && duration > 0 && duration <= windowDuration), 'Choose flexible hours within the period window.');
      const index = next.workPeriods.findIndex(period => period.id === body.id);
      demand(body.id === undefined || index >= 0, 'Period not found.');
      demand(body.applyFrom === undefined || ['retroactive','today','tomorrow'].includes(body.applyFrom), 'Choose when the period change applies.');
      demand(index < 0 || body.applyFrom || !assignedStaffForPeriod(next, body.id, date()).length,
        'Choose when the period change applies.');
      const weekdays=Object.hasOwn(body,'weekdays') ? body.weekdays : (index>=0 ? next.workPeriods[index].weekdays : undefined) ?? [0,1,2,3,4,5,6];
      demand(Array.isArray(weekdays)&&weekdays.length>0&&weekdays.length<=7&&new Set(weekdays).size===weekdays.length&&weekdays.every(day=>Number.isInteger(day)&&day>=0&&day<=6),'Choose at least one valid period weekday.');
      const branchIds=body.branchIds ?? (index>=0 ? next.workPeriods[index].branchIds : next.locations.map(site=>site.id));
      demand(branchIds===undefined || (Array.isArray(branchIds) && branchIds.length>0 && new Set(branchIds).size===branchIds.length && branchIds.every(id=>next.locations.some(site=>site.id===id))), 'Choose valid branches for this period.');
      demand(body.color === undefined || validPeriodColor(body.color), 'Choose a valid period color.');
      const overtime = Object.hasOwn(body,'overtime') ? body.overtime : next.workPeriods[index]?.overtime ?? null;
      demand(overtime === null || (['required','scheduled'].includes(overtime?.mode) &&
        Number.isInteger(overtime.minutes) && overtime.minutes >= 1 && overtime.minutes <= 720), 'Enter valid overtime settings.');
      const period = flexibleDay ? { id: body.id ?? randomUUID(), name, kind: 'flexible', start, end, duration } :
        { id: body.id ?? randomUUID(), name, start, end, duration,
          flexible: flexible ?? next.workPeriods[index]?.flexible ?? false, arrival, departure };
      period.color = body.color ?? (index < 0 ? nextPeriodColor(next.workPeriods) : periodDisplayColor(next.workPeriods[index], index));
      period.weekdays=[...weekdays].sort((a,b)=>a-b);
      if (overtime) period.overtime = { mode: overtime.mode, minutes: overtime.minutes };
      if (branchIds!==undefined) period.branchIds=[...branchIds];
      if (index>=0 && next.workPeriods[index].disabledBranchIds) period.disabledBranchIds=[...next.workPeriods[index].disabledBranchIds];
      if (index >= 0) {
        const previous = next.workPeriods[index];
        const mode = body.applyFrom ?? 'today';
        const effective = mode === 'retroactive' ? null : shiftDayBy(date(), mode === 'tomorrow' ? 1 : 0);
        if (effective) period.priorDefinitions = [
          ...(previous.priorDefinitions ?? []).filter(version => version.until < effective),
          { until: effective, schedule: periodSchedule(periodOnDay(previous, shiftDayBy(effective, -1))) },
        ];
        const people = next.staff.filter(item => item.status !== 'Removed' &&
          (defaultPeriodIds(item).includes(period.id) || next.workAssignments.some(entry => entry.staffId === item.id && entry.periodId === period.id)));
        const byId = new Map(people.map(person => [person.id, person]));
        const punches = next.punches.filter(punch => {
          const person = byId.get(punch.staffId);
          if (!person || punch.shiftStart == null) return false;
          const day = new Date(punch.shiftStart + 10800000).toISOString().slice(0,10);
          return (!effective || day >= effective) && effectivePeriodIds(next, person, day).includes(period.id) &&
            periodBounds(periodOnDay(previous, day), day).start === punch.shiftStart;
        });
        next.workPeriods[index] = period;
        if (previous.priorDefinitions?.length || previous.start !== period.start || previous.end !== period.end || previous.kind !== period.kind || JSON.stringify(previous.weekdays)!==JSON.stringify(period.weekdays)) {
          for (const person of people) {
            validateWorkOverlap(next, person);
            if (effective) validateWorkOverlap(next, person, effective);
          }
        }
        for (const punch of punches) {
          const day = new Date(punch.shiftStart + 10800000).toISOString().slice(0,10);
          const bounds = periodBounds(period, day);
          if (punch.shiftStart === bounds.start && punch.shiftEnd === bounds.end && Boolean(punch.flexible) === isFlexiblePeriod(period)) continue;
          (punch.shiftChanges ??= []).push({ reason: 'period-edit', shiftStart: punch.shiftStart,
            shiftEnd: punch.shiftEnd ?? null, flexible: Boolean(punch.flexible) });
          punch.shiftStart = bounds.start;
          punch.shiftEnd = bounds.end;
          punch.flexible = isFlexiblePeriod(period);
        }
      }
      else next.workPeriods.push(period);
      break;
    }
    case '/api/work-periods/duplicate': {
      const index = next.workPeriods.findIndex(period => period.id === body.id);
      demand(index >= 0, 'Period not found.');
      const source = next.workPeriods[index];
      const suffix = ' نسخة';
      const sourceColor = periodDisplayColor(source, index).toLowerCase();
      const suggestedColor = nextPeriodColor(next.workPeriods);
      const color = suggestedColor === sourceColor ? periodColors.find(item => item !== sourceColor) : suggestedColor;
      const { priorDefinitions, ...definition } = structuredClone(source);
      next.workPeriods.push({ ...definition, ...(body.branchIds ? {branchIds:body.branchIds} : {}), id: randomUUID(), name: source.name.slice(0, 80 - suffix.length).trimEnd() + suffix, color });
      break;
    }
    case '/api/work-periods/remove': {
      const { id } = body;
      demand(next.workPeriods.some(period => period.id === id), 'Period not found.');
      demand(!assignedStaffForPeriod(next, id, date()).length,
        'This period cannot be edited or deleted while employees are assigned to it.');
      next.workPeriods = next.workPeriods.map((period, index) => ({
        ...period, color: periodDisplayColor(period, index),
      })).filter(period => period.id !== id);
      for (const person of next.staff) {
        const ids = defaultPeriodIds(person);
        if (!ids.includes(id)) continue;
        person.periodIds = ids.filter(periodId => periodId !== id);
        person.periodId = person.periodIds[0] ?? '';
      }
      const assignmentKey = entry => JSON.stringify([entry.staffId, entry.date]);
      const remainingDates = new Set(next.workAssignments.filter(entry => entry.periodId !== id).map(assignmentKey));
      next.workAssignments = next.workAssignments.flatMap(entry => {
        if (entry.periodId !== id) return [entry];
        if (remainingDates.has(assignmentKey(entry))) return [];
        return [{ ...entry, periodId: null, restDay: false }];
      });
      break;
    }
    case '/api/work-assignments': {
      if (body.batch !== undefined) {
        demand(Array.isArray(body.batch) && body.batch.length > 0 && body.batch.length <= 3500 && body.batch.every(item => item && !Object.hasOwn(item,'batch')), 'Choose up to 500 employees for one week.');
        demand(new Set(body.batch.map(item=>JSON.stringify([item.staffId,item.date]))).size === body.batch.length, 'Choose unique employee dates.');
        for (const item of body.batch) mutate(next, path, item, employeeId, reviewer);
        break;
      }
      const { staffId, date, periodId } = body;
      const person = next.staff.find(item => item.id === staffId && ['Active', 'Pending activation'].includes(item.status));
      demand(validDate(date) && person, 'Choose an employee and a valid date.');
      const sameDay = entry => entry.staffId === staffId && entry.date === date;
      const removesManualPeriod = typeof body.removePeriodId === 'string' &&
        next.workAssignments.some(entry => sameDay(entry) && entry.periodId === body.removePeriodId);
      if (body.useDefault === true || removesManualPeriod) {
        next.workAssignments = next.workAssignments.filter(entry =>
          !sameDay(entry) || (body.useDefault !== true && entry.periodId !== body.removePeriodId));
        validateWorkOverlap(next, person, date);
        break;
      }
      const ids = body.restDay === true ? [] : typeof body.removePeriodId === 'string' ? effectivePeriodIds(next, person, date).filter(id => id !== body.removePeriodId) :
        body.periodIds ?? (periodId === '' ? [] : [periodId]);
      const available = new Set(next.workPeriods.filter(period=>periodAvailableFor(period,person)).map(period => period.id));
      demand(Array.isArray(ids) && ids.every(id => available.has(id)), 'Choose an available period.');
      const activeIds=day=>ids.filter(id=>periodActiveOn(periodOnDay(next.workPeriods.find(period=>period.id===id), day),day));
      demand(!ids.length||activeIds(date).length===ids.length,'This period is not active on the selected weekday.');
      const repeat = body.restDay === true ? 1 : body.repeat ?? 1;
      demand(Number.isInteger(repeat) && repeat >= 1 && repeat <= 366, 'Enter between 1 and 366 working days.');
      demand(repeat === 1 || next.workSchedule.days.some(day => !isDefaultRestDay(next, person, day)&&(!ids.length||ids.some(id=>{const p=next.workPeriods.find(p=>p.id===id);return !Array.isArray(p.weekdays)||p.weekdays.includes(day);}))), 'Set working days and hours.');
      const dates = new Set([date]);
      for (let day = shiftDayBy(date, 1); dates.size < repeat; day = shiftDayBy(day, 1)) {
        demand(validDate(day), 'Choose an employee and a valid date.');
        demand(Date.parse(day)-Date.parse(date)<366*7*dayMilliseconds,'Choose available working days for this period.');
        if (!isDefaultRestDay(next, person, scheduleWeekday(day))&&(!ids.length||activeIds(day).length)) dates.add(day);
      }
      next.workAssignments = next.workAssignments.filter(entry => entry.staffId !== staffId || !dates.has(entry.date));
      for (const day of dates) {
        const selected = ids.length ? [...new Set(activeIds(day))] : [null];
        next.workAssignments.push(...selected.map(periodId => ({
          staffId, date: day, periodId,
          ...(periodId === null && body.restDay === false ? { restDay: false } : {}),
        })));
      }
      for (const day of dates) validateWorkOverlap(next, person, day);
      break;
    }
    case '/api/work-schedule': {
      const { days, start, end } = body;
      const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
      demand(Array.isArray(days) && days.length && days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) &&
        typeof start === 'string' && typeof end === 'string' && time.test(start) && time.test(end) && start < end,
      'Choose working days and an end time after the start time.');
      const recurringRestDays = (next.workSchedule.recurringRestDays ?? []).filter(day => !days.includes(day));
      next.workSchedule = { days: [...new Set(days)].sort(), start, end, recurringRestDays };
      for (const person of next.staff.filter(item => item.status !== 'Removed')) {
        validateWorkOverlap(next, person);
      }
      break;
    }
    case '/api/leave-types': {
      const name = string(body.name);
      demand(name && name.length <= 60 && !legacySickLeave(name) && ![...next.leaveTypes, ...attendanceTypes].some(type => type.toLowerCase() === name.toLowerCase()),
        'Enter a new leave type name.');
      next.leaveTypes.push(name);
      const maxDays = body.maxDays === '' || body.maxDays == null ? null : Number(body.maxDays);
      demand(maxDays === null || (Number.isSafeInteger(maxDays) && maxDays >= 0), 'Enter a valid maximum number of days.');
      Object.defineProperty(next.leaveSettings, name, { value: { maxDays, active: true }, enumerable: true, writable: true });
      break;
    }
    case '/api/leave-types/status': {
      const { name, active } = body;
      demand(next.leaveTypes.includes(name) && typeof active === 'boolean', 'Choose a valid leave type.');
      next.leaveSettings[name].active = active;
      break;
    }
    case '/api/leave-preferences': {
      demand(['full', 'accrued'].includes(body.availability) && ['reset', 'all', 'partial'].includes(body.remaining) &&
        Number.isFinite(body.carryoverDays) && body.carryoverDays >= 0 && body.carryoverDays <= 99999, 'Choose valid leave settings.');
      next.leavePreferences = { availability: body.availability, remaining: body.remaining, carryoverDays: body.carryoverDays };
      break;
    }
    case '/api/time-format': {
      demand(body.format === '12' || body.format === '24', 'Choose a valid time format.');
      next.timeFormat = body.format;
      break;
    }
    case '/api/organization': {
      next.organization = organizationProfile(body, next.organization);
      next.company = next.organization.name;
      break;
    }
    case '/api/organization/name': {
      const name=string(body.name);
      demand(name&&name.length<=120,'Enter a company name.');
      demand(body.expectedName===next.company,'Company name changed. Reload and try again.');
      next.company=name;next.organization={...next.organization,name};
      break;
    }
    case '/api/organization/branch': {
      updateBranchAdministrators(next,body,reviewer?.id??'account-owner');
      break;
    }
    case '/api/settings': {
      const company = string(body.company), slug = string(body.slug).toLowerCase();
      demand(company && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug), 'Enter a company and valid subdomain.');
      Object.assign(next, { company, slug });
      break;
    }
    case '/api/attendance-methods': {
      const person = next.staff.find(item => item.id === body.staffId && item.status !== 'Removed');
      demand(person && ['company', 'anywhere'].includes(body.method) && typeof body.enabled === 'boolean',
        'Choose valid employees for this location.');
      if (body.branchId !== undefined || body.locationId !== undefined) {
        const branch = next.locations.find(site => site.id === body.branchId);
        const location = branch && (body.locationId === branch.id ? branch :
          branch.additionalLocations?.find(site => site.id === body.locationId));
        demand(body.method === 'company' && location && person.branchId === branch.id &&
          coordinate(location.latitude, 90) && coordinate(location.longitude, 180), 'Choose valid employees for this location.');
        location.attendanceStaffOverrides = { ...location.attendanceStaffOverrides, [person.id]: body.enabled };
        if (!body.enabled) break;
      }
      person.attendanceMethods = { ...person.attendanceMethods, [body.method]: body.enabled };
      break;
    }
    case '/api/locations/anywhere': {
      demand(typeof body.enabled === 'boolean', 'Choose a valid status.');
      next.punchFromAnywhere = body.enabled;
      break;
    }
    case '/api/locations/branch': {
      const name = string(body.name);
      demand(name && name.length <= 120, 'Enter a workplace name.');
      const site = next.locations.find(item => item.id === body.id);
      demand(body.id === undefined || site, 'Workplace location not found.');
      if (site) site.name = name;
      else next.locations.push({ id: randomUUID(), name });
      break;
    }
    case '/api/locations': {
      const { latitude, longitude, radius, staffIds } = body;
      const site = body.id === undefined ? null : next.locations.find(item => item.id === body.id);
      demand(body.id === undefined || site, 'Workplace location not found.');
      const additional = body.addAdditional === true || body.additionalId !== undefined;
      demand(!additional || site, 'Workplace location not found.');
      const extra = additional && body.additionalId !== undefined
        ? site.additionalLocations?.find(item => item.id === body.additionalId) : null;
      demand(body.additionalId === undefined || extra, 'Workplace location not found.');
      const name = body.name === undefined ? (additional ? extra?.name : site?.name) : string(body.name);
      demand(name && name.length <= 120, 'Enter a workplace name.');
      demand(coordinate(latitude, 90) && coordinate(longitude, 180) && Number.isInteger(radius) && radius >= 10 && radius <= 5000, 'Enter valid coordinates and a radius between 10 and 5,000 metres.');
      const staff = new Set(next.staff.filter(person => person.status !== 'Removed').map(person => person.id));
      demand(staffIds === undefined || (Array.isArray(staffIds) && staffIds.every(id => staff.has(id))), 'Choose valid employees for this location.');
      const details = { name, latitude, longitude, radius, staffIds: [...new Set(staffIds ?? site?.staffIds ?? [])] };
      if (extra) Object.assign(extra, { name, latitude, longitude, radius });
      else if (additional) (site.additionalLocations ??= []).push({ id: randomUUID(), name, latitude, longitude, radius });
      else if (site) Object.assign(site, details);
      else next.locations.push({ id: randomUUID(), ...details });
      break;
    }
    case '/api/locations/remove': {
      const index = next.locations.findIndex((site) => site.id === body.id);
      demand(index !== -1, 'Workplace location not found.');
      next.locations.splice(index, 1);
      for (const person of next.staff) {
        if (person.branchId === body.id) person.branchId = null;
      }
      break;
    }
    case '/api/staff/password': {
      const person = next.staff.find(item => item.id === body.staffId && item.status === 'Active');
      demand(person, 'Employee not found.');
      const { password, confirmation } = body;
      demand(typeof password === 'string' && password.length >= 10 && password.length <= 128 &&
        /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[\p{P}\p{S}]/u.test(password),
        'Use 10–128 characters with uppercase, lowercase, a number and a symbol.');
      demand(password === confirmation, 'Passwords do not match.');
      const salt = secret();
      person.account = { ...person.account, salt, passwordHash: scryptSync(password, salt, 64).toString('hex'),
        sessionHash: null, managerSessions: [], managerSessionExpirations: {} };
      for (const key of ['pendingBrowser', 'pendingDevice', 'requestedAt', 'requestedOn','pendingApprovalSteps','pendingApprovalIndex','pendingApprovalHistory', 'activationHash', 'activationExpires'])
        delete person.account[key];
      break;
    }
    case '/api/staff/update':
    case '/api/staff': {
      const editing = path === '/api/staff/update';
      const person = editing ? next.staff.find(item => item.id === body.staffId && item.status !== 'Removed') : null;
      demand(!editing || person, 'Employee not found.');
      if (Object.hasOwn(body,'attendanceExempt')) demand(typeof body.attendanceExempt === 'boolean', 'Choose a valid attendance exemption.');
      if((body.contractType??person?.contractType)==='Tamheer')for(const key of ['salary','allowances','otherAllowances','iban','gosiScheme','gosiBase','gosiSaned'])delete body[key];
      const patch = body;
      if (Object.hasOwn(patch, 'iban')) {
        demand(typeof patch.iban === 'string', 'Enter a valid Saudi IBAN.');
        patch.iban = normalizeIban(patch.iban);
        demand(!patch.iban || validSaudiIban(patch.iban), 'Enter a valid Saudi IBAN.');
      }
      const changed = (...fields) => !person || fields.some(field => Object.hasOwn(patch, field));
      if (Object.hasOwn(patch,'gosiScheme')) demand(['','old','new','none'].includes(patch.gosiScheme), 'Choose valid insurance settings.');
      if (Object.hasOwn(patch,'gosiSaned')) demand(['yes','no'].includes(patch.gosiSaned), 'Choose valid insurance settings.');
      if (Object.hasOwn(patch,'gosiBase')) demand(patch.gosiBase === '' || (typeof patch.gosiBase === 'string' && /^\d{1,5}(?:\.\d{1,2})?$/.test(patch.gosiBase) && Number(patch.gosiBase)<=45000), 'Choose valid insurance settings.');
      const administrator = isAdministrator({role: body.permissionRole ?? person?.role}, next);
      const requiredIdentity = new Set(['nameAr', 'nameEn', 'email', 'phone']);
      const check = (fields, valid, message) => demand(!changed(...fields) || valid ||
        (administrator && fields.every(field => !requiredIdentity.has(field) && (body[field] == null || body[field] === ''))), message);
      if (person) body = { ...person, periodId: person.periodId ?? '', probation: person.probationDays,
        annualLeave: person.annualLeaveDays, salary: person.salary ? String(person.salary.monthlyBase) : '',
        allowances: person.salary ? String(person.salary.monthlyAllowances) : '', ...body };
      if (['old','new'].includes(body.gosiScheme)) demand(body.gosiBase != null && body.gosiBase !== '', 'Choose valid insurance settings.');
      const email = string(body.email).toLowerCase();
      const nameAr = string(body.nameAr), nameEn = string(body.nameEn), phone = string(body.phone);
      const { birthDate, gender, jobTitle, managerId, branchId, joinDate, periodId } = body;
      const { contractTerm, contractMonths, salary } = body;
      const nationality = string(body.nationality), identityNumber = string(body.identityNumber);
      const residencyExpiryDate=nationality==='SA'?'':string(body.residencyExpiryDate);
      check(['nationality','residencyExpiryDate'],nationality==='SA'||body.residencyExpiryDate===undefined||
        (typeof body.residencyExpiryDate==='string'&&(!residencyExpiryDate||validDate(residencyExpiryDate))), 'Enter a valid residence expiry date.');
      const { contractType } = body;
      const isTamheer = contractType === 'Tamheer';
      const probation = isTamheer ? 0 : body.probation;
      const annualLeave = isTamheer ? 0 : body.annualLeave;
      check(['nationality'], nationalityCodes.includes(nationality), 'Enter a nationality and valid identity number.');
      check(['identityNumber'], /^[\p{Nd}]{5,20}$/u.test(identityNumber), 'Enter a nationality and valid identity number.');
      const contractError = 'Choose a contract type, probation period and annual leave allowance.';
      check(['contractType'], contractTypes.includes(contractType), contractError);
      check(['probation'], probationDays.includes(probation), contractError);
      check(administrator ? ['annualLeave'] : ['contractType', 'annualLeave'], annualLeaveDays.includes(annualLeave), contractError);
      const hasCurrentBalance = Object.hasOwn(patch, 'currentLeaveBalance');
      const currentBalance = body.currentLeaveBalance;
      if (hasCurrentBalance && currentBalance !== '') {
        demand((typeof currentBalance === 'string' || typeof currentBalance === 'number') &&
          /^-?\d{1,5}(?:\.\d{1,2})?$/.test(String(currentBalance)) &&
          Number(currentBalance) >= -99999 && Number(currentBalance) <= 99999,
          'Enter a valid current leave balance.');
      }

      check(['nameAr'], nameAr && nameAr.length <= 120, 'Enter both employee names.');
      check(['nameEn'], nameEn && nameEn.length <= 120, 'Enter both employee names.');
      check(['email'], email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email.');
      const digits = phone.replace(/[\s()-]/g, '');
      check(['phone'], /^\+?\p{Nd}{7,15}$/u.test(digits), 'Enter a valid phone number.');
      check(['birthDate'], validDate(birthDate) && birthDate <= date(), 'Enter valid birth and joining dates.');
      check(['joinDate'], validDate(joinDate), 'Enter valid birth and joining dates.');
      check(['birthDate', 'joinDate'], !birthDate || !joinDate || joinDate >= birthDate, 'Enter valid birth and joining dates.');
      check(['gender'], genders.includes(gender), 'Choose a gender and job title.');
      check(['jobTitle'], (next.jobTitles ?? jobTitles).includes(jobTitle), 'Choose a gender and job title.');
      check(['managerId','branchId'], managerId == null || managerId === '' || (managerId !== person?.id &&
        eligibleDirectManager(next,next.staff.find(item=>item.id===managerId),branchId,person?.id)), 'Choose a direct manager.');
      check(['branchId'], branchId == null || branchId === '' || next.locations.some(branch => branch.id === branchId),
        'Choose an available branch.');
      const periodIds = patch.periodIds ?? (Object.hasOwn(patch, 'periodId') || !person
        ? (periodId ? [periodId] : []) : defaultPeriodIds(person));
      check(['periodIds', 'periodId'], Array.isArray(periodIds) &&
        periodIds.every(id => next.workPeriods.some(period => period.id === id && periodAvailableFor(period,{branchId}))), 'Choose an available period.');
      check(['contractTerm', 'contractMonths'], contractTerms.includes(contractTerm) && (contractTerm !== 'Custom' ||
        (Number.isInteger(contractMonths) && contractMonths >= 1 && contractMonths <= 600)), 'Choose a valid contract term.');
      const money = value => typeof value === 'string' && /^\d{1,9}(?:\.\d{1,2})?$/.test(value);
      check(administrator ? ['salary'] : ['salary','contractType'], salaryRestricted || isTamheer || money(salary) && Number(salary) > 0, 'Enter valid salary amounts.');
      check(administrator ? ['allowances'] : ['allowances','contractType'], salaryRestricted || isTamheer || money(body.allowances), 'Enter valid salary amounts.');
      if (Object.hasOwn(patch, 'otherAllowances')) demand(body.otherAllowances === '' || money(body.otherAllowances), 'Enter valid salary amounts.');
      const otherStaff = next.staff.filter(item => item.id !== person?.id && item.status !== 'Removed');
      const duplicateEmail = changed('email') && otherStaff.some(item => string(item.email).toLowerCase() === email);
      const phoneKey = staffPhoneKey(phone);
      const duplicatePhone = changed('phone') && otherStaff.some(item => staffPhoneKey(item.phone) === phoneKey);
      demand(!(duplicateEmail && duplicatePhone), 'That email and phone number are already on the staff list.');
      demand(!duplicateEmail, 'That email is already on the staff list.');
      demand(!duplicatePhone, 'That phone number is already on the staff list.');
      const details = { email, nameAr, nameEn, phone, birthDate, gender, jobTitle, nationality, identityNumber,
        contractType, managerId: managerId || null, branchId: branchId || null, joinDate, contractTerm };
      const managerTitle = isGeneralManager({ jobTitle }) || ['مدير خدمة', 'service manager'].includes(string(jobTitle).toLowerCase());
      const defaultRole = managerTitle && next.staffRoles.includes('Manager') ? 'Manager' : 'Employee';
      const record = person ?? { id: randomUUID(), role: next.staffRoles.includes(defaultRole) ? defaultRole : null,
        status: 'Pending activation', restWeekdays: [5] };
      if (person?.status === 'Pending activation' && changed('email') && email !== person.email && person.account) {
        delete person.account.activationHash;
        delete person.account.activationExpires;
      }
      for (const [key, value] of Object.entries(details)) if (changed(key)) record[key] = value;
      if (Object.hasOwn(patch,'attendanceExempt')) record.attendanceExempt = patch.attendanceExempt;
      if(changed('nationality','residencyExpiryDate'))record.residencyExpiryDate=residencyExpiryDate;
      if (Object.hasOwn(patch, 'iban')) {
        record.iban = patch.iban;
        if (record.bankPayment) record.bankPayment = {...record.bankPayment,account:patch.iban};
      }
      if (Object.hasOwn(patch,'gosiScheme')) record.gosiScheme = patch.gosiScheme;
      if (Object.hasOwn(patch,'gosiSaned')) record.gosiSaned = patch.gosiSaned === 'yes';
      if (Object.hasOwn(patch,'gosiBase')) record.gosiBase = patch.gosiBase === '' ? null : Number(patch.gosiBase);
      if (changed('periodIds', 'periodId')) {
        record.periodIds = [...new Set(periodIds)];
        record.periodId = record.periodIds[0] ?? '';
      }
      if (changed('periodIds', 'periodId', 'joinDate')) validateWorkOverlap(next, record);
      if (changed('nameEn')) record.name = nameEn;
      if (changed('contractTerm', 'contractMonths')) record.contractMonths = contractTerm === 'Custom' ? contractMonths : null;
      if (changed('contractType', 'probation', 'annualLeave')) Object.assign(record, { probationDays: probation, annualLeaveDays: annualLeave });
      if (hasCurrentBalance) {
        if (currentBalance === '') {
          delete record.currentLeaveBalance;
          delete record.currentLeaveBalanceDate;
          delete record.currentLeaveBalanceAt;
        } else if (!person || Number(currentBalance) !== person.currentLeaveBalance) {
          record.currentLeaveBalance = Number(currentBalance);
          record.currentLeaveBalanceDate = date();
          record.currentLeaveBalanceAt = new Date().toISOString();
        }
      }
      if (!salaryRestricted && !isTamheer && changed('salary', 'allowances', 'otherAllowances') && (!administrator || salary || body.allowances || Number(body.otherAllowances) || record.salary)) {
        record.salary = { ...record.salary, currency: record.salary?.currency ?? 'SAR' };
        if (changed('salary')) record.salary.monthlyBase = Number(salary);
        if (changed('allowances')) record.salary.monthlyAllowances = Number(body.allowances);
        if (Object.hasOwn(patch, 'otherAllowances')) {
          const other = Number(body.otherAllowances);
          if (other !== (record.salary.monthlyOtherAllowances ?? 0)) {
            for (const run of next.payrollRuns ?? []) {
              if (run.status !== 'Approved' && run.entries.some(entry => entry.staffId === record.id)) run.version = (run.version ?? 0) + 1;
            }
          }
          record.salary.monthlyOtherAllowances = other;
        }
      }
      if (!person) next.staff.push(record);
      break;
    }
    case '/api/staff/roles': {
      const { role, staffIds } = body;
      if (body.branchAssignments) {
        demand(next.staffRoles.includes(role), 'Choose a valid role and employees.');
        assignBranchRole(next, role, body.branchAssignments);
        break;
      }
      demand(next.staffRoles.includes(role) && Array.isArray(staffIds), 'Choose a valid role and employees.');
      const staff = next.staff.filter(person => person.status !== 'Removed');
      const selected = new Set(staffIds);
      const eligible = new Set(staff.map(person => person.id));
      demand(staffIds.every(id => eligible.has(id)), 'Choose a valid role and employees.');
      for (const person of staff) {
        if (selected.has(person.id)) person.role = role;
        else if (person.role === role && role !== 'Employee') person.role = next.staffRoles.includes('Employee') ? 'Employee' : null;
      }
      break;
    }
    case '/api/staff/remove': {
      const person = next.staff.find(item => item.id === body.staffId && item.status !== 'Removed');
      demand(person, 'Employee not found.');
      const { id, name, nameAr, nameEn, role } = person;
      next.staff[next.staff.indexOf(person)] = { id, name, nameAr, nameEn, role, status: 'Removed' };
      next.workAssignments = next.workAssignments.filter(entry => entry.staffId !== id || entry.date < date());
      for (const member of next.staff) if (member.managerId === id) member.managerId = null;
      break;
    }
    case '/api/punch': {
      const person = next.staff.find(item => item.id === employeeId && item.status === 'Active');
      demand(person, 'Employee not found.');
      const { latitude, longitude, accuracy, kind } = body;
      demand(['in', 'out'].includes(kind), 'Invalid punch type.');
      const now = Date.now();
      const today = date();
      const windows = employeePunchWindows(next, person, today);
      const {openPunch: last, nextPunch} = punchSession(next.punches.filter(entry => entry.staffId === employeeId), windows, now, today);
      const timing = punchTiming(windows, now, nextPunch, openPunchShift(windows, last), last);
      const location = allowsAnywhere(next, person) ? {} : verifyPunchLocation(next, employeeId, latitude, longitude, accuracy);
      const requirePunch = (condition, message, awaitingShiftReview = false) => {
        if (!condition) throw new PunchRejected(message, {
          staffId: employeeId, branchId: person.branchId, kind, date: today, time: new Date(now).toISOString(),
          ...(location.site ? {site: location.site} : {}),
          ...(timing.shiftStart == null ? {} : {shiftStart: timing.shiftStart}),
          ...(timing.shiftEnd == null ? {} : {shiftEnd: timing.shiftEnd}),
          reason: message,
          ...(awaitingShiftReview ? {awaitingShiftReview, device:body.device,
            ...(body.deviceDetails ? {deviceDetails:body.deviceDetails} : {})} : {}),
        });
      };
      requirePunch(!location.error, location.error);
      requirePunch(timing.allowed && (!windows.length || kind === timing.kind), 'Outside the punch time window.', true);
      requirePunch(!timing.cooldown, 'Wait before recording another punch.');
      const unpairedCheckout = kind === 'out' && !last &&
        canRecordUnpairedCheckout(next.punches.filter(entry => entry.staffId === employeeId), windows, now, timing.shiftStart);
      requirePunch(kind === nextPunch || unpairedCheckout, kind === 'out' ? 'You have already clocked out.' : 'You have already clocked in.');
      next.punches.push({ staffId: employeeId, kind, date: date(), time: new Date(now).toISOString(),
        ...(location.site ? { site: location.site } : {}),
        ...(timing.shiftStart == null ? {} : { shiftStart: timing.shiftStart }),
        ...(timing.shiftEnd == null ? {} : { shiftEnd: timing.shiftEnd }),
        ...(timing.flexible ? { flexible: true } : {}),
        device: body.device, ...(body.deviceDetails ? {deviceDetails:body.deviceDetails} : {}) });
      break;
    }
    case '/api/approval-chains': {
      const { type, steps } = body;
      demand(approvalRequestTypes(next).includes(type) && Array.isArray(steps) && steps.length > 0 &&
        new Set(steps).size === steps.length &&
        steps.every(step => step === directApprovalStep || eligibleApprovalRoles(next).includes(approvalRole(step)) || eligibleApprover(next.staff.find(person => person.id === step),next)),
      'Choose distinct approvers with request approval permission.');
      (next.approvalChains ??= {})[type] = steps;
      break;
    }
    case '/api/requests': {
      const applicant=next.staff.find(person=>person.id===employeeId && person.status==='Active');
      demand(applicant, 'Employee not found.');
      const { type, date: start, end } = body;
      const note = string(body.note);
      const leave = next.leaveTypes.includes(type);
      demand(leave || type === 'Leave cancellation' || attendanceTypes.includes(type), 'Choose a request type.');
      demand(employeeRequestEnabled(next,applicant,type),'This request type is disabled.');
      const correction = type === 'Missed punch' && body.correctionReason != null;
      demand(validDate(start) && note.length <= 1000 && (note || type === 'Shift change' || (correction && body.correctionReason !== 'Other')), 'Enter a valid date and a reason.');
      if(type==='Missed punch')demand(!reachedCorrectionMonthlyLimit(next,applicant,start),'You have reached the monthly limit for approved punch corrections.');
      demand(!(leave || type === 'Shift change') || (validDate(end) && end >= start), 'Enter an end date on or after the start date.');
      const maxDays = leave ? next.leaveSettings[type].maxDays : null;
      demand(!(maxDays > 0) || (Date.parse(end) - Date.parse(start)) / 86400000 + 1 <= maxDays,
        'The request exceeds the maximum number of days.');
      if (type === 'Annual leave') validateAnnualLeaveRequest(next, employeeId, start, end);
      if (type === futureAnnualLeave) {
        const person = next.staff.find(item => item.id === employeeId);
        demand(person.annualLeaveDays > 0 && validDate(person.joinDate) && person.joinDate <= date(),
          'The employee must have an annual leave entitlement to borrow from.');
      }
      const details = type === 'Loan request' ? loanRequestTerms(body) : {};
      if (type === 'Shift change') {
        demand((Date.parse(end) - Date.parse(start)) / dayMilliseconds < 366, 'Choose a date range of up to 366 days.');
        const period = periodOnDay(next.workPeriods.find(item => item.id === body.periodId), start);
        demand(period && periodAvailableFor(period,next.staff.find(p=>p.id===employeeId)), 'Choose an available period.');
        const second=body.secondPeriodId ? periodOnDay(next.workPeriods.find(item=>item.id===body.secondPeriodId), start) : null;
        demand(!body.secondPeriodId || (second && periodAvailableFor(second,next.staff.find(p=>p.id===employeeId))), 'Choose an available period.');
        demand(!second || (periodDurationMinutes(period)<480 && period.id!==second.id && !periodsOverlap(period,second)), 'Choose non-overlapping periods.');
        const selected=second?[period,second]:[period];
        let active=false;
        for(let day=start;day<=end;day=shiftDayBy(day,1))if(selected.some(period=>periodActiveOn(period,day))){active=true;break;}
        demand(active,'This period is not active on the selected weekday.');
        Object.assign(details, { periodId: period.id, periodIds:selected.map(p=>p.id), periodName: selected.map(p=>p.name).join(' + ') });
      }
      if (type === 'Leave cancellation') {
        const original = next.requests.find(item => item.id === body.leaveRequestId && item.staffId === employeeId &&
          item.status === 'Approved' && next.leaveTypes.includes(item.type));
        demand(original && start >= date() && start <= (original.end ?? original.date), 'Choose an approved leave and a valid return date.');
        demand(!next.requests.some(item => item.type === 'Leave cancellation' && item.leaveRequestId === original.id &&
          requestStatus(item) === 'Pending'), 'A cancellation request is already pending for this leave.');
        Object.assign(details, { leaveRequestId: original.id, originalDate: original.date, originalEnd: original.end ?? original.date });
      }
      if (correction) {
        demand(correctionReasons.includes(body.correctionReason) && start <= date(), 'Choose a valid date and correction reason.');
        const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        const { proposedIn, proposedOut } = body;
        const validTimes = edit => edit && (edit.proposedIn || edit.proposedOut) &&
          [edit.proposedIn, edit.proposedOut].every(value => value == null || (typeof value === 'string' && time.test(value)));
        const ranges=correctionPeriods(next,applicant,start);
        const recorded = entry => entry?.time ?? null;
        Object.assign(details, {correctionReason:body.correctionReason});
        if(body.periodCorrections != null || ranges.length>1) {
          const edits=body.periodCorrections;
          demand(Array.isArray(edits) && edits.length>0 && edits.length<=2 && edits.every(validTimes) &&
            new Set(edits.map(edit=>edit.periodId)).size===edits.length, 'Choose at least one valid proposed time.');
          details.periodCorrections=edits.map(edit=>{
            const range=ranges.find(item=>item.period.id===edit.periodId && item.start===edit.shiftStart && item.end===edit.shiftEnd);
            demand(range,'The work schedule changed. Submit a new correction request.');
            const logs=periodPunches(next,applicant,range);
            return {periodId:range.period.id,periodName:range.period.name,shiftStart:range.start,shiftEnd:range.end,
              ...(edit.proposedIn ? {proposedIn:edit.proposedIn,originalIn:recorded(logs.find(p=>p.kind==='in'))} : {}),
              ...(edit.proposedOut ? {proposedOut:edit.proposedOut,originalOut:recorded(logs.findLast(p=>p.kind==='out'))} : {})};
          });
          applyPunchCorrection({ ...next, punches:[...next.punches] },applicant,{date:start,...details});
        } else {
          demand(validTimes({proposedIn,proposedOut}), 'Choose at least one valid proposed time.');
          Object.assign(details,{proposedIn,proposedOut});
        }
      }
      if (type === 'Attendance excuse') {
        for (const [field, choices] of [['excuseType', excuseTypes], ['reason', excuseReasons]]) {
          if (body[field] == null) continue;
          demand(choices.includes(body[field]), 'Choose a valid permission type and reason.');
          details[field] = body[field];
        }
      }
      if (body.attachment != null) {
        const { name, data } = body.attachment;
        demand(typeof name === 'string' && name.length <= 180 && !/[\u0000-\u001f/\\]/u.test(name) && /\.(svg|png|jpe?g|pdf|docx?|gif)$/i.test(name) &&
          typeof data === 'string' && data.length <= Math.ceil(attachmentMaxBytes / 3) * 4 && data.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(data) &&
          Buffer.from(data, 'base64').length <= attachmentMaxBytes, 'Choose a supported attachment up to 2 MB.');
        details.attachment = { name, data };
      }
      const skipDirectManager = !reviewer && autoApprovesOwnRequests(next,applicant);
      const approvalSteps = requestApprovalSteps(next, type, employeeId, { skipDirectManager });
      const automatic = skipDirectManager && !approvalSteps;
      if (approvalSteps) Object.assign(details, { approvalSteps, approvalIndex: 0 });
      const submitted = { id: randomUUID(), staffId: employeeId, type, date: start, end: (leave || type === 'Shift change') ? end : start, note,
        status: 'Pending', submittedOn: date(), submittedAt: new Date().toISOString(), ...details,
        ...(reviewer ? { submittedByStaffId: reviewer.id } : {}) };
      next.requests.push(submitted);
      if(automatic){
        mutate(next,'/api/decision',{id:submitted.id,status:'Approved'},employeeId,systemApprovalActor);
        submitted.autoApproved=true;submitted.autoApprovalReason='administrator-without-direct-manager';
        submitted.approvalHistory=[{approverId:'system',status:'Approved',at:submitted.decidedAt}];
      }
      break;
    }
    case '/api/decision': {
      if(reviewer&&reviewer!==systemApprovalActor&&!reviewer.accountOwnerAction)authorizeRoleAction(next,reviewer,'/api/decision',body);
      const request = next.requests.find((item) => item.id === body.id);
      demand(request && requestStatus(request) === 'Pending' && ['Approved', 'Declined'].includes(body.status), 'This request cannot be updated.');
      demand(body.rejectionNote === undefined || (typeof body.rejectionNote === 'string' && body.rejectionNote.length <= 2000),
        'Enter notes up to 2000 characters.');
      if (body.status === 'Approved' && request.type === 'Annual leave') validateAnnualLeaveRequest(next, request.staffId, request.date, request.end, request.id);
      if (request.approvalSteps) {
        demand((reviewer?.accountOwnerAction||eligibleApprover(reviewer,next)) && approvalStepMembers(next,request).includes(reviewer.id),
          'Only the current approver can decide this request.');
        request.approvalHistory ??= [];
        request.approvalHistory.push({ stepIndex:request.approvalIndex, approverId: reviewer.id, status: body.status, at: new Date().toISOString() });
        if (body.status === 'Approved' && request.approvalIndex + 1 < request.approvalSteps.length) {
          request.approvalIndex++;
          request.approvalStepStartedAt = new Date().toISOString();
          break;
        }
      }
      if (body.status === 'Approved' && request.type === 'Missed punch') {
        const person=next.staff.find(item=>item.id===request.staffId && item.status==='Active');
        demand(person,'Employee is not active.');
        demand(!reachedCorrectionMonthlyLimit(next,person,request.date),'You have reached the monthly limit for approved punch corrections.');
        applyPunchCorrection(next,person,request);
      }
      if (body.status === 'Approved' && request.type === 'Leave cancellation') {
        const original = next.requests.find(item => item.id === request.leaveRequestId && item.staffId === request.staffId && item.status === 'Approved');
        demand(original && request.date >= request.submittedOn && request.date <= (original.end ?? original.date),
          'Choose an approved leave and a valid return date.');
        const originalEnd = original.end ?? original.date;
        const cancelledFrom = request.date < original.date ? original.date : request.date;
        request.refundedDays = (Date.parse(originalEnd) - Date.parse(cancelledFrom)) / dayMilliseconds + 1;
        request.originalApprovalAt = original.decidedAt ?? original.submittedAt ?? original.submittedOn ?? original.date;
        request.originalLeaveType = original.type;
        original.originalEnd ??= originalEnd;
        original.cancelledFrom = cancelledFrom;
        original.cancellationRequestId = request.id;
        if (cancelledFrom <= original.date) original.status = 'Cancelled';
        else original.end = new Date(Date.parse(cancelledFrom) - dayMilliseconds).toISOString().slice(0, 10);
      }
      if (body.status === 'Approved' && request.type === 'Shift change') {
        const person = next.staff.find(item => item.id === request.staffId && item.status === 'Active');
        const selectedIds=request.periodIds??[request.periodId];
        const periods=selectedIds.map(id=>next.workPeriods.find(item=>item.id===id));
        demand(person && periods.length>=1 && periods.length<=2 && periods.every(p=>p && periodAvailableFor(p,person)), 'Choose an available period.');
        demand(periods.length===1 || (periodDurationMinutes(periods[0])<480 && periods[0].id!==periods[1].id && !periodsOverlap(periods[0],periods[1])), 'Choose non-overlapping periods.');
        const end = request.end ?? request.date;
        demand(validDate(end) && end >= request.date && (Date.parse(end) - Date.parse(request.date)) / dayMilliseconds < 366,
          'Choose a date range of up to 366 days.');
        const days = [];
        for (let day = request.date; day <= end; day = shiftDayBy(day, 1)) days.push(day);
        const activePeriods = day => periods.map(period => periodOnDay(period, day)).filter(period => periodActiveOn(period, day));
        demand(days.some(day=>activePeriods(day).length),'This period is not active on the selected weekday.');
        for(const day of days){const active=activePeriods(day);if(active.length)reassignShiftPunches(next,person,[day],active,request.id);}
        next.workAssignments = next.workAssignments.filter(item => item.staffId !== person.id || item.date < request.date || item.date > end);
        for (let day = request.date; day <= end; day = shiftDayBy(day, 1)) {
          const active=activePeriods(day);
          next.workAssignments.push(...(active.length?active.map(period=>({staffId:person.id,date:day,periodId:period.id})):[{staffId:person.id,date:day,periodId:null}]));
        }
        for (let day = request.date; day <= end; day = shiftDayBy(day, 1)) validateWorkOverlap(next, person, day);
        const approvedStarts = new Set(days.flatMap(day => effectiveRanges(next, person, day).map(range => range.start)));
        const attempts = (next.rejectedPunchAttempts ?? []).filter(attempt =>
          attempt.staffId === person.id && attempt.awaitingShiftReview && !attempt.shiftChangeRequestId)
          .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
        for (const attempt of attempts) {
          const time = Date.parse(attempt.time);
          if (attempt.date < shiftDayBy(request.date, -1) || attempt.date > shiftDayBy(end, 1)) continue;
          const windows = employeePunchWindows(next, person, attempt.date).filter(shift => approvedStarts.has(shift.start));
          const shift = windows.find(window => {
            const start = attempt.kind === 'in' ? window.arrivalStart : window.departureStart;
            const finish = attempt.kind === 'in' ? window.arrivalEnd : window.departureEnd;
            return time >= start && time <= finish;
          });
          if (!shift) continue;
          const existing = next.punches.filter(punch => punch.staffId === person.id && punch.shiftStart === shift.start);
          const nearest = existing.reduce((latest, punch) => Date.parse(punch.time) <= time &&
            (!latest || Date.parse(punch.time) > Date.parse(latest.time)) ? punch : latest, null);
          if (shift.flexible ? nearest?.kind === attempt.kind : existing.some(punch => punch.kind === attempt.kind)) continue;
          const {staffId, kind, date, site, device, deviceDetails} = attempt;
          next.punches.push({staffId, kind, date, time: attempt.time, site, device, deviceDetails,
            shiftStart: shift.start, shiftEnd: shift.end, flexible: shift.flexible});
          attempt.shiftChangeRequestId = request.id;
        }
      }
      request.status = body.status;
      if (body.status === 'Declined') request.rejectionNote = string(body.rejectionNote);
      if (reviewer) request.decidedBy = reviewer.id;
      request.decidedAt = new Date().toISOString();
      scheduleApprovedLoan(next,request,date());
      break;
    }
    default: throw new Error('Unknown action.');
  }
}

function punchLocations(workspace, employeeId) {
  const person = workspace.staff.find(item => item.id === employeeId);
  if (!allowsCompanyLocation(person)) return [];
  return workspace.locations.flatMap(branch => [branch, ...(branch.additionalLocations ?? [])]
    .filter(site => coordinate(site.latitude, 90) && coordinate(site.longitude, 180) &&
      assignedToPunchLocation(branch, site, person)));
}
function verifyPunchLocation(workspace, employeeId, latitude, longitude, accuracy) {
  const locations = punchLocations(workspace, employeeId);
  if (!locations.length) return {error:'Ask your employer to set a workplace location first.'};
  if (!coordinate(latitude, 90) || !coordinate(longitude, 180) || !Number.isFinite(accuracy) || accuracy < 0)
    return {error:'Your phone did not return a valid location.'};
  const nearby = locations.map(site => ({site, metres: distance(latitude, longitude, site)}))
    .filter(({site, metres}) => metres <= site.radius).sort((a, b) => a.metres - b.metres);
  if (!nearby.length) return {error:'You are outside the approved workplace area.'};
  const match = nearby.find(({site, metres}) => metres + accuracy <= site.radius);
  return match ? {site:match.site.name} : {error:'Location accuracy is too low. Move closer to the workplace centre and try again.'};
}

async function persist(next) {
  assertRuntimeWrite();
  if (storage) {
    await storage.write({ state: next, partners, profile: platformProfile, demoCompanyStatus });
  } else {
    writeFileSync(tempFile, JSON.stringify(next, null, 2));
    renameSync(tempFile, dataFile);
  }
  state = next;
}
const secret = () => randomBytes(32).toString('hex');
const hash = value => digest(value).toString('hex');
const browserKey = req => req.headers.cookie?.match(/(?:^|;\s*)dawamkom_employee=([a-f0-9]{64})(?:;|$)/)?.[1];
const employeeCookie = (value, prefix) => `dawamkom_employee=${value}; Path=${prefix}/; HttpOnly; SameSite=Strict; Max-Age=31536000${host === '127.0.0.1' ? '' : '; Secure'}`;
const employeeSessionKey = req => req.headers.cookie?.match(/(?:^|;\s*)dawamkom_employee_session=([a-f0-9]{64})(?:;|$)/)?.[1];
const signedInSessionAge = 400 * 86400;
const employeeSessionCookie = (value, prefix, age = 0) =>
  `dawamkom_employee_session=${value}; Path=${prefix}/; HttpOnly; SameSite=Strict; Max-Age=${age}${hostedDemo ? '; Secure' : ''}`;
function addManagerSession(account, sessionHash, age, replace) {
  account.managerSessions = [...(account.managerSessions ?? []).filter(key => key !== replace), sessionHash].slice(-20);
  account.managerSessionExpirations = Object.fromEntries(account.managerSessions.flatMap(key => {
    const expires = key === sessionHash ? Date.now() + age * 1000 : account.managerSessionExpirations?.[key];
    return expires ? [[key, expires]] : [];
  }));
}
const isGeneralManager = person => ['مدير عام', 'general manager'].includes(string(person.jobTitle).toLowerCase());
const salaryFields = ['salary', 'allowances', 'otherAllowances', 'gosiBase', 'gosiScheme', 'gosiSaned', 'iban', 'bankPayment'];
const canReviewTeam = (person,workspace) => workspace?hasRolePermission(workspace,person,'requests'):person.role==='Manager'||isGeneralManager(person);
const directDeviceApprover = (workspace, person) => workspace.staff.find(manager =>
  manager.id === person.managerId && manager.id !== person.id && manager.status === 'Active' && canReviewTeam(manager,workspace));
function deviceRequestInbox(workspace, approver, includeAll = false) {
  const permits = id => includeAll || Boolean(approver && id === approver.id);
  const deviceRequests = workspace.staff.flatMap(person => {
    if (person.status !== 'Active' || !person.account?.pendingBrowser ||
      (!includeAll && person.branchId && !managesBranch(approver, person.branchId))) return [];
    const members=browserApprovalMembers(workspace,person);
    if(!includeAll&&!members.includes(approver?.id))return [];
    const manager=workspace.staff.find(p=>p.id===members[0]);
    return [{ staffId: person.id, requestId: person.account.requestedAt, name: person.nameAr || person.name,
      submittedOn: person.account.requestedOn, approverId: manager?.id, approverIds:members, approvalIndex:person.account.pendingApprovalIndex??0, approvalCount:person.account.pendingApprovalSteps?.length??1 }];
  });
  const deviceHistory = (workspace.browserRequestHistory ?? []).filter(item => permits(item.approverId) &&
    (includeAll || workspace.staff.some(person =>
      person.id === item.staffId && managesBranch(approver, person.branchId))));
  return { deviceRequests, deviceHistory };
}
function branchWorkspace(workspace, manager) {
  const canViewSalary = hasRolePermission(workspace,manager,'staffSalary');
  const canViewPayroll = hasRolePermission(workspace,manager,'payrollView');
  const staff = workspace.staff.filter(person => person.id === manager.id ||
    managesBranch(manager, person.branchId)).map(person => {
      if (canViewSalary) return person;
      const visible = {...person};
      for (const field of salaryFields) delete visible[field];
      return visible;
    });
  const ids = new Set(staff.map(person => person.id));
  return { ...workspace, staff, followUpAssigneeChoices:workspace.staff.filter(person=>person.status==='Active'&&hasRolePermission(workspace,person,'tasks')&&roleBranches(person).some(id=>managesBranch(manager,id))).map(person=>({id:person.id,name:person.name,nameAr:person.nameAr,nameEn:person.nameEn,role:person.role,status:person.status,branchId:managesBranch(manager,person.branchId)?person.branchId:null,roleBranchIds:{[person.role]:roleBranches(person).filter(id=>managesBranch(manager,id))}})), directManagerChoices:workspace.staff.filter(person=>person.status==='Active'&&isAdministrator(person,workspace)&&roleBranches(person).some(id=>managesBranch(manager,id))).map(({id,name,nameAr,nameEn,role,roleBranchIds,branchId,status})=>({id,name,nameAr,nameEn,role,status,branchId:managesBranch(manager,branchId)?branchId:null,roleBranchIds:{[role]:roleBranches({role,roleBranchIds,branchId}).filter(id=>managesBranch(manager,id))}})), followUpDocuments:(workspace.documents??[]).filter(d=>documentAlerts(workspace,date(),manager).some(a=>a.id===d.id)||(workspace.followUpAssignments??[]).some(r=>r.snapshot?.kind==='document'&&r.snapshot?.sourceId===d.id&&r.assigneeId===manager.id)).map(({id,name,expiresOn})=>({id,name,expiresOn})), followUpAssignments:(workspace.followUpAssignments??[]).filter(record=>followUpItems(workspace,date(),manager).some(item=>item.id===record.itemId)).map(record=>record.snapshot?.kind==='document'&&record.assigneeId!==manager.id?{...record,comments:[],events:[],history:[]}:record), notificationDisplayByUser: undefined,
    notificationPreferences: effectiveNotificationPreferences(workspace,manager.branchId), branchNotificationPreferences: undefined,
    notificationSettings: { ...effectiveNotificationSettings(workspace,manager.branchId), display: workspace.notificationDisplayByUser?.[manager.id] ?? workspace.notificationSettings?.display },
    branchNotificationSettings: undefined, encouragementSettings: encouragementSettings(workspace, manager.branchId),
    branchEncouragementSettings: undefined, setupGuide: undefined,
    officialHolidaySettings: holidaySettings(workspace,manager.branchId), branchOfficialHolidaySettings: undefined,
    attendanceReportSettings:workspace.branchAttendanceReportSettings?.[manager.branchId]??workspace.attendanceReportSettings,branchAttendanceReportSettings:undefined,
    followUpMailSettings:followUpMailSettings(workspace,manager.branchId),branchFollowUpMailSettings:undefined,
    correctionMonthlyLimit:correctionMonthlyLimit(workspace,manager.branchId), branchCorrectionMonthlyLimits:undefined,
    requestContracts:Object.fromEntries(employeeRequestTypes(workspace).map(type=>[type,requestContractTypes(workspace,type,manager.branchId)])), branchRequestContracts:undefined,
    requestPreferences: effectiveRequestPreferences(workspace,manager.branchId), branchRequestPreferences: undefined,
    loanSchedules: (workspace.loanSchedules??[]).filter(schedule=>ids.has(schedule.staffId)),
    canViewStaffSalary: canViewSalary,
    canViewPayroll,
    payrollRuns: canViewPayroll ? (workspace.payrollRuns ?? []).map(run => ({ ...run, bank: run.banks?.[manager.branchId] ?? run.bank, banks: undefined, entries: run.entries.filter(entry => ids.has(entry.staffId)) })) : [],
    locations: workspace.locations.filter(site => managesBranch(manager, site.id)),
    workPeriods: workspace.workPeriods.filter(period=>!Array.isArray(period.branchIds) || period.branchIds.some(id=>managesBranch(manager,id))),
    requests: workspace.requests.filter(request => ids.has(request.staffId)),
    punches: workspace.punches.filter(punch => ids.has(punch.staffId)),
    workAssignments: workspace.workAssignments.filter(entry => ids.has(entry.staffId)),
    browserRequestHistory: (workspace.browserRequestHistory ?? []).filter(entry => ids.has(entry.staffId)),
    issuedReports: (workspace.issuedReports ?? []).filter(report => canViewPayroll || report.type !== 'payroll').filter(report => report.branchIds?.length
      ? report.branchIds.every(branchId => managesBranch(manager, branchId))
      : managesBranch(manager, report.branchId)),
    documents: hasRolePermission(workspace,manager,'documents') ? workspace.documents??[] : [],
  };
}
function authorizeBranchAction(workspace, manager, path, body) {
  if (path === '/api/payroll') demand(hasRolePermission(workspace,manager,'payrollView'), 'This action is not allowed by your role permissions.');
  if (!hasRolePermission(workspace,manager,'staffSalary')) {
    if (['/api/staff', '/api/staff/update'].includes(path)) demand(!salaryFields.some(field => Object.hasOwn(body,field)),
      'This action is not allowed by your role permissions.');
  }
  if(path==='/api/follow-up/create'){demand(managesBranch(manager,body.branchId),'This action is outside your branch permissions.');return;}
  if(path==='/api/follow-up/delete')return;
  if(path==='/api/follow-up/receive'){authorizeRoleAction(workspace,manager,path,body);return;}
  authorizeRoleAction(workspace,manager,path,body);
  if(path==='/api/staff/assign-direct-manager'){
    const scope=new Set(workspace.staff.filter(person=>managesBranch(manager,person.branchId)).map(person=>person.id));
    demand(Array.isArray(body.staffIds)&&body.staffIds.every(id=>scope.has(id)),'This action is outside your branch permissions.');
    return;
  }
  if(path.startsWith('/api/documents'))return;
  if(path==='/api/approval-chains')return;
  if(path==='/api/follow-up/assign-bulk'){
    const visible=new Set(followUpItems(workspace,date(),manager).map(i=>i.id));
    demand(Array.isArray(body.items)&&body.items.length>0&&body.items.every(i=>i&&visible.has(i.itemId)),'This action is outside your branch permissions.');return;
  }
  if(path==='/api/role-permissions'&&canDistributePermissions(workspace,manager))return;
  if(path==='/api/locations/branch'){demand(managesBranch(manager,body.id),'This action is outside your branch permissions.');return;}
  if(path==='/api/organization/branch'){demand(canDistributePermissions(workspace,manager)&&managesBranch(manager,body.id),'Permission distribution access is required for this branch.');return;}
  if(['/api/follow-up/assign','/api/follow-up/update'].includes(path)){demand(followUpItems(workspace,date(),manager).some(item=>item.id===body.itemId),'This action is outside your branch permissions.');return;}
  const permitted = new Set(branchWorkspace(workspace, manager).staff.map(person => person.id));
  const branchId = body.branchId || manager.branchId || roleBranches(manager)[0];
  const error = 'This action is outside your branch permissions.';
  if (path==='/api/work-periods/branch') {
    const period=workspace.workPeriods.find(p=>p.id===body.id);
    demand(managesBranch(manager,body.branchId) && period && (!Array.isArray(period.branchIds) || period.branchIds.some(id=>managesBranch(manager,id))),error);
    return;
  }
  if (['/api/work-periods','/api/work-periods/duplicate','/api/work-periods/remove'].includes(path)) {
    const branches=roleBranches(manager).filter(id=>workspace.locations.some(site=>site.id===id));
    demand(branches.length>0,error);
    const previous=body.id && workspace.workPeriods.find(period=>period.id===body.id);
    if (body.id) demand(previous && (!Array.isArray(previous.branchIds) || previous.branchIds.every(id=>branches.includes(id))),error);
    if (body.branchIds!==undefined) demand(Array.isArray(body.branchIds) && body.branchIds.length>0 && body.branchIds.every(id=>branches.includes(id)),error);
    if (!body.id || path==='/api/work-periods/duplicate') body.branchIds ??= branches;
    return;
  }
  if (path === '/api/notification-settings' && body.key === 'display') return;
  if (path === '/api/notification-preferences') {
    demand(manager.branchId && ['attendance','documents'].includes(body.key),error);
    return;
  }
  if (path === '/api/notification-settings') {
    demand(manager.branchId && ['attendance','documents'].includes(body.key),error);
    if(body.key==='documents' && body.recipients!==null)
      demand(Array.isArray(body.recipients)&&body.recipients.every(id=>eligibleDirectManager(workspace,workspace.staff.find(p=>p.id===id),manager.branchId)),error);
    return;
  }
  const staffActions = ['/api/staff/update', '/api/staff/enrich', '/api/staff/remove', '/api/staff/activation-link', '/api/staff/recovery-link', '/api/staff/password', '/api/leave-balances/adjust',
    '/api/work-assignments', '/api/attendance-methods'];
  if (['/api/payroll','/api/request-preferences','/api/official-holidays','/api/attendance-report-settings','/api/follow-up-mail-settings'].includes(path)) { demand(manager.branchId, error); return; }
  if (path === '/api/encouragement-settings') { demand(manager.branchId, error); return; }
  if (path === '/api/work-assignments' && body.batch !== undefined) {
    demand(Array.isArray(body.batch) && body.batch.length > 0 && body.batch.length <= 3500, error);
    for (const entry of body.batch) { demand(entry && !Object.hasOwn(entry,'batch'),error); authorizeBranchAction(workspace,manager,path,entry); }
    return;
  }
  if (staffActions.includes(path)) {
    demand(permitted.has(body.staffId), error);
    if (Object.hasOwn(body, 'branchId')) demand(managesBranch(manager, body.branchId), error);
    if (body.managerId) demand(eligibleDirectManager(workspace,workspace.staff.find(p=>p.id===body.managerId),body.branchId??workspace.staff.find(p=>p.id===body.staffId)?.branchId,body.staffId),error);
    return;
  }
  if (path === '/api/staff') {
    demand(managesBranch(manager, branchId), error);
    body.branchId = branchId;
    if (body.managerId) demand(eligibleDirectManager(workspace,workspace.staff.find(p=>p.id===body.managerId),branchId),error);
    return;
  }
  if (path === '/api/decision') {
    demand(permitted.has(workspace.requests.find(request => request.id === body.id)?.staffId), error);
    return;
  }
  if (path === '/api/issued-reports') {
    demand(manager.branchId, error);
    return;
  }
  if (path === '/api/locations') {
    demand(managesBranch(manager, body.id), error);
    demand(!body.staffIds || body.staffIds.every(id => permitted.has(id)), error);
    return;
  }
  throw new Error(error);
}
const isDirectReport = (person, manager) => person && person.status === 'Active' &&
  person.id !== manager.id && person.managerId === manager.id;
const canUseMultipleDevices = (workspace,person) => hasRolePermission(workspace,person,'anyBrowser');
function signedInEmployee(workspace, browser, sessionHash) {
  const now = Date.now();
  return workspace.staff.find(person => person.status === 'Active' && person.account && (
    (canUseMultipleDevices(workspace,person) && sessionHash && person.account.managerSessions?.includes(sessionHash) &&
      (person.account.managerSessionExpirations?.[sessionHash] ?? Infinity) > now) ||
    (browser && person.account.browser === browser &&
      (person.account.sessionHash === undefined || (sessionHash && person.account.sessionHash === sessionHash &&
        (person.account.employeeSessionExpires ?? Infinity) > now)))
  ));
}
function deviceLabel(req) {
  const agent = req.headers['user-agent'] ?? '';
  const platform = ['iPhone', 'iPad', 'Android', 'Windows', 'Macintosh', 'Linux'].find(name => agent.includes(name));
  const browser = [['Edg', 'Edge'], ['Firefox', 'Firefox'], ['Chrome', 'Chrome'], ['Safari', 'Safari']]
    .find(([token]) => agent.includes(token))?.[1];
  return [platform, browser].filter(Boolean).join(' · ') || 'Unknown device';
}
function punchDeviceDetails(req) {
  const agent = String(req.headers['user-agent'] ?? '').slice(0,1000);
  const ios = agent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/);
  const android = agent.match(/Android ([\d.]+)/);
  const windows = agent.match(/Windows NT ([\d.]+)/);
  const mac = agent.match(/Mac OS X ([\d_]+)/);
  const model = agent.includes('iPhone') ? 'Apple iPhone' : agent.includes('iPad') ? 'Apple iPad' : deviceLabel(req);
  const os = ios ? 'iOS '+ios[1].replaceAll('_','.') : android ? 'Android '+android[1] :
    windows ? 'Windows NT '+windows[1] : mac ? 'macOS '+mac[1].replaceAll('_','.') : null;
  return {model, ...(os ? {os} : {})};
}
const publicState = workspace => ({
  ...workspace,
  pendingApprovals: undefined,
  approvalQueueFailures: undefined,
  rejectedPunchAttempts: undefined,
  officialHolidayCalendar:holidayCalendarSnapshot(Number(date().slice(0,4))),
  payrollRuns: publicPayrollRuns(workspace.payrollRuns),
  followUpAssignments:publicFollowUpRecords(workspace.followUpAssignments),
  recurringFollowUps:undefined,
  documents: (workspace.documents ?? []).map(({ data, ...document }) => document),
  documentAiProvider,
  issuedReports: (workspace.issuedReports ?? []).map(({ rows, ...report }) => report),
  requests: workspace.requests.map(item=>requestSummary(item,workspace)),
  staff: workspace.staff.map(({ account, leaveBalanceAdjustments, ...person }) => ({
    ...person, approvedDevice: canUseMultipleDevices(workspace,person) ? null : account?.browserDevice ?? null,
    leaveBalanceAdjustments: leaveBalanceAdjustments?.map(({at, days}) => ({at, days})),
    canCopyActivation: person.status === 'Pending activation' && Boolean(account),
    activationLinkExpiresAt: person.status === 'Pending activation' ? account?.activationExpires ?? null : null,
    activationEmailSent: person.status === 'Pending activation' && activationEmailSent(account,person.email),
  })),
  today: date(),
});
const invalidInvitation = 'رابط التفعيل غير صالح أو منتهي.';
function invitedEmployee(workspace, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return;
  const tokenHash = hash(token);
  return workspace.staff.find(person => person.status === 'Pending activation' &&
    person.account?.activationHash === tokenHash && person.account.activationExpires > Date.now());
}

async function deliverInvitation({ email, name, introduction, url }) {
  if (!runtime.delivery) return {delivery: 'manual', url};
  const message = {
    to: email,
    subject: 'مرحبًا بك في دوامكم | تفعيل حسابك',
    html:accountEmail({title:'أهلًا بك في دوامكم',name,text:introduction,url,button:'تفعيل حسابك',note:'الرابط صالح لمدة 48 ساعة.'}),
    text: [
      'مرحبًا ' + name + '،',
      introduction,
      'افتح الرابط التالي لتعيين كلمة المرور وتأكيدها وتفعيل حسابك.',
      url,
      'الرابط صالح لمدة 48 ساعة.',
    ].join('\n\n'),
  };
  const sender = process.env.DAWAMAK_SES_FROM;
  const endpoint = process.env.DAWAMAK_MAIL_WEBHOOK;
  if (sender && process.env.DAWAMAK_PUBLIC_ORIGIN) {
    try {
      const { SESv2Client, SendEmailCommand } = await import('@aws-sdk/client-sesv2');
      const client = new SESv2Client({ region: process.env.DAWAMAK_SES_REGION || 'us-east-1' });
      try {
        await client.send(new SendEmailCommand({
          FromEmailAddress: sender,
          Destination: { ToAddresses: [message.to] },
          Content: { Simple: {
            Subject: { Charset: 'UTF-8', Data: message.subject },
            Body: { Text: { Charset: 'UTF-8', Data: message.text }, Html:{Charset:'UTF-8',Data:message.html} },
          } },
        }), { abortSignal: AbortSignal.timeout(5000) });
        return { delivery: 'sent', url };
      } finally {
        client.destroy();
      }
    } catch (error) {
      console.error('SES invitation failed:', error.name);
      return { delivery: 'manual', url };
    }
  }
  if (endpoint && process.env.DAWAMAK_PUBLIC_ORIGIN) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (process.env.DAWAMAK_MAIL_TOKEN ?? '') },
        body: JSON.stringify(message),
      });
      if (response.ok) return { delivery: 'sent', url };
    } catch { /* Keep the account and provide the link for manual delivery. */ }
  }
  return { delivery: 'manual', url };
}

async function deliverRecoveryMail(job, changed=false) {
  if(!runtime.delivery)return false;
  const label=job.kind==='company'?'مسؤول الحساب':'الموظف';
  const subject=changed?'تم تغيير كلمة مرور حسابك في دوامكم':'إعادة تعيين كلمة المرور | دوامكم';
  const text=changed?'تم تغيير كلمة مرور حساب '+label+' في '+job.company+'. إذا لم تقم بهذا التغيير، تواصل معنا فورًا.':
    'وصلنا طلب لإعادة تعيين كلمة مرور حساب '+label+' في '+job.company+'. استخدم الرابط أدناه لتعيين كلمة مرور جديدة.';
  const note=changed?'سجّل الدخول باستخدام كلمة المرور الجديدة. لا نرسل كلمات المرور عبر البريد.':'الرابط صالح لمدة ساعة واحدة ويُستخدم مرة واحدة فقط. إذا لم تطلب التغيير، تجاهل هذه الرسالة؛ لن تتغير كلمة مرورك.';
  const message={to:job.email,subject,text:[text,changed?'':job.url,note].filter(Boolean).join('\n\n'),html:accountEmail({title:subject,name:job.name,text,url:changed?undefined:job.url,note})};
  try {
    if(process.env.DAWAMAK_SES_FROM){
      const {SESv2Client,SendEmailCommand}=await import('@aws-sdk/client-sesv2');
      const client=new SESv2Client({region:process.env.DAWAMAK_SES_REGION||'us-east-1',maxAttempts:1});
      try {await client.send(new SendEmailCommand({FromEmailAddress:process.env.DAWAMAK_SES_FROM,ReplyToAddresses:['info@dawamkom.net'],Destination:{ToAddresses:[message.to]},Content:{Simple:{Subject:{Charset:'UTF-8',Data:subject},Body:{Text:{Charset:'UTF-8',Data:message.text},Html:{Charset:'UTF-8',Data:message.html}}}}}),{abortSignal:AbortSignal.timeout(10000)});}
      finally {client.destroy();}
    }else if(process.env.DAWAMAK_MAIL_WEBHOOK){
      const response=await fetch(process.env.DAWAMAK_MAIL_WEBHOOK,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+(process.env.DAWAMAK_MAIL_TOKEN??'')},body:JSON.stringify(message)});
      if(!response.ok)return false;
    }
    else return false;
    return true;
  }catch(error){console.error('Password recovery mail unavailable:',error.name);return false;}
}
const recoveryThrottle=new RecoveryThrottle();

function followUpMailSettings(workspace, branchId) {
  return {enabled:true,reassignments:true,...workspace.followUpMailSettings,...workspace.branchFollowUpMailSettings?.[branchId]};
}

async function notifyFollowUpAssignments(previous, workspace) {
  if (!runtime.delivery || !(process.env.DAWAMAK_SES_FROM || process.env.DAWAMAK_MAIL_WEBHOOK)) return;
  const oldAssignments=new Map((previous?.followUpAssignments??[]).filter(record=>!record.waitsForTicket).map(record=>[record.itemId,record.assigneeId]));
  const staff=new Map(workspace.staff.map(person=>[person.id,person]));
  for (const record of workspace.followUpAssignments??[]) {
    const oldAssignee=oldAssignments.get(record.itemId);
    if (record.waitsForTicket || !record.assigneeId || oldAssignee===record.assigneeId || record.status==='completed') continue;
    const settings=followUpMailSettings(workspace,record.snapshot?.branchId);
    if (!settings.enabled || (oldAssignee && !settings.reassignments)) continue;
    const person=staff.get(record.assigneeId);
    const to=person?.email?.trim();
    if (person?.status!=='Active' || !to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) continue;
    const origin = process.env.DAWAMAK_PUBLIC_ORIGIN;
    const url = origin ? new URL(workspace.slug ? '/company/' + encodeURIComponent(workspace.slug) + '/#followup' : '/#followup', origin).href : undefined;
    const message = followUpAssignmentEmail({
      name: person.nameAr || person.nameEn || person.name,
      number: record.snapshot?.number,
      task: record.snapshot?.name,
      dueOn: record.dueOn,
      url,
    });
    const result=await deliverMonthlyEmployeeMail({to,...message});
    if (!result.sent) console.error('Follow-up assignment mail unavailable:',result.error);
  }
}

const invitationOrigin = () => process.env.DAWAMAK_PUBLIC_ORIGIN ??
  (!hostedDemo ? 'http://127.0.0.1:' + server.address().port : '');
const demoCompanyId = 'xyz-demo';
const sampleCompanyConfig = process.env.DAWAMAK_SAMPLE_COMPANY;
const publicPartners = () => [
  ...(sampleCompanyConfig || demoCompanyStatus === 'deleted' ? [] : [{
    id: demoCompanyId, name: state.company, email: state.organization?.email,
    phone: state.organization?.phone, contactName: state.organization?.contactName,
    active: true, suspended: demoCompanyStatus === 'suspended',
  }]),
  ...partners.map(({ id, name, email, phone, contactName, account, suspended }) =>
    ({ id, name, email, phone, contactName, active: Boolean(account?.passwordHash), suspended: Boolean(suspended),activationEmailSent:activationEmailSent(account,email),
      activationLinkExpiresAt: account?.passwordHash ? null : account?.activationExpires ?? null })),
];
const partnerOrganization = ({ name, email, phone, contactName }, profile) =>
  ({ name, phone, contactName: contactName ?? '', ...profile, email: profile?.email || email });
const newPartnerWorkspace = (company, slug) => ({
  ...structuredClone(demoSeed), staff: [], requests: [], company, slug, jobTitles: [...jobTitles],
});
if (sampleCompanyConfig && !initialSnapshot) {
  const profile = JSON.parse(sampleCompanyConfig);
  const email = string(profile.email).toLowerCase();
  const sample = { id: string(profile.id) || randomUUID(), name: string(profile.name),
    email, phone: string(profile.phone), contactName: string(profile.contactName) };
  if (!partners.some(item => item.id === sample.id || item.email === email)) {
    const workspace = newPartnerWorkspace(sample.name, sample.id);
    let account = {};
    if (profile.snapshot) {
      const { workspace: saved, account: savedAccount } = profile.snapshot;
      const credentials = ({ salt, passwordHash } = {}) =>
        /^[a-f0-9]{64}$/.test(salt) && /^[a-f0-9]{128}$/.test(passwordHash) ? { salt, passwordHash } : null;
      account = credentials(savedAccount);
      if (!account || !Array.isArray(saved?.staff) || saved.slug !== sample.id) {
        throw new Error('The sample company snapshot needs a matching workspace and company credentials.');
      }
      Object.assign(workspace, saved, { company: sample.name, slug: sample.id });
      workspace.staff = saved.staff.map(({ account: savedStaffAccount, canCopyActivation, approvedDevice, ...person }) => {
        if (person.status === 'Pending activation') return { ...person, account: {} };
        if (person.status !== 'Active') return person;
        const staffAccount = credentials(savedStaffAccount);
        if (!staffAccount) throw new Error('The sample company snapshot is missing credentials for an active employee.');
        return { ...person, account: staffAccount };
      });
    }
    workspace.organization = partnerOrganization(sample, workspace.organization);
    const seededPartners = [...partners, { ...sample, workspace, account, suspended: false }];
    if (storage) partners = seededPartners;
    else await persistPlatform(seededPartners, platformProfile);
  }
}
if (storage && !initialSnapshot) {
  await storage.write({ state, partners, profile: platformProfile, demoCompanyStatus });
}
const escape = value => value.replace(/[&<>"']/g, char => '&#' + char.charCodeAt(0) + ';');
const companyPage = (name, email, activate, unified = false, logo = '') => {
  return '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="theme-color" content="#103c45"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">' +
    '<meta name="apple-mobile-web-app-title" content="دوامكم"><script src="/theme.js"></script><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/theme.css"><title>دوامكم</title>' +
    '<body class="workspace-login company-access"><main class="workspace-login-main preview-access">' +
    '<div class="workspace-login-brand brand">' + (logo ? '<span class="company-login-logo"><img src="' + escape(logo) +
      '" alt=""></span>' : '<span class="mark" aria-hidden="true"></span><span>دوامكم</span>') + '</div><h1>' +
    escape(name) + '</h1>' + (activate ? '<p><bdi>' + escape(email) + '</bdi></p>' : '') + '<form id="company-auth" data-action="' +
    (activate ? 'activate' : unified ? 'access' : 'login') + '"' + (activate ? '' : ' hidden') + '>' +
    (unified ? '<label id="company-access-email">البريد الإلكتروني<input name="email" type="email" autocomplete="username" required></label>' : '') +
    '<div class="auth-password-field"><div class="auth-password-heading"><label for="company-password">كلمة المرور</label>' +
    (activate ? '' : '<a href="/forgot-password" data-company-forgot>هل نسيت كلمة المرور؟</a>') +
    '</div><input id="company-password" name="password" type="password" maxlength="128" required></div>' +
    (activate ? '<p>استخدم 10 أحرف على الأقل مع حرف إنجليزي كبير وصغير ورقم ورمز.</p><label>تأكيد كلمة المرور<input name="confirmation" type="password" maxlength="128" required></label>' : '') +
    '<button class="button primary">' + (activate ? 'تفعيل الشركة' : 'دخول') +
    '</button>' + (unified ? '<button id="company-access-change" class="button secondary" type="button" hidden>طلب تغيير المتصفح</button>' : '') +
    '<p role="status"></p></form></main><script type="module" src="/company-auth.js"></script></body></html>';
};
function appManifest(startUrl, scope) {
  return JSON.stringify({
    id: startUrl,
    name: 'دوامكم',
    short_name: 'دوامكم',
    lang: 'ar',
    dir: 'rtl',
    start_url: startUrl,
    scope,
    display: 'standalone',
    theme_color: '#17353c',
    background_color: '#131d21',
    icons: [192, 512].map(size => ({
      src: '/app-icon-' + size + '.png',
      sizes: size + 'x' + size,
      type: 'image/png',
    })),
  });
}
export async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const companyRoute = url.pathname.match(/^\/company\/([a-f0-9-]{36})(\/.*)?$/);
  const path = companyRoute ? companyRoute[2] || '/' : url.pathname;
  const partner = companyRoute && partners.find(item => item.id === companyRoute[1]);
  const companyPrefix = partner ? '/company/' + partner.id : '';
  const companyCredential = req.headers.cookie?.match(/(?:^|;\s*)dawamkom_company=([a-f0-9]{64})(?:;|$)/)?.[1];
  const companyView = Boolean(partner && companyViewAccess(req,partner.id));
  const signedIntoCompany = companyView || Boolean(partner && companyCredential && partner.account?.sessionHash === hash(companyCredential) &&
    partner.account.sessionExpires > Date.now());
  const key = browserKey(req);
  const browser = key && hash(key);
  const sessionKey = employeeSessionKey(req);
  const sessionHash = sessionKey && hash(sessionKey);
  const companyEmployee = partner && signedInEmployee(partner.workspace, browser, sessionHash);
  const canManageCompany = hasAdministration(partner?.workspace??{},companyEmployee);
  const hasCompanyAccess = signedIntoCompany || canManageCompany;
  if (!companyRoute && req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Cache-Control': 'no-store' });
    return res.end('OK');
  }
  let cookie;
  const send = (code, value, type = 'application/json') => {
    if (partner && type === 'application/json' && Array.isArray(value?.staff) && Object.hasOwn(value, 'isCompanyOwner')) {
      value = {...value, canAdjustLeaveBalances: signedIntoCompany || (canManageCompany &&
        hasRolePermission(partner.workspace, companyEmployee, 'staffEdit'))};
    }
    if(companyView && type==='application/json' && value && typeof value==='object' && !Array.isArray(value))value={...value,companyView:true};
    const headers = { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
    if (cookie) headers['Set-Cookie'] = cookie;
    let payload = type === 'application/json' ? JSON.stringify(value) : type === 'text/html'
      ? String(value).replaceAll('__DAWAMKOM_RELEASE__', releaseVersion).replace(/((?:src|href)=["'])\/(?!\/)([^"'?]+\.(?:js|css|png))(["'])/g,
        (_,prefix,file,quote)=>prefix+'/'+file+'?v='+releaseVersion+quote)
      : value;
    const staticAsset = req.method === 'GET' && code === 200 && files.get(path)?.[1] === type && type !== 'text/html' && !path.endsWith('-sw.js');
    if (staticAsset) {
      let cached = staticResponses.get(path);
      if (!cached) {
        if (type === 'text/javascript') payload = String(payload).replace(/((?:from\s*|import\s*\(?\s*)["'])(\.\.?\/[^"'?]+\.js)(["'])/g, '$1$2?v='+releaseVersion+'$3');
        if (type === 'text/css') payload = String(payload).replace(/(url\(["']?)(\/font-[^\s"')?]+\.woff2)(["']?\))/g, '$1$2?v='+releaseVersion+'$3');
        const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
        cached = {raw, etag:'W/"'+createHash('sha256').update(raw).digest('hex')+'"'};
        if (/^(text\/|application\/(?:javascript|json|manifest\+json))/.test(type) && raw.length > 1024) cached.gzip = gzipSync(raw);
        staticResponses.set(path,cached);
      }
      headers['Cache-Control'] = url.searchParams.get('v') === releaseVersion ? 'public, max-age=31536000, immutable' : 'public, no-cache';
      headers.ETag = cached.etag;
      headers.Vary = 'Accept-Encoding';
      if (req.headers['if-none-match']?.split(',').some(tag=>tag.trim()===cached.etag || tag.trim()==='*')) {
        res.writeHead(304,headers);return res.end();
      }
      payload = acceptsGzip(req) && cached.gzip ? cached.gzip : cached.raw;
      if (payload === cached.gzip) headers['Content-Encoding']='gzip';
    }
    if (req.method === 'GET' && path === '/api/state' && code === 200 && type === 'application/json') {
      headers.Vary = 'Accept-Encoding';
      if (payload.length >= 1024 && acceptsGzip(req)) {
        return gzip(payload, (error, compressed) => {
          if (res.destroyed) return;
          if (!error) headers['Content-Encoding'] = 'gzip';
          res.writeHead(code, headers);
          res.end(error ? payload : compressed);
        });
      }
    }
    res.writeHead(code, headers);
    res.end(payload);
  };
  try {
    if (!companyRoute && req.method === 'GET' && path === '/api/version') return send(200, {version: releaseVersion});
    if(!companyRoute && ['/api/password-recovery','/api/password-reset'].includes(path)){
      if(req.method!=='POST')return send(405,{error:'Method not allowed.'});
      if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Expected JSON.'});
      const started=Date.now();
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>4096)return send(413,{error:'Request too large.'});chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'الطلب غير صالح.'});}
      if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'الطلب غير صالح.'});
      const origin=process.env.DAWAMAK_PUBLIC_ORIGIN||(!hostedDemo?'http://127.0.0.1:'+server.address().port:null);
      if(!origin)return send(503,{error:'الخدمة غير متاحة حاليًا.'});
      if(req.headers.origin && req.headers.origin!==new URL(origin).origin)return send(403,{error:'الطلب غير صالح.'});
      const source=hash(String(req.headers['x-forwarded-for']??req.socket.remoteAddress??'').split(',')[0].trim());
      const allowed=recoveryThrottle.allow(source);
      if(path==='/api/password-recovery'){
        const email=string(body.email).toLowerCase(),kind=body.kind??'all';
        if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['all','company','employee'].includes(kind)||body.companyId!==undefined&&!/^[a-f0-9-]{36}$/.test(body.companyId))return send(400,{error:'أدخل بريدًا إلكترونيًا صحيحًا.'});
        if(allowed){
          const next=structuredClone(partners);
          const jobs=requestRecovery(next,{email},{origin});
          if(jobs.length){await persistPlatform(next,platformProfile);for(const job of jobs)setImmediate(()=>void deliverRecoveryMail(job)).unref();}
        }
        await new Promise(resolve=>setTimeout(resolve,Math.max(0,350-(Date.now()-started))));
        return send(200,{message:recoveryMessage});
      }
      if(!allowed)return send(429,{error:'محاولات كثيرة. حاول لاحقًا.'});
      const next=structuredClone(partners);let notice;
      try{notice=consumeRecovery(next,body);}catch(error){await new Promise(resolve=>setTimeout(resolve,Math.max(0,350-(Date.now()-started))));return send(400,{error:error.message});}
      await persistPlatform(next,platformProfile);
      setImmediate(()=>void deliverRecoveryMail(notice,true)).unref();
      return send(200,{message:'تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.'});
    }
    if (!companyRoute && req.method === 'GET' && path === '/dawamkom.webmanifest') {
      return send(200, appManifest('/', '/'), 'application/manifest+json');
    }
    if (companyRoute) {
      if (!partner) return send(404, { error: 'الشركة غير موجودة.' });
      if (partner.suspended) return send(403, { error: 'تم إيقاف الوصول إلى حساب الشركة.' });
      if (req.method === 'GET' && path === '/api/company-session') {
        return send(hasCompanyAccess ? 200 : 401, { signedIn: hasCompanyAccess });
      }
      if (req.method === 'GET' && path === '/employee.webmanifest') {
        return send(200, appManifest(companyPrefix + '/employee', companyPrefix + '/'), 'application/manifest+json');
      }
      if (req.method === 'GET' && ['/activate', '/login', '/access'].includes(path)) {
        if (path === '/access' && url.searchParams.get('view') === 'documents' && (hasCompanyAccess || companyEmployee)) {
          if (!signedIntoCompany && !hasRolePermission(partner.workspace, companyEmployee, 'documents')) {
            return send(403, 'ليست لديك صلاحية عرض ملفات محفظة المستندات.', 'text/plain');
          }
          return send(200, '<!doctype html><html lang="ar" dir="rtl" class="employee-page" data-theme="dark"><head><meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
            '<title>محفظة المستندات</title><script src="/theme.js"></script>' +
            '<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/theme.css">' +
            '<script type="module" src="/document-wallet.js"></script></head><body class="employee-portal shared-wallet-page">' +
            '<main id="shared-document-wallet" class="employee-sheet employee-wallet" data-endpoint="' + companyPrefix + '/api/documents">' +
            '<header class="employee-section-heading"><h1>محفظة المستندات</h1></header>' +
            '</main></body></html>', 'text/html');
        }
        if (path !== '/activate' && companyEmployee) {
          res.writeHead(303, { Location: companyPrefix + '/employee', 'Cache-Control': 'no-store' });
          return res.end();
        }
        if (path !== '/activate' && hasCompanyAccess) {
          res.writeHead(303, { Location: companyPrefix + '/', 'Cache-Control': 'no-store' });
          return res.end();
        }
        return send(200, companyPage(partner.workspace.organization?.name || partner.workspace.company || partner.name,
          partner.email, path === '/activate', path === '/access', partner.workspace.organization?.logo), 'text/html');
      }
      if (req.method === 'POST' && ['/activate', '/login', '/access'].includes(path)) {
        if (req.headers['content-type'] !== 'application/json') return send(415, { error: 'Expected JSON.' });
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096) return send(413, { error: 'Request too large.' });
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks)); }
        catch { return send(400, { error: 'الطلب غير صالح.' }); }
        const current = partners.find(item => item.id === partner.id);
        if (!current) return send(404, { error: 'الشركة غير موجودة.' });
        if (current.suspended) return send(403, { error: 'تم إيقاف الوصول إلى حساب الشركة.' });
        const account = current.account;
        const password = body?.password;
        if (typeof password !== 'string' || password.length > 128) return send(400, { error: 'كلمة المرور غير صالحة.' });
        let credentials = account;
        if (path === '/activate') {
          if (typeof body.token !== 'string' || account?.activationHash !== hash(body.token) || account.activationExpires <= Date.now()) {
            return send(400, { error: invalidInvitation });
          }
          if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) || !/[\p{P}\p{S}]/u.test(password) || password !== body.confirmation) {
            return send(400, { error: 'تأكد من شروط كلمة المرور وتطابقها.' });
          }
          const salt = secret();
          credentials = { salt, passwordHash: scryptSync(password, salt, 64).toString('hex') };
        } else if ((path === '/access' && string(body.email).toLowerCase() !== current.email) || !account?.passwordHash ||
          !timingSafeEqual(scryptSync(password, account.salt, 64), Buffer.from(account.passwordHash, 'hex'))) {
          return send(401, { error: 'بيانات الدخول غير صحيحة.' });
        }
        const session = secret();
        const age = signedInSessionAge;
        const updated = { ...current, account: { ...credentials, sessionHash: hash(session), sessionExpires: Date.now() + age * 1000 } };
        cookie = 'dawamkom_company=' + session + '; Path=' + companyPrefix + '/; HttpOnly; SameSite=Strict; Max-Age=' + age +
          (hostedDemo ? '; Secure' : '');
        if (path === '/access') {
          const manager = current.workspace.staff.find(person => person.email === current.email && person.status === 'Active' &&
            isGeneralManager(person) && person.account?.passwordHash);
          if (manager && timingSafeEqual(scryptSync(password, manager.account.salt, 64), Buffer.from(manager.account.passwordHash, 'hex'))) {
            const managerSession = secret();
            const account = { ...manager.account };
            addManagerSession(account, hash(managerSession), age);
            updated.workspace = { ...current.workspace, staff: current.workspace.staff.map(person => person.id === manager.id ? {
              ...person, account,
            } : person) };
            cookie = [cookie, employeeSessionCookie(managerSession, companyPrefix, age)];
          }
        }
        await persistPlatform(partners.map(item => item.id === current.id ? updated : item), platformProfile);
        return send(200, { url: companyPrefix + '/' });
      }
      if (path !== '/employee' && !path.startsWith('/api/employee/')) {
        if (!hasCompanyAccess) {
          if (path.startsWith('/api/')) return send(401, { error: 'سجّل الدخول إلى حساب الشركة.' });
          res.writeHead(303, { Location: companyPrefix + '/login', 'Cache-Control': 'no-store' });
          return res.end();
        }
        if (req.method === 'POST' && path === '/logout') {
          if(companyView) {
            res.writeHead(303,{Location:'/super-admin#partners','Cache-Control':'no-store','Set-Cookie':endCompanyView(req,partner.id)});
            return res.end();
          }
          if (!signedIntoCompany) {
            const workspace = structuredClone(partner.workspace);
            const account = workspace.staff.find(person => person.id === companyEmployee.id).account;
            if (account.managerSessions?.includes(sessionHash)) {
              account.managerSessions = account.managerSessions.filter(key => key !== sessionHash);
              if (account.managerSessionExpirations) delete account.managerSessionExpirations[sessionHash];
            } else {
              account.sessionHash = null;
            }
            await persistPlatform(partners.map(item => item.id === partner.id ? { ...item, workspace } : item), platformProfile);
            res.writeHead(303, { Location: companyPrefix + '/employee', 'Cache-Control': 'no-store',
              'Set-Cookie': employeeSessionCookie('', companyPrefix) });
            return res.end();
          }
          const account = { ...partner.account };
          delete account.sessionHash;
          delete account.sessionExpires;
          const key = employeeSessionKey(req);
          const managerSession = key && hash(key);
          const manager = managerSession && partner.workspace.staff.find(person => person.email === partner.email &&
            person.account?.managerSessions?.includes(managerSession));
          const workspace = manager ? { ...partner.workspace, staff: partner.workspace.staff.map(person => person.id === manager.id ? {
            ...person, account: { ...person.account, managerSessions: person.account.managerSessions.filter(item => item !== managerSession) },
          } : person) } : partner.workspace;
          await persistPlatform(partners.map(item => item.id === partner.id ? { ...item, account, workspace } : item), platformProfile);
          const clearCompany = 'dawamkom_company=; Path=' + companyPrefix + '/; HttpOnly; Max-Age=0';
          res.writeHead(303, { Location: companyPrefix + '/login',
            'Set-Cookie': manager ? [clearCompany, employeeSessionCookie('', companyPrefix)] : clearCompany });
          return res.end();
        }
        if (path !== '/' && !path.startsWith('/api/')) return send(404, { error: 'Page not found.' });
      }
    }
    if (!partner && (path === '/super-admin' || path === '/api/partners' || path === '/api/platform-organization')) {
      if (hostedDemo && !isAdmin(req)) {
        if (path === '/super-admin') {
          res.writeHead(303, { Location: '/admin?next=super-admin', 'Cache-Control': 'no-store' });
          return res.end();
        }
        return send(403, { error: 'Administrator access required.' });
      }
      if (path !== '/super-admin') {
        if (req.method === 'GET') return send(200, { partners: publicPartners(), organization: platformProfile });
        if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
        if (req.headers['content-type'] !== 'application/json') return send(415, { error: 'Expected JSON.' });
        let body;
        try {
          let size = 0;
          const chunks = [];
          for await (const chunk of req) {
            size += chunk.length;
            if (size > (path === '/api/partners' ? 4096 : organizationBodyLimit)) return send(413, { error: 'Request too large.' });
            chunks.push(chunk);
          }
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch { return send(400, { error: 'Expected JSON.' }); }
        if (path === '/api/platform-organization') {
          let profile;
          try { profile = organizationProfile(body ?? {}, platformProfile); }
          catch (error) { return send(400, { error: error.message }); }
          await persistPlatform(partners, profile);
          return send(200, { partners: publicPartners(), organization: platformProfile });
        }
        if(body?.operation==='view') {
          if(!isAdmin(req))return send(403,{error:'Administrator access required.'});
          const origin=process.env.DAWAMAK_PUBLIC_ORIGIN;
          if(req.headers.origin && origin && req.headers.origin!==new URL(origin).origin)return send(403,{error:'Invalid request origin.'});
          const company=partners.find(item=>item.id===body.id);
          if(!company || company.suspended)return send(404,{error:'Company access is unavailable.'});
          const account={...company.account,adminViewHistory:[...(company.account?.adminViewHistory??[]),{at:new Date().toISOString(),actor:'super-admin'}].slice(-100)};
          await persistPlatform(partners.map(item=>item.id===company.id?{...item,account}:item),platformProfile);
          cookie=beginCompanyView(req,company.id);
          return send(200,{url:'/company/'+company.id+'/'});
        }
        if (body?.operation === 'status' || body?.operation === 'delete') {
          if (body.operation === 'status' && typeof body.suspended !== 'boolean') {
            return send(400, { error: 'حالة الشركة غير صالحة.' });
          }
          if (body.id === demoCompanyId) {
            if (demoCompanyStatus === 'deleted') return send(404, { error: 'الشركة غير موجودة.' });
            const status = body.operation === 'delete' ? 'deleted' : body.suspended ? 'suspended' : 'active';
            await persistPlatform(partners, platformProfile, status);
            return send(200, { partners: publicPartners(), organization: platformProfile });
          }
          const current = partners.find(item => item.id === body.id);
          if (!current) return send(404, { error: 'الشركة غير موجودة.' });
          if (body.operation === 'delete') {
            await persistPlatform(partners.filter(item => item.id !== current.id), platformProfile);
          } else {
            const account = { ...current.account };
            if (body.suspended) {
              delete account.sessionHash;
              delete account.sessionExpires;
            }
            const updated = { ...current, suspended: body.suspended, account };
            await persistPlatform(partners.map(item => item.id === current.id ? updated : item), platformProfile);
          }
          return send(200, { partners: publicPartners(), organization: platformProfile });
        }
        const resend=body?.operation==='resend-activation';
        const manual = body?.operation === 'activation-link'||resend;
        const editing = body?.operation === 'update';
        const pending = manual ? partners.find(item => item.id === body.id && !item.suspended && !item.account?.passwordHash) : null;
        if (manual && !pending) return send(404, { error: 'الشركة غير متاحة للتفعيل.' });
        const details = pending ?? body;
        const name = string(details?.name), email = string(details?.email).toLowerCase(), phone = string(details?.phone);
        const contactName = string(details?.contactName);
        if (!contactName || contactName.length > 120) {
          return send(400, { error: 'أدخل اسم الشخص المخوّل (حتى 120 حرفًا).' });
        }
        if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          phone.length > 40 || !/^[+0-9٠-٩۰-۹().\s-]+$/.test(phone) || (phone.match(/[0-9٠-٩۰-۹]/g)?.length ?? 0) < 7) {
          return send(400, { error: 'Enter a company name, valid email and contact number.' });
        }
        if (editing) {
          const company = partners.find(item => item.id === body.id);
          if (!company) return send(404, { error: 'الشركة غير موجودة.' });
          if (partners.some(item => item.id !== company.id && item.email === email)) {
            return send(409, { error: 'البريد الإلكتروني مرتبط بشركة أخرى.' });
          }
          const profile = { name, email, phone, contactName };
          let account = company.email !== email && !company.account?.passwordHash ? {} : company.account;
          try { account = updatedCompanyCredentials(account, body.password, body.confirmation); }
          catch (error) { return send(400, { error: error.message }); }
          const record = { ...company, ...profile, account, workspace: { ...company.workspace, company: name,
            organization: { ...company.workspace.organization, ...profile } } };
          await persistPlatform(partners.map(item => item.id === company.id ? record : item), platformProfile);
          return send(200, { partners: publicPartners(), organization: platformProfile });
        }
        const origin = invitationOrigin();
        if (!origin) return send(503, { error: 'Configure the public invitation origin.' });
        const existing = partners.find(item => item.email === email);
        if (existing?.account?.passwordHash) return send(409, { error: 'هذه الشركة مفعّلة بالفعل.' });
        const token = secret(), id = existing?.id ?? randomUUID();
        const workspace = existing?.workspace ?? newPartnerWorkspace(name, id);
        const record = { id, name, email, phone, contactName, suspended: existing?.suspended ?? false,
          workspace: { ...workspace, organization: partnerOrganization({ name, email, phone, contactName }, existing?.workspace?.organization) },
          account: { activationHash: hash(token), activationExpires: Date.now() + 48 * 3600000 } };
        const nextPartners = [...partners.filter(item => item.id !== id), record];
        await persistPlatform(nextPartners, platformProfile);
        const url = new URL('/company/' + id + '/activate', origin);
        url.hash = 'activate=' + token;
        const invitation = manual&&!resend ? { url: url.href } : await deliverInvitation({
          email, name: contactName, url: url.href,
          introduction: 'تمت إضافة شركة ' + name + ' إلى دوامكم. فعّل حسابك لإدارة الشركة.',
        });
        if(invitation.delivery==='sent'&&recordActivationEmail(record.account,email))await persistPlatform(nextPartners,platformProfile);
        return send(201, { partners: publicPartners(), organization: platformProfile, invitation });
      }
    }
    if (path === '/admin' || path.startsWith('/admin/')) return await handleAdmin(req, res, url);
    if (!companyRoute && req.method === 'GET' && path === '/') {
      return send(200, readFileSync(new URL('./public/workspace-login.html', import.meta.url)), 'text/html');
    }
    if (!companyRoute && path === '/api/workspace-lookup') {
      if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
      if (req.headers['content-type'] !== 'application/json') return send(415, { error: 'Expected JSON.' });
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024) return send(413, { error: 'Request too large.' });
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks)); }
      catch { return send(400, { error: 'Invalid request.' }); }
      const email = string(input?.email).toLowerCase();
      const name = string(input?.name).toLowerCase();
      if ((!email && !name) || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) || name.length > 120) {
        return send(400, { error: 'Invalid search.' });
      }
      const matches = [];
      for (const company of partners) {
        if (company.suspended || !company.account?.passwordHash) continue;
        const prefix = '/company/' + company.id;
        const companyName = company.workspace.organization?.name || company.name;
        if (email ? company.email === email : companyName.toLowerCase() === name) {
          matches.push({ name: companyName, role: 'admin', url: prefix + '/login' });
        }
        if (email && company.workspace.staff.some(person => person.email === email && person.status === 'Active' && person.account?.passwordHash)) {
          matches.push({ name: companyName, role: 'employee', url: prefix + '/employee' });
        }
      }
      return send(200, { matches });
    }
    if (!companyRoute && demoCompanyStatus !== 'active' && (path === '/demo' || path === '/employee' || path.startsWith('/api/'))) {
      const deleted = demoCompanyStatus === 'deleted';
      const message = deleted ? 'تم حذف الشركة التجريبية.' : 'تم إيقاف الشركة التجريبية.';
      if (path.startsWith('/api/')) return send(deleted ? 404 : 403, { error: message });
      return send(deleted ? 404 : 403, '<!doctype html><html lang="ar" dir="rtl" data-theme="dark"><meta charset="utf-8"><script src="/theme.js"></script><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/theme.css"><main><p>' +
        message + '</p><a href="/super-admin#partners">إدارة الشركات</a></main></html>', 'text/html');
    }
    if (!companyRoute && demoCompanyStatus === 'active' && req.method === 'GET' && path === '/employee.webmanifest') {
      return send(200, appManifest('/employee', '/'), 'application/manifest+json');
    }
    if (req.method === 'GET' && path === '/employee') return send(200, employeePage.replace('<!-- company-workspace-link -->', ''), 'text/html');
    if (path === '/preview-access') {
      res.writeHead(303, { Location: '/demo#staff', 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (req.method === 'GET' && files.has(path)) {
      const [file, type] = files.get(path);
      return send(200, staticResponses.get(path)?.raw ?? readFileSync(new URL('./public/' + file, import.meta.url)), type);
    }
    let demo;
    const workspace = partner
      ? { ...partner.workspace, leaveTypes: [...new Set([...(partner.workspace.leaveTypes ?? []), futureAnnualLeave])],
        leaveSettings: { [futureAnnualLeave]: { ...defaultLeaveSettings[futureAnnualLeave] }, ...partner.workspace.leaveSettings },
        organization: partnerOrganization(partner, partner.workspace.organization) }
      : state;
    const employee = partner ? companyEmployee : signedInEmployee(workspace, browser, sessionHash);
    const branchManager = partner && !signedIntoCompany && canManageCompany ? { ...employee,
      branchId: managesBranch(employee, employee.branchId) ? employee.branchId : roleBranches(employee)[0] ?? null } : null;
    const visibleWorkspace = source => ({...(branchManager ? branchWorkspace(source, branchManager) : source),branchAdministratorChoices:branchManager&&canDistributePermissions(source,employee)?source.staff.filter(p=>p.status==='Active'&&isAdministrator(p,source)).map(p=>({id:p.id,name:p.name,nameAr:p.nameAr,nameEn:p.nameEn,role:p.role,status:p.status,roleBranchIds:{[p.role]:roleBranches(p).filter(id=>managesBranch(branchManager,id))}})):undefined,canManageRolePermissions:Boolean(signedIntoCompany||canDistributePermissions(source,employee)),canEditApprovalChains:Boolean(signedIntoCompany||!partner||hasRolePermission(source,employee,'approvalChains'))});
    const saveWorkspace = async next => {
      if (!partner) return persist(next);
      await persistPlatform(partners.map(item => item.id === partner.id ? { ...item, ...(path==='/api/organization/name'?{name:next.company}:{}), workspace: next } : item), platformProfile);
    };
    const admin = partner ? true : isAdmin(req);
    const approvalActor = signedIntoCompany ? 'account-owner' : branchManager?.id;
    if (hostedDemo && !admin && path.startsWith('/api/') && !path.startsWith('/api/employee/')) ({ demo, cookie } = demoWorkspace(req));
    if (req.method === 'GET' && path === '/api/account') {
      if (!signedIntoCompany && !employee) return send(401, { error: 'سجّل الدخول أولًا.' });
      return send(200, signedIntoCompany ? { name: partner.contactName || partner.name, email: partner.email, owner: true, photo: partner.account.photo || '' } :
        { id: employee.id, name: employee.nameAr || employee.name, email: employee.email, owner: false, photo: employee.photo || '' });
    }
    if (req.method === 'GET' && path === '/api/approval-queue') {
      if (!partner || !approvalActor) return send(403,{error:'Administrator access required.'});
      return send(200,approvalQueueSnapshot(workspace,approvalActor));
    }
    if (req.method === 'GET' && path === '/api/state') return send(200, {
      ...publicState(visibleWorkspace(demo?.state ?? workspace)), admin, isCompanyOwner: Boolean(signedIntoCompany), canManageCompany });
    if (req.method === 'GET' && path === '/api/leave-balances/adjustments') {
      if (!partner || (!signedIntoCompany && !hasRolePermission(workspace, employee, 'staffEdit')))
        return send(403, {error:'Employee editing permission is required.'});
      const person = visibleWorkspace(workspace).staff.find(item => item.id === url.searchParams.get('staffId'));
      if (!person) return send(404, {error:'Employee not found.'});
      const names = new Map(workspace.staff.map(item => [item.id, item.nameAr || item.name]));
      const adjustments = (person.leaveBalanceAdjustments ?? []).slice(-30).reverse().map(({at, days, note, actor}) =>
        ({at, days, note, actor: actor === 'account-owner' ? null : names.get(actor) ?? ''}));
      return send(200, {adjustments});
    }
    if (req.method === 'GET' && path === '/api/attendance/rejected-attempts') {
      if (!partner || (!signedIntoCompany && !branchManager)) return send(403, {error:'Attendance access required.'});
      const day = url.searchParams.get('date');
      if (!validDate(day)) return send(400, {error:'Choose a valid date.'});
      const attempts = (workspace.rejectedPunchAttempts ?? []).filter(attempt => attempt.date === day &&
        (!branchManager || managesBranch(branchManager, attempt.branchId)));
      return send(200, {attempts});
    }
    if (req.method === 'GET' && path === '/api/documents/list') {
      if (!partner || (!signedIntoCompany && !hasRolePermission(workspace, employee, 'documents'))) {
        return send(403, {error: 'ليست لديك صلاحية عرض ملفات محفظة المستندات.'});
      }
      const branch = !signedIntoCompany && employee &&
        (managesBranch(employee, employee.branchId) ? employee.branchId : roleBranches(employee)[0]);
      const lead = documentReminderDays(effectiveNotificationSettings(workspace, branch));
      const today = Date.parse(date() + 'T00:00:00Z');
      const branchNames = new Map(workspace.locations.map(({id,name}) => [id,name]));
      const documents = (workspace.documents ?? []).map(({id,name,mime,expiresOn,branchId}) => {
        const days = (Date.parse(expiresOn + 'T00:00:00Z') - today) / 86400000;
        const expiry = days < 0 ? 'expired' : days <= lead ? 'soon' : null;
        return {id,name,mime,expiresOn,expiry,branchId,branchName:branchNames.get(branchId)};
      });
      return send(200, {documents});
    }
    if (req.method === 'GET' && path === '/api/documents') {
      const document = visibleWorkspace(demo?.state ?? workspace).documents?.find(item => item.id === url.searchParams.get('id'));
      if (!document) return send(404, { error: 'Document not found.' });
      const extension = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' }[document.mime];
      const name = document.name.replace(/\.(pdf|png|jpe?g)$/i, '') + '.' + extension;
      const disposition = url.searchParams.get('view') === '1' && extension ? 'inline' : 'attachment';
      res.writeHead(200, { 'Content-Type': document.mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
        'Content-Disposition': disposition + "; filename*=UTF-8''" + encodeURIComponent(name.toWellFormed()).replace(/['()]/g, character => '%' + character.charCodeAt(0).toString(16)) });
      return res.end(Buffer.from(document.data, 'base64'));
    }
    if(req.method==='GET'&&path==='/api/follow-up/attachment'){
      const visible=visibleWorkspace(demo?.state??workspace),item=followUpItems(visible,date()).find(i=>i.id===url.searchParams.get('itemId'));
      const attachment=item?.assignment?.comments?.find(c=>c.id===url.searchParams.get('commentId'))?.attachment;
      if(!attachment)return send(404,{error:'Attachment not found.'});
      const preview=url.searchParams.get('view')==='inline'&&['application/pdf','image/png','image/jpeg'].includes(attachment.mime);
      res.writeHead(200,{'Content-Type':attachment.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Disposition':(preview?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(attachment.name.toWellFormed()).replace(/['()]/g,c=>'%'+c.charCodeAt(0).toString(16))});
      return res.end(Buffer.from(attachment.data,'base64'));
    }
    if (req.method === 'GET' && path === '/api/payroll-attachment') {
      const run = visibleWorkspace(demo?.state ?? workspace).payrollRuns?.find(item => item.month === url.searchParams.get('month'));
      const entry = run?.entries.find(item => item.staffId === url.searchParams.get('staffId'));
      const attachment = entry?.adjustments.find(item => item.id === url.searchParams.get('id') && !item.removedAt)?.attachment;
      if (!attachment) return send(404, { error: 'Attachment not found.' });
      res.writeHead(200, { 'Content-Type': attachment.mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(attachment.name.toWellFormed()).replace(/['()]/g, character => '%' + character.charCodeAt(0).toString(16)) });
      return res.end(Buffer.from(attachment.data, 'base64'));
    }
    if (req.method === 'GET' && path === '/api/issued-reports') {
      const report = visibleWorkspace(demo?.state ?? workspace).issuedReports?.find(item => item.id === url.searchParams.get('id'));
      return report ? send(200, report) : send(404, { error: 'Report not found.' });
    }
    if (req.method === 'GET' && path === '/api/requests') {
      const current = visibleWorkspace(demo?.state ?? workspace);
      return send(200, { documentAlerts:documentAlerts(demo?.state??workspace,date(),signedIntoCompany?null:employee),requests: current.requests.map(item=>requestSummary(item,workspace)), leaveTypes: current.leaveTypes,
        residencyAlerts: residencyAlerts(current,date(),signedIntoCompany?null:employee),
        followUpAlerts:followUpItems(current,date()).filter(i=>i.status!=='completed'&&(signedIntoCompany?i.overdue:i.assignment?.assigneeId===employee?.id)).map(i=>({id:i.id,name:i.name,overdue:i.overdue,dueOn:i.dueOn,version:i.assignment?.version??0,receivable:!signedIntoCompany&&hasRolePermission(workspace,employee,'tasks')&&i.assignment?.assigneeId===employee?.id&&i.status==='new'})),
        ...deviceRequestInbox(current, employee, signedIntoCompany), deviceReviewerId: employee?.id,
        reviewerId: eligibleApprover(employee,workspace) ? employee.id : undefined, companyReviewer: signedIntoCompany,
        staff: current.staff.map(({ id, name, nameAr, nameEn, jobTitle, managerId }) => ({ id, name, nameAr, nameEn, jobTitle, managerId })) });
    }
    if (req.method === 'GET' && (path.startsWith('/api/request-attachment/') || path.startsWith('/api/employee/request-attachment/'))) {
      const own=path.startsWith('/api/employee/');
      const attachment = (own?workspace:visibleWorkspace(demo?.state ?? workspace)).requests.find(item => item.id === path.split('/').at(-1) && (!own || employee && item.staffId===employee.id))?.attachment;
      if (!attachment) return send(404, { error: 'Attachment not found.' });
      const filename = encodeURIComponent(attachment.name).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16));
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': "attachment; filename*=UTF-8''" + filename,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(Buffer.from(attachment.data, 'base64'));
    }
    if (req.method === 'GET' && path === '/api/employee/team-attendance') {
      if (!employee || !canReviewTeam(employee,workspace)) return send(403,{error:'Team access required.'});
      const day = url.searchParams.get('date');
      if (!validDate(day) || day > date()) return send(400,{error:'Choose today or an earlier date.'});
      const people = canManageCompany ? visibleWorkspace(workspace).staff : workspace.staff.filter(person =>
        isDirectReport(person,employee) && (!branchManager || managesBranch(branchManager,person.branchId)));
      const metricStaff = people.filter(person => person.status === 'Active');
      return send(200,teamAttendanceSummary(workspace,employee,metricStaff,branchManager,signedIntoCompany,day,Date.now()));
    }
    if (req.method === 'GET' && path === '/api/employee/session') {
      if (!employee) return send(401, { pending: Boolean(browser && workspace.staff.some(person => person.account?.pendingBrowser === browser)) });
      const today = date();
      const now = Date.now();
      const punchWindows = employeePunchWindows(workspace, employee, today);
      const {lastPunch, openPunch, nextPunch} = punchSession(workspace.punches.filter(entry => entry.staffId === employee.id), punchWindows, now, today);
      const punchedIn = Boolean(openPunch);
      const midnight = Date.parse(today + 'T00:00:00+03:00');
      const shifts = (employee.attendanceExempt ? [] : [shiftDayBy(today, -1), today]).flatMap(day => effectiveRanges(workspace, employee, day))
        .filter(shift => shift.end > midnight).sort((a, b) => a.start - b.start);
      const shift = shifts.find(item => item.end > now) ?? shifts.at(-1);
      const flexibleTotals = flexibleDayTotals(workspace.punches.filter(entry => entry.staffId === employee.id), today, now,
        shift && isFlexiblePeriod(shift.period) ? shift : undefined);
      const scheduledPeriods = shifts.filter(item => item.assignment.date === today || item.end > now)
        .map(({ period, start, end }) => ({ name: period.name, start, end, duration: period.duration, flexible: isFlexiblePeriod(period) }));
      const shiftStartsAt = shift ? new Date(shift.start).toISOString() : null;
      const shiftEndsAt = shift?.end ?? null;
      const previousShift = shift && shifts.findLast(item => item.end <= shift.start);
      const pendingPunch = punchedIn && (!previousShift || Date.parse(lastPunch.time) >= previousShift.end) &&
        (lastPunch.date === today || (shift && shift.assignment.date === lastPunch.date && shift.end > now));
      const ownRequests = workspace.requests.filter(item => item.staffId === employee.id).reverse();
      const displayRequest = request => {
        const {id,type,date,end,status,submittedOn,loanAmount,repaymentInstallments,periodId,periodName,note,rejectionNote,decidedAt,autoApproved,periodCorrections} = request;
        return { id,type,date,end,status,submittedOn,loanAmount,repaymentInstallments,periodId,periodName,note,rejectionNote,decidedAt,autoApproved,periodCorrections,
          ...(request.attachment ? {attachmentName:request.attachment.name} : {}),
          approvalSteps:(request.approvalSteps??[]).map((approverId,index)=>{const person=workspace.staff.find(p=>p.id===approverId);const history=request.approvalHistory?.find(h=>h.stepIndex===index||(h.stepIndex===undefined&&h.approverId===approverId));const role=approvalRole(approverId);
            return {name:role||person?.nameAr||person?.name||'—',nameEn:role||person?.nameEn||person?.name||'—',status:history?.status??(index<(request.approvalIndex??0)||status==='Approved'?'Approved':index===(request.approvalIndex??0)&&status==='Pending'?'Pending':'Waiting'),at:history?.at};}),
        };
      };
      const homeRequests = ownRequests.flatMap(request => {
        const status = requestStatus(request, now);
        const resolvedAt = status === 'Cancelled' && request.status === 'Pending'
          ? requestTimestamp(request.approvalStepStartedAt ?? request.submittedAt, request.submittedOn) + 3 * dayMilliseconds
          : requestTimestamp(request.decidedAt, request.submittedOn);
        return status === 'Pending' || (['Approved', 'Declined', 'Cancelled'].includes(status) && now - resolvedAt < 7 * dayMilliseconds)
          ? [displayRequest({ ...request, status })] : [];
      });
      const team = canReviewTeam(employee,workspace) ? new Map(workspace.staff.filter(person => isDirectReport(person, employee) &&
        (!branchManager || managesBranch(branchManager, person.branchId)))
        .map(person => [person.id, person])) : new Map();
      const scopedRequests = visibleWorkspace(workspace).requests;
      const teamRequestCard = ({ id, staffId, type, date, end, status, submittedOn, note, loanAmount, repaymentInstallments, periodId, periodName, proposedIn, proposedOut, periodCorrections }) => ({
        id, staffId, type, date, end, status, submittedOn, note, loanAmount, repaymentInstallments, periodId, periodName, proposedIn, proposedOut, periodCorrections,
        employee: workspace.staff.find(person => person.id === staffId)?.nameAr ||
          workspace.staff.find(person => person.id === staffId)?.name,
      });
      const teamRequests = scopedRequests.filter(request =>
        (requestStatus(request, now) === 'Pending' &&
          (request.approvalSteps ? eligibleApprover(employee,workspace) && approvalStepMembers(workspace,request).includes(employee.id) : team.has(request.staffId))) ||
        (request.status === 'Approved' && team.has(request.staffId) &&
          workspace.leaveTypes.includes(request.type) && (request.end ?? request.date) >= today))
        .reverse().map(teamRequestCard);
      const teamRequestHistory = scopedRequests.filter(request => team.has(request.staffId))
        .slice(-30).reverse().map(request => teamRequestCard({...request, status:requestStatus(request, now)}));
      const metricStaff = canReviewTeam(employee,workspace) ? (canManageCompany ? visibleWorkspace(workspace).staff : [...team.values()]).filter(person=>person.status==='Active') : [];
      const teamSummary = canReviewTeam(employee,workspace) ? teamAttendanceSummary(workspace,employee,metricStaff,branchManager,signedIntoCompany,today,now) : null;
      return send(200, { name: employee.nameAr || employee.name, today, leaveTypes: activeLeaveTypes(workspace,employee), attendanceTypes: requestAttendanceTypes(workspace,employee), excuseTypes, excuseReasons, correctionReasons,
        availablePeriods: requestPeriods(workspace,employee),
        company: workspace.company, jobTitle: employee.jobTitle, email: employee.email, joinDate: employee.joinDate,
        nameAr: employee.nameAr, nameEn: employee.nameEn, photo: employee.photo || '',
        encouragement: encouragementSettings(workspace, employee.branchId),
        profile: { phone: employee.phone, birthDate: employee.birthDate, nationality: employee.nationality,
          gender: employee.gender, identityNumber: employee.identityNumber, residencyExpiryDate:employee.residencyExpiryDate, address: employee.address,
          salary: employee.salary ? { monthlyBase: employee.salary.monthlyBase,
            monthlyAllowances: employee.salary.monthlyAllowances, monthlyOtherAllowances: employee.salary.monthlyOtherAllowances, currency: employee.salary.currency } : null },
        leaveBalance: (() => {
          const requests = workspace.requests.map(item => ({ ...item, status: requestStatus(item, now) }));
          const balance = annualLeaveBalance(employee, today, requests, workspace.leavePreferences);
          if (!balance) return null;
          return { ...balance, available: balance.available === null ? null :
            balance.available - annualLeaveRequired(requests, employee.id, today, {}) };
        })(),
        ownLeaveRequests: ownRequests.filter(item => workspace.leaveTypes.includes(item.type))
          .map(item => ({ id: item.id, type: item.type, date: item.date, end: item.end ?? item.date, status: requestStatus(item, now) })),
        cancellableLeaves: requestCancellableLeaves(workspace,employee,today,now),
        pushPublicKey,
        attendanceReminders: visibleAttendanceReminders(workspace,employee,now),
        manager: workspace.staff.find(person => person.id === employee.managerId && person.status !== 'Removed')?.name,
        recentPunches: workspace.punches.filter(entry => entry.staffId === employee.id).slice(-15).reverse()
          .map(({ kind, time }) => ({ kind, time })),
        shiftStartsAt, shiftEndsAt, scheduledPeriods, punchWindows, openShiftStart: openPunchShift(punchWindows, openPunch), serverNow: now,
        timeFormat: workspace.timeFormat,
        flexibleDay: scheduledPeriods.some(period => period.flexible) || Boolean(openPunch?.flexible),
        flexibleCompletedMilliseconds: flexibleTotals.completedMilliseconds,
        flexibleActiveSince: flexibleTotals.activeSince,
        flexibleActiveUntil: flexibleTotals.activeUntil,
        flexibleRequiredMinutes: scheduledPeriods.filter(period => period.flexible).reduce((total, period) => total + (period.duration ?? 0), 0),
        lastFlexiblePunch: openPunch?.flexible ? { kind: openPunch.kind, time: openPunch.time, shiftEnd: openPunch.shiftEnd, flexible: true } : null,
        punchedInAt: pendingPunch ? lastPunch.time : null,
        punchedOutToday: lastPunch?.kind === 'out' && lastPunch.date === today && (!shift || Date.parse(lastPunch.time) >= shift.start),
        documentAlerts:documentAlerts(workspace,today,employee),
        assignedTasks:hasAdministration(workspace,employee)?followUpItems(workspace,today,employee).filter(item=>item.assignment?.assigneeId===employee.id&&item.status!=='completed').map(({id,name,kind,expiresOn,dueOn,status,overdue,assignment})=>({id,name,kind,expiresOn,dueOn,status,overdue,version:assignment?.version??0})):[],
        canManageFollowUp:hasRolePermission(workspace,employee,'tasks'), canViewDocuments:Boolean(partner && hasRolePermission(workspace,employee,'documents')), ownRequestsTruncated:ownRequests.length>30, teamSummary,
        homeRequests, canReviewTeam: canReviewTeam(employee,workspace), canManageCompany,
        canSubmitForStaff:isAdministrator(employee,workspace), reviewerId: eligibleApprover(employee,workspace) ? employee.id : undefined, teamRequests, teamRequestHistory,
        ownRequests: ownRequests.slice(0, 30).map(request => displayRequest({ ...request, status: requestStatus(request, now) })),
        canReviewDeviceRequests: canReviewTeam(employee,workspace),
        ...deviceRequestInbox(workspace, employee),
        punchFromAnywhere: allowsAnywhere(workspace, employee),
        hasLocations: allowsAnywhere(workspace, employee) || punchLocations(workspace, employee.id).length > 0,
        nextPunch });
    }
    if(req.method==='GET'&&path==='/api/employee/follow-up/tickets'){
      if(!employee||!hasRolePermission(workspace,employee,'tasks'))return send(403,{error:'Follow-up centre permission is required.'});
      const branches=workspace.locations.filter(branch=>managesBranch(employee,branch.id)).map(({id,name})=>({id,name}));
      const assignees=item=>eligibleFollowUpAssignees(workspace,item,employee).map(p=>({id:p.id,name:p.nameAr||p.name,nameEn:p.nameEn||p.name}));
      const items=followUpItems(workspace,date(),employee);
      const itemId=url.searchParams.get('itemId');
      if(itemId){
        const item=items.find(candidate=>candidate.id===itemId);
        if(!item)return send(404,{error:'Follow-up item not found.'});
        const canReadComments=item.kind!=='document'||item.assignment?.assigneeId===employee.id;
        return send(200,{comments:canReadComments&&item.assignment?publicFollowUpRecords([item.assignment])[0].comments:[]});
      }
      const tickets=items.map(({id,number,name,branchId,kind,status,dueOn,overdue,autoCompleted,assignment,recurring})=>({
        id,number,name,branchId,kind,status,dueOn,overdue,recurring,canClose:!recurring||assignment?.assigneeId===employee.id,editable:!autoCompleted&&(kind!=='document'||assignment?.assigneeId===employee.id),
        assigneeId:assignment?.assigneeId??null,version:assignment?.version??0,
      }));
      return send(200,{tickets,branches:branches.map(branch=>({...branch,assignees:assignees({branchId:branch.id})})),today:date()});
    }
    if(req.method==='GET'&&path==='/api/employee/follow-up/options'){
      if(!employee||!hasRolePermission(workspace,employee,'tasks'))return send(403,{error:'Follow-up centre permission is required.'});
      const item=followUpItems(workspace,date(),employee).find(i=>i.id===url.searchParams.get('itemId'));
      if(!item||item.status==='completed')return send(404,{error:'Follow-up item is unavailable.'});
      const assignees=eligibleFollowUpAssignees(workspace,item,employee).map(p=>({id:p.id,name:p.nameAr||p.name,nameEn:p.nameEn||p.name}));
      return send(200,{itemId:item.id,name:item.name,status:item.status,assigneeId:item.assignment?.assigneeId??null,dueOn:item.dueOn??null,version:item.assignment?.version??0,assignees});
    }
    if (req.method === 'GET' && path === '/api/employee/calendar') {
      if (!employee) return send(401, { error: 'سجّل الدخول أولًا.' });
      const firstDay = (url.searchParams.get('month') ?? '') + '-01';
      if (!validDate(firstDay)) return send(400, { error: 'اختر شهرًا صحيحًا.' });
      return send(200, employeeCalendar(workspace, employee, firstDay, date(), Date.now()));
    }
    const canComposeForStaff = Boolean(signedIntoCompany || isAdministrator(employee,workspace));
    const delegatedApplicant = id => canComposeForStaff && workspace.staff.find(person=>
      person.id===id&&person.status==='Active'&&(signedIntoCompany||person.id===employee?.id||managesBranch(employee,person.branchId)));
    if (req.method === 'GET' && path === '/api/employee/request-applicants') {
      if (!canComposeForStaff) return send(403,{error:'Administrator access required.'});
      const id=url.searchParams.get('staffId');
      if (id!==null) {
        const person=delegatedApplicant(id);
        if(!person)return send(403,{error:'This action is outside your branch permissions.'});
        return send(200,{leaveTypes:activeLeaveTypes(workspace,person),attendanceTypes:requestAttendanceTypes(workspace,person),
          availablePeriods:requestPeriods(workspace,person),cancellableLeaves:requestCancellableLeaves(workspace,person,date(),Date.now())});
      }
      const self = employee ?? workspace.staff.find(person=>signedIntoCompany&&person.status==='Active'&&person.email?.toLowerCase()===partner?.email?.toLowerCase());
      const directory = branchId => workspace.staff.filter(person=>person.id!==self?.id&&person.status==='Active'&&(person.branchId??null)===branchId)
          .map(({id,name,nameAr,nameEn})=>({id,name,nameAr,nameEn})),
        branches=workspace.locations.filter(branch=>signedIntoCompany||managesBranch(employee,branch.id)).map(({id,name})=>({id,name,staff:directory(id)}));
      if(signedIntoCompany&&directory(null).length)branches.push({id:'',name:'بدون فرع',staff:directory(null)});
      return send(200,{self:self?{id:self.id,name:self.name,nameAr:self.nameAr,nameEn:self.nameEn}:null,branches});
    }
    if (req.method === 'GET' && path === '/api/employee/punches') {
      if (!employee && !signedIntoCompany) return send(401, { error: 'سجّل الدخول أولًا.' });
      const day = url.searchParams.get('date');
      if (!validDate(day) || day > date()) return send(400, { error: 'اختر تاريخًا صحيحًا.' });
      const id=url.searchParams.get('staffId');
      const person=id===null?employee:delegatedApplicant(id);
      if(!person)return send(403,{error:'This action is outside your branch permissions.'});
      const logs = workspace.punches.filter(entry => entry.staffId === person.id && entry.date === day);
      const recorded = entry => entry ? { time: entry.time, geofence: Boolean(entry.site) } : null;
      const periods=correctionPeriods(workspace,person,day).map(range=>{
        const punches=periodPunches(workspace,person,range);
        return {id:range.period.id,name:range.period.name,start:range.start,end:range.end,
          arrival:recorded(punches.find(entry=>entry.kind==='in')),
          departure:recorded(punches.findLast(entry=>entry.kind==='out')),
          inProgress:day===date() && Date.now()<range.end && punches.at(-1)?.kind==='in'};
      });
      return send(200, { arrival: recorded(logs.find(entry => entry.kind === 'in')),
        departure: recorded(logs.findLast(entry => entry.kind === 'out')),
        inProgress: day === date() && logs.at(-1)?.kind === 'in', periods,
        correctionLimitReached: reachedCorrectionMonthlyLimit(workspace,person,day) });
    }
    if (req.method !== 'POST' || !path.startsWith('/api/')) return send(404, { error: 'Page not found.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Expected JSON.' });
    let size = 0;
    const chunks = [];
    for await (const part of req) {
      size += part.length;
      if (size > (path === '/api/organization' ? organizationBodyLimit : path === '/api/documents' ? documentBodyLimit : path === '/api/documents/suggest' ? 160000 : ['/api/account/avatar','/api/employee/avatar'].includes(path) ? 700000 : ['/api/follow-up/create','/api/employee/follow-up/tickets'].includes(path) ? 6 * attachmentBodyLimit : ['/api/employee/requests', '/api/payroll', '/api/work-assignments', '/api/follow-up/update','/api/follow-up/choices'].includes(path) ? attachmentBodyLimit :
        path === '/api/issued-reports' ? 2 * 1024 * 1024 : path === '/api/encouragement-settings' ? 256 * 1024 : 8192)) {
        return send(413, { error: 'Request too large.' });
      }
      chunks.push(part);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return send(400, { error: 'Invalid request.' }); }
    if (partner && !partners.includes(partner)) {
      const current = partners.find(item => item.id === partner.id);
      if (!current) return send(404, { error: 'الشركة غير موجودة.' });
      if (current.suspended) return send(403, { error: 'تم إيقاف الوصول إلى حساب الشركة.' });
      return send(409, { error: 'تغيّرت بيانات الشركة. أعد المحاولة.' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'Invalid request.' });
    if (path === '/api/approval-queue') {
      if (!partner || !approvalActor) return send(403,{error:'Administrator access required.'});
      const jobs = [...(workspace.pendingApprovals ?? [])];
      if (body.operation === 'undo') {
        const index = jobs.findIndex(job=>job.id===body.id && job.actor===approvalActor);
        if (index < 0 || jobs[index].runAt !== null && jobs[index].runAt <= Date.now())
          return send(409,{error:'This request cannot be updated.'});
        jobs.splice(index,1);
        if (index === 0 && jobs.length) jobs[0] = {...jobs[0], runAt:Date.now()+approvalQueueDelay};
      } else if (body.operation === 'enqueue' && Array.isArray(body.ids) && body.ids.length > 0 && body.ids.length <= 150 &&
          body.ids.every(id=>typeof id==='string' && id.length<=100)) {
        try {
          for (const id of new Set(body.ids)) {
            if (jobs.some(job=>job.id===id)) continue;
            const request = workspace.requests.find(item=>item.id===id);
            demand(request && requestStatus(request)==='Pending','This request cannot be updated.');
            queuedDecisionReviewer(workspace,request,approvalActor);
            demand(jobs.length<500, 'Too many queued approvals.');
            jobs.push({id,actor:approvalActor,stage:request.approvalIndex??0,runAt:jobs.length ? null : Date.now()+approvalQueueDelay});
          }
        } catch (error) { return send(400,{error:error.message}); }
      } else return send(400,{error:'Invalid request.'});
      const next = {...workspace,pendingApprovals:jobs};
      await saveWorkspace(next);
      return send(200,approvalQueueSnapshot(next,approvalActor));
    }
    if (path === '/api/documents/suggest') {
      if (!partner || (!signedIntoCompany && !hasRolePermission(workspace,employee,'documents'))) {
        return send(403,{error:'Document wallet permission is required.'});
      }
      if (!documentAiProvider) return send(503,{error:'AI suggestions are unavailable.'});
      if (body.useAi !== true || typeof body.text !== 'string' || !body.text.trim() ||
        body.text.length > documentSuggestionTextLimit || !['ar','en'].includes(body.language)) {
        return send(400,{error:'Choose AI analysis and provide extracted document text.'});
      }
      // The provider does not read or mutate workspace state, so keep it outside the storage queue.
      void suggestDocument(body.text,body.language,{key:documentAiKey,model:documentAiModel,ollama:documentAiOllama}).then(
        suggestion => {if (!res.destroyed) send(200,suggestion);},
        () => {if (!res.destroyed) send(502,{error:'AI suggestions are unavailable.'});});
      return;
    }
    if(path==='/api/follow-up/choices'){
      const source=demo?.state??workspace,owner=signedIntoCompany||Boolean(demo)||(!partner&&!hostedDemo),viewer=owner?null:employee;
      if(!owner&&(!viewer||!hasRolePermission(source,viewer,'tasks')))return send(403,{error:'Follow-up centre permission is required.'});
      if(!Array.isArray(body.items)||!body.items.length||body.items.length>1000||body.items.some(i=>!i||typeof i.itemId!=='string'||!Number.isSafeInteger(i.expectedVersion))||new Set(body.items.map(i=>i.itemId)).size!==body.items.length)return send(400,{error:'Choose valid follow-ups.'});
      const visible=followUpItems(source,date(),viewer),items=body.items.map(entry=>visible.find(i=>i.id===entry.itemId));
      if(items.some(i=>!i))return send(404,{error:'Follow-up item is unavailable or outside your branch permissions.'});
      if(items.some((item,index)=>(item.assignment?.version??0)!==body.items[index].expectedVersion))return send(409,{error:'Follow-up changed. Refresh and try again.'});
      if(viewer&&items.some(i=>i.kind==='document'&&i.assignment?.assigneeId!==viewer.id))return send(403,{error:'Only the assigned administrator can update this company document follow-up.'});
      const choices=items.map(item=>new Set(eligibleFollowUpAssignees(source,item,viewer).map(p=>p.id)));
      const common=eligibleFollowUpAssignees(source,items[0],viewer).filter(person=>choices.every(set=>set.has(person.id)));
      return send(200,{assignees:common.map(p=>({id:p.id,name:p.nameAr||p.name,nameEn:p.nameEn||p.name,role:p.role})),canManage:true});
    }
    if (path === '/api/account/avatar' || path === '/api/employee/avatar') {
      const employeePhoto = path === '/api/employee/avatar';
      if (employeePhoto ? !employee : (!signedIntoCompany && !employee)) return send(401, { error: 'سجّل الدخول أولًا.' });
      const photo=body.photo;
      if(typeof photo!=='string' || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) return send(400,{error:'اختر صورة PNG أو JPG صالحة.'});
      const image=Buffer.from(photo.slice(photo.indexOf(',')+1),'base64');
      const signature=photo.startsWith('data:image/png;')?'89504e470d0a1a0a':'ffd8ff';
      if(image.length>500000 || image.subarray(0,signature.length/2).toString('hex')!==signature) return send(400,{error:'الصورة غير صالحة أو حجمها أكبر من المسموح.'});
      if(signedIntoCompany && !employeePhoto) await persistPlatform(partners.map(item=>item.id===partner.id?{...item,account:{...item.account,photo}}:item),platformProfile);
      else {const changed=structuredClone(workspace);changed.staff.find(person=>person.id===employee.id).photo=photo;await saveWorkspace(changed);}
      return send(200,{saved:true,photo});
    }
    if (path === '/api/account/password') {
      if (!signedIntoCompany) return send(403, { error: 'سجّل الدخول بحساب مسؤول الحساب أولًا.' });
      const { password, confirmation } = body;
      const account = partner.account;
      if (typeof password !== 'string' || password.length < 10 || password.length > 128 || password !== confirmation ||
          !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[\p{P}\p{S}]/u.test(password))
        return send(400, { error: 'Use 10–128 characters with uppercase, lowercase, a number and a symbol.' });
      const salt = secret();
      await persistPlatform(partners.map(item => item.id === partner.id ? { ...item,
        account: { ...account, salt, passwordHash: scryptSync(password, salt, 64).toString('hex') } } : item), platformProfile);
      return send(200, { saved: true });
    }
    if (path.startsWith('/api/employee/')) {
      if (!partner && workspace !== state) return send(409, { error: 'تغيّرت بيانات الحساب. أعد المحاولة.' });
      if (path === '/api/employee/invitation') {
        const person = invitedEmployee(workspace, body.token);
        return person
          ? send(200, { email: person.email, company: person.account.company ?? workspace.company })
          : send(400, { error: invalidInvitation });
      }
      const next = structuredClone(workspace);
      if (path === '/api/employee/team-decision') {
        if (!employee) return send(401, { error: 'سجّل الدخول أولًا.' });
        const request = next.requests.find(item => item.id === body.id);
        const person = next.staff.find(item => item.id === request?.staffId);
        if (!person || (branchManager && !managesBranch(branchManager, person.branchId)) ||
          (!request.approvalSteps && (!canReviewTeam(employee,workspace) || !isDirectReport(person, employee)))) {
          return send(403, { error: 'الطلب مخصص للمدير المباشر.' });
        }
        try { mutate(next, '/api/decision', body, employee.id, employee); }
        catch (error) { return send(400, { error: error.message }); }
        await saveWorkspace(next);
        if (request.status === 'Approved') void notifyApproval(person.account, companyPrefix, request.id);
        return send(200, { saved: true, forwarded: request.status === 'Pending' });
      }
      if (path === '/api/employee/native-push-token') {
        if (!employee) return send(401, { error: 'سجّل الدخول أولًا.' });
        if (!validExpoPushToken(body.token)) return send(400, { error: 'تعذّر تفعيل الإشعارات.' });
        for (const person of next.staff) if (person.account?.nativePushTokens) {
          person.account.nativePushTokens = person.account.nativePushTokens.filter(item => item.token !== body.token);
        }
        const account = next.staff.find(person => person.id === employee.id).account;
        account.nativePushTokens = [...(account.nativePushTokens ?? []), { token: body.token, language: body.language === 'en' ? 'en' : 'ar', sessionKey: sessionHash }].slice(-4);
        if (partner) {
          const updated = partners.map(company => {
            if (company.id === partner.id) return { ...company, workspace: next };
            if (!company.workspace?.staff.some(person => person.account?.nativePushTokens?.some(item => item.token === body.token))) return company;
            const cleaned = structuredClone(company);
            for (const person of cleaned.workspace.staff) if (person.account?.nativePushTokens) person.account.nativePushTokens = person.account.nativePushTokens.filter(item => item.token !== body.token);
            return cleaned;
          });
          await persistPlatform(updated, platformProfile);
        } else await saveWorkspace(next);
        return send(200, { saved: true });
      }
      if (path === '/api/employee/push-subscription') {
        if (!employee) return send(401, { error: 'سجّل الدخول أولًا.' });
        if (!pushPublicKey) return send(503, { error: 'الإشعارات غير متاحة حاليًا.' });
        const subscription = pushSubscription(body.subscription, body.language);
        if (!subscription) return send(400, { error: 'تعذّر تفعيل الإشعارات.' });
        for (const person of next.staff) {
          if (person.account?.pushSubscriptions) {
            person.account.pushSubscriptions = person.account.pushSubscriptions.filter(item => item.endpoint !== subscription.endpoint);
          }
        }
        const account = next.staff.find(person => person.id === employee.id).account;
        account.pushSubscriptions = [...(account.pushSubscriptions ?? []), subscription].slice(-4);
        await saveWorkspace(next);
        return send(200, { saved: true });
      }
      if (path === '/api/employee/logout') {
        if (employee) {
          const account = next.staff.find(person => person.id === employee.id).account;
          if (account.nativePushTokens) account.nativePushTokens = account.nativePushTokens.filter(item => item.token !== body.nativePushToken && item.sessionKey !== sessionHash);
          if (account.pushSubscriptions) {
            account.pushSubscriptions = account.pushSubscriptions.filter(item => item.endpoint !== body.pushEndpoint);
          }
          if (account.managerSessions?.includes(sessionHash)) {
            account.managerSessions = account.managerSessions.filter(key => key !== sessionHash);
          } else {
            account.sessionHash = null;
          }
          await saveWorkspace(next);
        }
        cookie = employeeSessionCookie('', companyPrefix);
        return send(200, { signedOut: true });
      }
      if (path === '/api/employee/password') {
        if (!employee) return send(401, { error: 'سجّل الدخول أولًا.' });
        const { password, confirmation } = body;
        const account = next.staff.find(person => person.id === employee.id).account;
        if (typeof password !== 'string' || password.length < 10 || password.length > 128 || password !== confirmation ||
          !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[\p{P}\p{S}]/u.test(password)) {
          return send(400, { error: 'استخدم 10 أحرف على الأقل مع حرف كبير وحرف صغير ورقم ورمز، وتأكد من التطابق.' });
        }
        const credential = secret(), salt = secret();
        account.salt = salt;
        account.passwordHash = scryptSync(password, salt, 64).toString('hex');
        delete account.pendingBrowser;
        delete account.pendingDevice;
        delete account.requestedAt;
        delete account.requestedOn;
        const age = signedInSessionAge;
        if (canUseMultipleDevices(next,employee)) {
          account.managerSessions = [];
          addManagerSession(account, hash(credential), age);
          delete account.sessionHash;
          delete account.employeeSessionExpires;
        } else {
          account.sessionHash = hash(credential);
          account.employeeSessionExpires = Date.now() + age * 1000;
          delete account.managerSessions;
          delete account.managerSessionExpirations;
        }
        await saveWorkspace(next);
        cookie = employeeSessionCookie(credential, companyPrefix, age);
        return send(200, { saved: true });
      }
      if (path === '/api/employee/activate') {
        const person = invitedEmployee(next, body.token);
        if (!person) return send(400, { error: invalidInvitation });
        const { password, confirmation } = body;
        if (typeof password !== 'string' || password.length < 10 || password.length > 128 ||
            !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[\p{P}\p{S}]/u.test(password))
          return send(400, { error: 'استخدم من 10 إلى 128 حرفًا، مع حرف إنجليزي كبير وحرف صغير ورقم ورمز.' });
        if (password !== confirmation) return send(400, { error: 'كلمتا المرور غير متطابقتين.' });
        const salt = secret();
        person.account = { salt, passwordHash: scryptSync(body.password, salt, 64).toString('hex') };
        person.status = 'Active';
        await saveWorkspace(next);
        return send(200, { activated: true });
      }
      if (path === '/api/employee/login') {
        const person = next.staff.find(item => item.status === 'Active' && item.email === string(body.email).toLowerCase() && item.account?.passwordHash);
        if (typeof body.password !== 'string' || body.password.length > 128) return send(401, { error: 'بيانات الدخول غير صحيحة.' });
        const supplied = scryptSync(body.password, person?.account.salt ?? 'invalid-employee', 64);
        if (!person || !timingSafeEqual(supplied, Buffer.from(person.account.passwordHash, 'hex')))
          return send(401, { error: 'بيانات الدخول غير صحيحة.' });
        const age = signedInSessionAge;
        if (canUseMultipleDevices(next,person)) {
          const credential = secret();
          addManagerSession(person.account, hash(credential), age, sessionHash);
          for(const key of ['pendingBrowser','pendingDevice','requestedAt','requestedOn','pendingApprovalSteps','pendingApprovalIndex','pendingApprovalHistory'])delete person.account[key];
          await saveWorkspace(next);
          cookie = employeeSessionCookie(credential, companyPrefix, age);
          return send(200, { approved: true });
        }
        if (!person.account.browser || (browser && person.account.browser === browser)) {
          const credential = secret();
          const newBinding = !person.account.browser;
          if (newBinding) person.account.browser = hash(credential);
          person.account.browserDevice ??= deviceLabel(req);
          const sessionCredential = secret();
          person.account.sessionHash = hash(sessionCredential);
          person.account.employeeSessionExpires = Date.now() + age * 1000;
          await saveWorkspace(next);
          cookie = employeeSessionCookie(sessionCredential, companyPrefix, age);
          if (newBinding) cookie = [employeeCookie(credential, companyPrefix), cookie];
          return send(200, { approved: true });
        }
        if (!body.requestChange) return send(403, { changeRequired: true });
        if(autoApprovesOwnRequests(next,person)){
          const now=new Date().toISOString(),requestId=randomUUID(),credential=secret(),sessionCredential=secret();
          (next.browserRequestHistory??=[]).push({staffId:person.id,requestId,name:person.nameAr||person.name,submittedOn:date(),status:'Approved',approverId:'system',autoApproved:true,autoApprovalReason:'administrator-without-direct-manager',decidedAt:now,approvalHistory:[{approverId:'system',status:'Approved',at:now}]});
          person.account.browser=hash(credential);person.account.browserDevice=deviceLabel(req);
          for(const key of ['pendingBrowser','pendingDevice','requestedAt','requestedOn','pendingApprovalSteps','pendingApprovalIndex','pendingApprovalHistory','managerSessions','managerSessionExpirations','pushSubscriptions'])delete person.account[key];
          person.account.sessionHash=hash(sessionCredential);person.account.employeeSessionExpires=Date.now()+age*1000;
          person.account.lastDeviceDecision={decision:'approve',at:now,by:'system'};
          await saveWorkspace(next);cookie=[employeeCookie(credential,companyPrefix),employeeSessionCookie(sessionCredential,companyPrefix,age)];
          return send(200,{approved:true,autoApproved:true});
        }
        let browserSteps;
        try{browserSteps=requestApprovalSteps(next,browserChangeType,person.id);beginBrowserApproval(next,person,browserSteps);}
        catch(error){return send(409,{error:error.message});}
        if (browser && person.account.pendingBrowser === browser) return send(202, { pending: true });
        const credential = secret();
        person.account.pendingBrowser = hash(credential);
        person.account.pendingDevice = deviceLabel(req);
        person.account.requestedAt = randomUUID();
        person.account.requestedOn = date();
        await saveWorkspace(next);
        cookie = employeeCookie(credential, companyPrefix);
        return send(202, { pending: true });
      }
      if(path==='/api/employee/follow-up/tickets'){
        if(!employee||!hasRolePermission(workspace,employee,'tasks'))return send(403,{error:'Follow-up centre permission is required.'});
        if(body.operation==='delete'){
          const status=deleteFollowUpTicket(next,body,employee,date());
          if(status!==200)return send(status,{error:followUpDeleteError[status]});
          await saveWorkspace(next);
          return send(200,{saved:true});
        }
        let record;
        try{
          if(body.operation==='create')record=createFollowUpTicket(next,body,employee,date());
          else if(body.operation==='details'&&Number.isSafeInteger(body.expectedVersion))record=updateFollowUp(next,body,employee,date());
          else return send(400,{error:'Choose a valid follow-up operation.'});
        }catch(error){return send(400,{error:error.message});}
        await saveWorkspace(next);
        void notifyFollowUpAssignments(workspace,next);
        return send(200,{saved:true,number:record.snapshot.number});
      }
      if(path==='/api/employee/follow-up/update'){
        if(!employee||!hasRolePermission(workspace,employee,'tasks'))return send(403,{error:'Follow-up centre permission is required.'});
        const item=followUpItems(next,date(),employee).find(i=>i.id===body.itemId);
        if(!item||!['completed',item.status].includes(body.status))return send(400,{error:'Receive the task before starting it.'});
        try{updateFollowUp(next,{itemId:body.itemId,expectedVersion:body.expectedVersion,operation:'details',assigneeId:body.assigneeId,status:body.status,dueOn:item.dueOn??null},employee,date());}catch(error){return send(400,{error:error.message});}
        await saveWorkspace(next);
        void notifyFollowUpAssignments(workspace,next);
        return send(200,{saved:true});
      }
      if(path==='/api/employee/follow-up/receive'){
        if(!employee)return send(401,{error:'Sign in first.'});
        try{receiveFollowUp(next,body,employee,date());}catch(error){return send(400,{error:error.message});}
        await saveWorkspace(next);return send(200,{saved:true});
      }
      if (path === '/api/employee/device-approval') {
        if (!employee && !signedIntoCompany) return send(401, { error: 'سجّل الدخول للموافقة على الطلب.' });
        const person = next.staff.find(item => item.id === body.staffId && item.account?.pendingBrowser &&
          item.account.requestedAt === body.requestId);
        if (!person || !['approve', 'reject'].includes(body.decision)) return send(400, { error: 'الطلب غير متاح.' });
        let browserDecision;
        try{browserDecision=decideBrowserApproval(next,person,employee,body.decision,signedIntoCompany);}
        catch(error){return send(403,{error:error.message});}
        if (branchManager && !managesBranch(branchManager, person.branchId))
          return send(403, { error: 'This action is outside your branch permissions.' });
        if (body.rejectionNote !== undefined && (typeof body.rejectionNote !== 'string' || body.rejectionNote.length > 2000))
          return send(400, { error: 'Enter notes up to 2000 characters.' });
        if(browserDecision.forwarded){await saveWorkspace(next);return send(200,{saved:true,forwarded:true});}
        if (body.decision === 'approve') {
          person.account.browser = person.account.pendingBrowser;
          person.account.browserDevice = person.account.pendingDevice;
          delete person.account.sessionHash;
        }
        delete person.account.pendingBrowser;
        delete person.account.pendingDevice;
        (next.browserRequestHistory ??= []).push({ staffId: person.id, requestId: body.requestId,
          approverId:browserDecision.approverId, approvalHistory:browserDecision.approvalHistory,
          ...(signedIntoCompany ? { decidedByOwner: true } : {}),
          name: person.nameAr || person.name, submittedOn: person.account.requestedOn,
          status: body.decision === 'approve' ? 'Approved' : 'Declined',
          ...(body.decision === 'reject' ? { rejectionNote: string(body.rejectionNote) } : {}) });
        for(const key of ['requestedOn','pendingApprovalSteps','pendingApprovalIndex','pendingApprovalHistory'])delete person.account[key];
        person.account.lastDeviceDecision = { decision: body.decision, at: new Date().toISOString() };
        const previousAccount = workspace.staff.find(item => item.id === person.id).account;
        if (body.decision === 'approve') delete person.account.pushSubscriptions;
        await saveWorkspace(next);
        if (body.decision === 'approve') void notifyApproval(previousAccount, companyPrefix, body.requestId);
        return send(200, { saved: true });
      }
      const action = { '/api/employee/punch': '/api/punch', '/api/employee/requests': '/api/requests' }[path];
      if (!action) return send(404, { error: 'Page not found.' });
      const delegated=action==='/api/requests'&&Object.hasOwn(body,'onBehalfOf');
      if (!employee && !(signedIntoCompany&&delegated)) return send(401, { error: 'يلزم استخدام المتصفح المعتمد.' });
      const applicant=delegated?delegatedApplicant(body.onBehalfOf):employee;
      if(!applicant)return send(403,{error:'This action is outside your branch permissions.'});
      try { mutate(next, action, { ...body, device: deviceLabel(req), deviceDetails:punchDeviceDetails(req) }, applicant.id,
        applicant.id===employee?.id||(!employee&&applicant.email?.toLowerCase()===partner?.email?.toLowerCase())?undefined:employee??{id:'account-owner'}); }
      catch (error) {
        if (!(error instanceof PunchRejected)) return send(400, { error: error.message });
        (next.rejectedPunchAttempts ??= []).push(error.attempt);
        await saveWorkspace(next);
        if (error.attempt.awaitingShiftReview) return send(200, {saved:true, outsideTimeWindow:true});
        return send(400, { error: error.message, attemptRecorded: true });
      }
      let showEncouragement;
      if (action === '/api/punch') showEncouragement = false;
      if (action === '/api/punch' && encouragementSettings(next, employee.branchId).enabled) {
        const person = next.staff.find(item => item.id === employee.id);
        const today = next.punches.at(-1).date;
        const account = person.account ??= {};
        const shownOn = account.encouragementShownOn ?? (account.encouragementWeek?.shownDates?.includes(today) ? today : null);
        const decision = dailyGreetingDecision(shownOn, today);
        account.encouragementShownOn = decision.shownOn;
        showEncouragement = decision.show;
      }
      await saveWorkspace(next);
      return send(200, { saved: true, ...(showEncouragement === undefined ? {} : { showEncouragement }) });
    }
    const source = demo?.state ?? workspace;
    const compactPreference = path === '/api/request-preferences' && body.compact === true;
    // The compact mutation replaces the affected settings maps without editing their original values.
    const next = compactPreference ? {...source} : structuredClone(source);
    const changesPermissionRole=['/api/staff','/api/staff/update'].includes(path)&&Object.hasOwn(body,'permissionRole');
    if(changesPermissionRole){
      if(!signedIntoCompany&&!canDistributePermissions(workspace,employee)&&partner)return send(403,{error:'Permission distribution access required.'});
      if(!workspace.staffRoles.includes(body.permissionRole))return send(400,{error:'Choose a valid permission role.'});
      const previous=workspace.staff.find(p=>p.id===body.staffId);
      if(path==='/api/staff/update'&&(!previous||body.expectedPermissionRole!==(previous.role??null)))return send(409,{error:'Employee role changed. Reload and try again.'});
      if(!signedIntoCompany&&partner&&(workspace.rolePermissions?.[body.permissionRole]?.managePermissions||workspace.rolePermissions?.[previous?.role]?.managePermissions)&&previous?.role!==body.permissionRole)return send(403,{error:'Only the account owner may assign a permission-distribution role.'});
    }
    if (branchManager) {
      try { authorizeBranchAction(workspace, branchManager, path, body); }
      catch (error) { return send(403, { error: error.message }); }
    }
    if (path === '/api/leave-balances/adjust') {
      if (!partner || (!signedIntoCompany && !branchManager)) return send(403, {error:'Employee editing permission is required.'});
      const person = next.staff.find(item => item.id === body.staffId && item.status !== 'Removed');
      const {operation, days, requestId} = body;
      const note = string(body.note).trim();
      const balance = person && annualLeaveBalance(person, date(), next.requests, next.leavePreferences);
      if (balance?.accrued == null || person.joinDate > date())
        return send(400, {error:'Set the employee contract and annual leave entitlement first.'});
      if (!['add', 'deduct'].includes(operation) || !Number.isFinite(days) || days <= 0 || days > 99999 ||
          Math.abs(days * 100 - Math.round(days * 100)) > 1e-7 || !note || note.length > 1000 ||
          typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId))
        return send(400, {error:'Enter a valid number of days and a note up to 1000 characters.'});
      const entries = person.leaveBalanceAdjustments ??= [];
      const delta = operation === 'add' ? days : -days;
      const actor = signedIntoCompany ? 'account-owner' : employee.id;
      const previous = entries.find(entry => entry.id === requestId);
      if (previous && (previous.days !== delta || previous.note !== note || previous.actor !== actor))
        return send(409, {error:'This adjustment was already submitted with different details.'});
      if (!previous) {
        entries.push({id:requestId, at:new Date().toISOString(), days:delta, note, actor});
        await saveWorkspace(next);
      }
      return send(200, {...publicState(visibleWorkspace(next)), admin, isCompanyOwner:Boolean(signedIntoCompany), canManageCompany});
    }
    if(path==='/api/follow-up/receive'){
      try{receiveFollowUp(next,body,employee,date());}catch(error){return send(400,{error:error.message});}
      if(demo)demo.state=next;else await saveWorkspace(next);
      return send(200,{...publicState(visibleWorkspace(next)),admin,isCompanyOwner:Boolean(signedIntoCompany),canManageCompany});
    }
    if(path==='/api/follow-up/create'){
      let ticket;
      try{ticket=createFollowUpTicket(next,body,branchManager,date());}catch(error){return send(400,{error:error.message});}
      if(demo)demo.state=next;else await saveWorkspace(next);
      if(!demo)void notifyFollowUpAssignments(workspace,next);
      return send(200,{...publicState(visibleWorkspace(next)),admin,isCompanyOwner:Boolean(signedIntoCompany),canManageCompany,ticketNumber:ticket.snapshot.number});
    }
    if(path==='/api/follow-up/delete'){
      const status=deleteFollowUpTicket(next,body,branchManager,date());
      if(status!==200)return send(status,{error:followUpDeleteError[status]});
      if(demo)demo.state=next;else await saveWorkspace(next);
      return send(200,{...publicState(visibleWorkspace(next)),admin,isCompanyOwner:Boolean(signedIntoCompany),canManageCompany});
    }
    if(path==='/api/staff/enrich'){
      let patch;
      try{
        patch=enrichmentPatch(next.staff,body);
        if(branchManager)authorizeBranchAction(workspace,branchManager,'/api/staff/update',patch);
        mutate(next,'/api/staff/update',patch);
      }catch(error){return send(400,{error:error.message});}
      const person=next.staff.find(p=>p.id===patch.staffId);
      person.enrichmentHistory=[...(person.enrichmentHistory??[]).slice(-99),{at:new Date().toISOString(),by:signedIntoCompany?'account-owner':employee?.id,fields:Object.keys(patch).filter(k=>k!=='staffId')}];
      if(demo)demo.state=next;else await saveWorkspace(next);
      return send(200,{updated:true,fields:Object.keys(patch).filter(k=>k!=='staffId')});
    }
    if(path==='/api/staff/recovery-link'){
      const person=next.staff.find(p=>p.id===body.staffId&&p.status==='Active'&&p.account?.passwordHash);
      if(!partner||!person)return send(400,{error:'The employee must activate their account first.'});
      const origin=invitationOrigin();if(!origin)return send(503,{error:'Configure the public invitation origin.'});
      const jobs=requestRecovery([{...partner,workspace:next}],{email:person.email,companyId:partner.id,kind:'employee',staffId:person.id},{origin});
      if(!jobs.length)return send(429,{error:'A recovery link was requested recently. Try again in five minutes.'});
      await saveWorkspace(next);
      const delivered=await deliverRecoveryMail(jobs[0]);
      if(!delivered)return send(503,{error:'Could not send the recovery email. Try again later.'});
      return send(200,{sent:true});
    }
    if(path==='/api/role-permissions'){
      if(!signedIntoCompany&&!canDistributePermissions(workspace,employee))return send(403,{error:'Permission distribution access required.'});
      if(!signedIntoCompany&&Object.hasOwn(body,'managePermissions'))return send(403,{error:'Only the account owner may grant or revoke permission distribution.'});
      try{updateRolePermissions(next,body);}catch(error){return send(400,{error:error.message});}
      next.rolePermissions[body.role].updatedBy=signedIntoCompany?'account-owner':employee.id;
      if(demo)demo.state=next;else await saveWorkspace(next);
      return send(200,{...publicState(visibleWorkspace(next)),admin,isCompanyOwner:Boolean(signedIntoCompany),canManageCompany});
    }
    if (path === '/api/setup-guide' && !signedIntoCompany) return send(403, { error: 'Account administrator access required.' });
    if (path === '/api/notification-settings') body.scopeUserId = branchManager?.id ?? null;
    if (path === '/api/notification-settings') body.scopeBranchId = body.key==='display' ? null : branchManager?.branchId ?? null;
    if (path === '/api/notification-preferences') body.scopeBranchId = branchManager?.branchId ?? null;
    if (path === '/api/attendance-report-settings') body.scopeBranchId = branchManager?.branchId ?? null;
    if (path === '/api/follow-up-mail-settings') body.scopeBranchId = branchManager?.branchId ?? null;
    if (path === '/api/official-holidays') body.scopeBranchId = branchManager?.branchId ?? null;
    if (path === '/api/request-preferences') body.scopeBranchId = branchManager?.branchId ?? null;
    if (compactPreference) {
      try { mutate(next,path,body); }
      catch (error) { return send(400,{error:error.message}); }
      const keys=['requestPreferences','branchRequestPreferences','requestContracts','branchRequestContracts',
        'correctionMonthlyLimit','branchCorrectionMonthlyLimits'];
      const changed=keys.some(key=>!isDeepStrictEqual(source[key],next[key]));
      const started=performance.now();
      if(changed) {
        if(demo)demo.state=next;
        else await saveWorkspace(next);
      }
      const timing=res.getHeader('Server-Timing');
      res.setHeader('Server-Timing',[timing,'persist;dur='+(performance.now()-started).toFixed(1)].filter(Boolean).join(', '));
      const preference={enabled:employeeRequestEnabled(next,{branchId:body.scopeBranchId},body.type)};
      if(Object.hasOwn(body,'contractTypes'))preference.contractTypes=requestContractTypes(next,body.type,body.scopeBranchId);
      if(Object.hasOwn(body,'correctionMonthlyLimit'))preference.correctionMonthlyLimit=correctionMonthlyLimit(next,body.scopeBranchId);
      return send(200,{preference});
    }
    if (path === '/api/encouragement-settings') body.scopeBranchId = branchManager?.branchId ?? null;
    if(['/api/follow-up/assign','/api/follow-up/assign-bulk','/api/follow-up/update'].includes(path)){
      try{(path.endsWith('/assign-bulk')?assignFollowUpBatch:path.endsWith('/assign')?assignFollowUp:updateFollowUp)(next,body,branchManager??null,date());}catch(error){return send(400,{error:error.message});}
      if(demo)demo.state=next;else await saveWorkspace(next);
      if(!demo)void notifyFollowUpAssignments(workspace,next);
      return send(200,{...publicState(visibleWorkspace(next)),admin,isCompanyOwner:Boolean(signedIntoCompany),canManageCompany});
    }
    if (path === '/api/payroll') {
      let payrollReportId;
      try { payrollReportId = mutatePayroll(next, body, { owner: signedIntoCompany || Boolean(demo) || (!partner && !hostedDemo), manager: branchManager }); }
      catch (error) { return send(400, { error: error.message }); }
      if (demo) demo.state = next; else await saveWorkspace(next);
      return send(200, { ...publicState(visibleWorkspace(next)), admin, isCompanyOwner: Boolean(signedIntoCompany), canManageCompany, payrollReportId });
    }
    const staffLink = path === '/api/staff/activation-link';
    if (!demo && !partner && path === '/api/staff/update' && workspace !== state) {
      return send(409, { error: 'تغيّرت بيانات الحساب. أعد المحاولة.' });
    }
    if (staffLink) {
      if (demo) return send(403, { error: 'Administrator access required.' });
      if (!partner && workspace !== state) return send(409, { error: 'تغيّرت بيانات الحساب. أعد المحاولة.' });
    } else {
      const companyApprover = signedIntoCompany && path === '/api/decision'
        ? next.staff.find(person => eligibleApprover(person,next) &&
          approvalStepMembers(next,next.requests.find(request => request.id === body.id) ?? {}).includes(person.id)) : employee;
      try { mutate(next, path, body, undefined, signedIntoCompany&&companyApprover?{...companyApprover,accountOwnerAction:true}:companyApprover,
        Boolean(branchManager && !hasRolePermission(workspace,branchManager,'staffSalary'))); }
      catch (error) { return send(400, { error: error.message }); }
      if(branchManager&&path==='/api/staff')next.staff.at(-1).role=next.staffRoles.includes('Employee')?'Employee':null;
      if(changesPermissionRole){
        const person=path==='/api/staff'?next.staff.at(-1):next.staff.find(p=>p.id===body.staffId),previous=workspace.staff.find(p=>p.id===person.id);
        if(previous?.role!==body.permissionRole){
          person.role=body.permissionRole;person.roleBranchIds={...person.roleBranchIds,[person.role]:person.branchId?[person.branchId]:[]};
          person.permissionRoleHistory=[...(person.permissionRoleHistory??[]).slice(-99),{at:new Date().toISOString(),by:signedIntoCompany?'account-owner':employee?.id,from:previous?.role??null,to:person.role}];
        }
      }
      if (branchManager && path === '/api/issued-reports') next.issuedReports[0].branchId = branchManager.branchId;
    }
    if (!demo && (staffLink || path === '/api/staff')) {
      const person = staffLink ? next.staff.find(item => item.id === body.staffId && item.status === 'Pending activation') : next.staff.at(-1);
      if (!person) return send(404, { error: invalidInvitation });
      const token = secret();
      const origin = invitationOrigin();
      if (!origin) return send(503, { error: 'Configure the public invitation origin.' });
      const url = new URL(companyPrefix + '/employee', origin);
      url.hash = 'activate=' + token;
      person.account = { activationHash: hash(token), activationExpires: Date.now() + 48 * 60 * 60 * 1000, company: next.company };
      await saveWorkspace(next);
      const invitation = staffLink&&body.send!==true ? { url: url.href } : await deliverInvitation({
        email: person.email, name: person.nameAr || person.name, url: url.href,
        introduction: 'أضافتك شركة ' + next.company + ' إلى برنامج دوامكم.',
      });
      if(invitation.delivery==='sent'&&recordActivationEmail(person.account,person.email))await saveWorkspace(next);
      const currentWorkspace = partner ? partners.find(item => item.id === partner.id)?.workspace : state;
      return send(200, { ...publicState(visibleWorkspace(currentWorkspace ?? next)), invitation: { ...invitation, staffId: person.id }, admin,
        isCompanyOwner: Boolean(signedIntoCompany), canManageCompany });
    }
    if (demo) {
      demo.state = next;
    } else {
      await saveWorkspace(next);
      if (path === '/api/decision' && body.status === 'Approved') {
        const request = next.requests.find(item => item.id === body.id);
        const recipient = next.staff.find(person => person.id === request.staffId && person.status === 'Active');
        if (request.status === 'Approved') void notifyApproval(recipient?.account, companyPrefix, request.id);
      }
    }
    return send(200, { ...publicState(visibleWorkspace(next)), admin, isCompanyOwner: Boolean(signedIntoCompany), canManageCompany });
  } catch (error) {
    if (storageConflict(error)) return send(409, { error: 'تغيّرت البيانات أثناء الحفظ. أعد المحاولة.' });
    console.error(error);
    return send(500, { error: 'Dawamak could not complete the action.' });
  }
}
let requestQueue = Promise.resolve();
const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  res.setHeader('X-Dawamkom-Mode', runtime.mode);
  if (!runtime.permits(req.method, path)) {
    res.writeHead(503, {'Content-Type': path.startsWith('/api/') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8', 'Retry-After':'60', 'Cache-Control':'no-store'});
    return res.end(path.startsWith('/api/') ? JSON.stringify({error:'الخدمة متوقفة مؤقتًا للتحديث. حاول لاحقًا.'}) :
      '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دوامكم</title><main style="font:20px system-ui;max-width:600px;margin:15vh auto;padding:24px"><h1>دوامكم</h1><p>يجري تحديث الخدمة. سنعود قريبًا، شكرًا لتفهمك.</p></main></html>');
  }
  if (path === '/health' || path === '/api/version' || files.has(path) && !['/', '/demo', '/super-admin'].includes(path)) {
    return handleRequest(req, res);
  }
  // Read the latest snapshot and keep each read/modify/write sequence together within this process.
  const measure = req.method === 'POST' && path.endsWith('/api/request-preferences');
  const queuedAt = performance.now();
  requestQueue = requestQueue.then(async () => {
    if (res.destroyed && !(req.method==='POST' && path.endsWith('/api/approval-queue'))) return;
    const started = performance.now();
    if (storage) applyStorage(await storage.read());
    if(measure)res.setHeader('Server-Timing','queue;dur='+(started-queuedAt).toFixed(1)+
      ', storage;dur='+(performance.now()-started).toFixed(1));
    await handleRequest(req, res);
  }).catch(error => {
    console.error('Dawamkom storage request failed:', error.name);
    if (res.headersSent) return res.destroy();
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'تعذّر الوصول إلى البيانات. حاول مرة أخرى.' }));
  });
});
const port = Number(process.env.DAWAMAK_PORT || process.env.PORT || 4173);
server.listen(port, host, () => console.log('Dawamak is listening on port ' + server.address().port));

let processingApprovals = false;
function runApprovalQueue() {
  if (!runtime.writes || processingApprovals || !partners.some(company=>!company.suspended &&
      company.account?.passwordHash && Number.isFinite(company.workspace?.pendingApprovals?.[0]?.runAt) &&
      company.workspace.pendingApprovals[0].runAt <= Date.now())) return;
  processingApprovals = true;
  requestQueue = requestQueue.then(async () => {
    if (storage) applyStorage(await storage.read());
    const nextPartners = [...partners];
    const notifications = [];
    let changed = false;
    for (const [index,company] of partners.entries()) {
      const [job,...rest] = company.workspace?.pendingApprovals ?? [];
      if (!job || job.runAt > Date.now() || company.suspended || !company.account?.passwordHash) continue;
      let workspace = structuredClone(company.workspace);
      try {
        const request = workspace.requests.find(item=>item.id===job.id);
        demand(request && requestStatus(request)==='Pending' && (request.approvalIndex??0)===job.stage,'This request cannot be updated.');
        const reviewer = queuedDecisionReviewer(workspace,request,job.actor);
        mutate(workspace,'/api/decision',{id:job.id,status:'Approved'},undefined,reviewer);
        if (request.status === 'Approved') {
          const recipient = workspace.staff.find(person=>person.id===request.staffId && person.status==='Active');
          if (recipient?.account) notifications.push({account:recipient.account,prefix:'/company/'+company.id,id:request.id});
        }
      } catch (error) {
        workspace = {...company.workspace, approvalQueueFailures:[...(company.workspace.approvalQueueFailures ?? []).slice(-49),
          {id:job.id,actor:job.actor,error:error.message,at:Date.now()}]};
      }
      if (rest.length) rest[0] = {...rest[0],runAt:Date.now()+approvalQueueDelay};
      workspace.pendingApprovals = rest;
      nextPartners[index] = {...company,workspace};
      changed = true;
    }
    if (changed) {
      await persistPlatform(nextPartners,platformProfile);
      for (const {account,prefix,id} of notifications) void notifyApproval(account,prefix,id);
    }
  }).catch(error=>console.error('Approval queue unavailable:',error.name))
    .finally(()=>{processingApprovals=false;});
}
setInterval(runApprovalQueue,500).unref();

let reminderTickRunning = false;
async function runAttendanceReminders() {
  if (!runtime.background || reminderTickRunning) return;
  reminderTickRunning = true;
  requestQueue = requestQueue.then(async () => {
    if (storage) applyStorage(await storage.read());
    const now = Date.now();
    const nextPartners = structuredClone(partners);
    const jobs = [];
    const recurringMail = [];
    const previousCompanies=new Map(partners.map(company=>[company.id,company.workspace]));
    let recurringChanged=false;
    for (const company of nextPartners) {
      if (company.suspended || !company.account?.passwordHash || !company.workspace) continue;
      if(materializeRecurringFollowUps(company.workspace,date())){
        recurringChanged=true;
        recurringMail.push(company);
      }
      for (const event of attendanceReminders(company.workspace, now)) {
        const person = company.workspace.staff.find(person => person.id === event.staffId);
        recordAttendanceReminder(person, event, now);
        jobs.push({account: person.account, prefix: '/company/' + company.id, event});
      }
    }
    if (!jobs.length && !recurringChanged) return;
    await persistPlatform(nextPartners, platformProfile);
    for(const company of recurringMail)void notifyFollowUpAssignments(previousCompanies.get(company.id),company.workspace);
    // Only send after the S3 conditional write succeeds. No duplicate push after a restart or write conflict.
    for (const job of jobs) void notifyAttendance(job.account, job.prefix, job.event);
  }).catch(error => { console.error('Attendance reminder cycle unavailable:', error.name); })
    .finally(() => { reminderTickRunning = false; });
}
setInterval(runAttendanceReminders, 30000).unref();


async function deliverMonthlyEmployeeMail(message) {
  if (!runtime.delivery) return {sent:false,error:'DeliveryDisabled'};
  if (process.env.DAWAMAK_SES_FROM) {
    let client;
    try {
      const {SESv2Client, SendEmailCommand} = await import('@aws-sdk/client-sesv2');
      client = new SESv2Client({region:process.env.DAWAMAK_SES_REGION || 'us-east-1',maxAttempts:1});
      const result = await client.send(new SendEmailCommand({FromEmailAddress:process.env.DAWAMAK_SES_FROM,
        Destination:{ToAddresses:[message.to]},Content:{Simple:{Subject:{Charset:'UTF-8',Data:message.subject},
          Body:{Text:{Charset:'UTF-8',Data:message.text},...(message.html?{Html:{Charset:'UTF-8',Data:message.html}}:{})}}}}),{abortSignal:AbortSignal.timeout(10000)});
      return {sent:true,messageId:result.MessageId};
    } catch(error) {
      return {sent:false,error:error.name,uncertain: ['TimeoutError','AbortError','RequestTimeout','NetworkingError'].includes(error.name) ||
        error.$metadata?.httpStatusCode >= 500};
    } finally {client?.destroy();}
  }
  try {
    const response=await fetch(process.env.DAWAMAK_MAIL_WEBHOOK,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+(process.env.DAWAMAK_MAIL_TOKEN??'')},
      body:JSON.stringify({to:message.to,subject:message.subject,text:message.text,...(message.html?{html:message.html}:{})})});
    return {sent:response.ok,uncertain:response.status>=500,error:response.ok?undefined:'HTTP '+response.status};
  } catch(error) {return {sent:false,uncertain:true,error:error.name};}
}
let monthlyMailRunning=false;
async function runMonthlyEmployeeMail() {
  if(!runtime.background || monthlyMailRunning) return;
  monthlyMailRunning=true;
  try {
    const claimed=requestQueue.then(async()=>{
      if(storage) applyStorage(await storage.read());
      const next=structuredClone(partners);
      const configured=Boolean(process.env.DAWAMAK_PUBLIC_ORIGIN && (process.env.DAWAMAK_SES_FROM || process.env.DAWAMAK_MAIL_WEBHOOK));
      const now=Date.now(),legacy=claimMonthlyMessages(next,now,configured?5:0),summary=claimAttendanceSummaryMessages(next,now,configured?Math.max(0,5-legacy.jobs.length):0);
      const result={jobs:[...legacy.jobs,...summary.jobs],changed:legacy.changed||summary.changed};
      if(result.changed) await persistPlatform(next,platformProfile);
      return result.jobs;
    });
    requestQueue=claimed.then(()=>{},error=>console.error('Monthly report claim unavailable:',error.name));
    for(const job of await claimed) {
      const outcome=await deliverMonthlyEmployeeMail(job);
      const completed=requestQueue.then(async()=>{
        if(storage) applyStorage(await storage.read());
        const next=structuredClone(partners);
        if((job.summaryReport?finishAttendanceSummaryMessage:finishMonthlyMessage)(next,job,outcome,Date.now())) await persistPlatform(next,platformProfile);
      });
      requestQueue=completed.catch(error=>console.error('Monthly report receipt unavailable:',error.name));
      await completed;
      if(!outcome.sent) console.error('Monthly employee report not delivered:',outcome.error);
      // Respect the current SES sandbox sending rate; do not hold the application write queue while waiting.
      await new Promise(resolve=>setTimeout(resolve,1100));
    }
  } catch(error) {console.error('Monthly employee report cycle unavailable:',error.name);}
  finally {monthlyMailRunning=false;}
}
setTimeout(runMonthlyEmployeeMail,5000).unref();
setInterval(runMonthlyEmployeeMail,60000).unref();

async function updateOfficialHolidayDates(){
  if(!runtime.background)return;
  const year=Number(date().slice(0,4));
  for(const y of [year,year+1])try{await refreshHolidayCalendar(y);}catch(error){console.error('Holiday calendar refresh unavailable:',error.name);}
}
setTimeout(updateOfficialHolidayDates,1000).unref();
setInterval(updateOfficialHolidayDates,86400000).unref();
