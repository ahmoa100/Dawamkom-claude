import { managesBranch, roleBranches } from './public/branch-roles.js';
import { randomUUID } from 'node:crypto';
import { bankPayrollRows } from './public/bank-payroll.js';
import { payrollBanks, payrollCategories, payrollEntries, payrollExportEntries, payrollMoney, payrollMonthBounds, payrollReportRows, gosiRates } from './public/payroll-model.js';
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export function mutatePayroll(workspace, body, { owner, manager, now = new Date().toISOString() }) {
  const {month, operation} = body;
  const bounds = payrollMonthBounds(month);
  requireValue(month <= new Date(Date.parse(now) + 3*60*60*1000).toISOString().slice(0,7), 'Future payroll months cannot be prepared.');
  requireValue(['prepare','salary','payment','adjustment','edit-adjustment','remove-adjustment','approve','export','bank'].includes(operation), 'Invalid payroll action.');
  const runs = workspace.payrollRuns ??= [];
  let run = runs.find(item => item.month === month);
  if (!run) { run = {id:randomUUID(),month,status:'Draft',createdAt:now,entries:payrollEntries(workspace,month)}; runs.push(run); }
  const permitted = entry => owner || (managesBranch(manager ?? {}, entry.branchId) && workspace.staff.some(person => person.id === entry.staffId && managesBranch(manager, person.branchId)));
  requireValue(owner || roleBranches(manager ?? {}).length, 'This action is outside your branch permissions.');
  if (run.status !== 'Approved') run.entries=payrollEntries(workspace,month);
  if (operation === 'prepare') {
    if (run.status !== 'Approved') {
      const ids = new Set(run.entries.map(entry => entry.staffId));
      const additional = payrollEntries({ ...workspace, payrollRuns: [] }, month).filter(entry => !ids.has(entry.staffId));
      if (additional.length) { run.entries.push(...additional); run.version=(run.version??0)+1; }
    }
    return;
  }
  if (operation === 'bank') {
    const bank = payrollBanks.find(item => item[0] === body.bankId);
    requireValue(bank, 'Choose Saudi National Bank or Bank AlJazira.');
    const selected = {id:bank[0],name:bank[1],nameEn:bank[2]};
    if (owner) run.bank=selected; else run.banks={...run.banks,[manager.branchId]:selected};
    return;
  }
  if (operation === 'export') {
    requireValue(['xlsx','pdf','csv'].includes(body.format) && ['ar','en'].includes(body.language), 'Invalid report data.');
    const branchId = body.branchId;
    if (branchId != null) {
      requireValue(typeof branchId === 'string' && (owner || managesBranch(manager, branchId)), 'This action is outside your branch permissions.');
    }
    const bank = !owner && run.banks?.[manager.branchId] || run.bank;
    requireValue(bank, 'Choose a bank.');
    const template=body.bankTemplate===true||(body.format==='csv'&&bank.id==='snb');
    const entries = payrollExportEntries(run.entries.filter(entry => permitted(entry) && (branchId == null || entry.branchId === branchId)), workspace.staff, {bankTemplate:template});
    requireValue(entries.length, template ? 'لا يوجد موظفون مؤهلون للتصدير البنكي بعد استثناء تمهير.' : 'No employees in this payroll.');
    requireValue(!entries.some(entry=>entry.insuranceNeedsSetup),'Complete GOSI classification and contribution base before exporting payroll.');
    const title = (body.language === 'ar' ? 'كشف الرواتب' : 'Payroll statement') + ' — ' + month +
      (run.status === 'Approved' ? '' : body.language === 'ar' ? ' (مسودة)' : ' (Draft)');
    const report = {id:randomUUID(),createdAt:now,type:'payroll',title,company:workspace.company,bank,format:template?(bank.id==='snb'&&body.format==='csv'?'csv':'xlsx'):body.format,language:body.language,
      ...bounds,bankTemplate:template,rows:template?bankPayrollRows(entries,bank.id,month):payrollReportRows(entries,body.language),
      ...(owner?{}:{branchId:branchId??manager.branchId,branchIds:[...new Set(entries.flatMap(entry=>[
        entry.branchId,workspace.staff.find(person=>person.id===entry.staffId)?.branchId,
      ]))]})};
    (workspace.issuedReports ??= []).unshift(report); return report.id;
  }
  const paymentEntry = operation==='payment' && run.entries.find(item=>item.staffId===body.staffId);
  if (operation === 'payment') {
    requireValue(paymentEntry && permitted(paymentEntry),'This action is outside your branch permissions.');
    requireValue(body.expectedVersion===(run.version??0),'Payroll changed. Review it again before editing.');
    const payment={};
    for(const key of ['account','identity','bankCode','address']) {
      requireValue(typeof body[key]==='string'&&body[key].length<=120,'Enter valid payment details.');
      payment[key]=body[key].trim();
    }
    payment.bankCode=payment.bankCode.toUpperCase();
    paymentEntry.payment={...payment,updatedAt:now};
    const person=workspace.staff.find(item=>item.id===paymentEntry.staffId);
    if(person) person.bankPayment={...payment};

    run.version=(run.version??0)+1; return;
  }
  requireValue(run.status !== 'Approved', 'Approved payroll is locked.');
  if (operation === 'approve') {
    requireValue(owner, 'Only the account administrator can approve payroll.');
    requireValue(run.entries.length, 'No employees in this payroll.');
    requireValue(body.expectedVersion === (run.version ?? 0), 'Payroll changed. Review it again before approving.');
    requireValue(!run.entries.some(entry=>entry.insuranceNeedsSetup),'Complete GOSI classification and contribution base before approving payroll.');
    run.status='Approved'; run.approvedAt=now; run.approvedBy='account-administrator'; run.version=(run.version??0)+1; return;
  }
  requireValue(body.expectedVersion === (run.version ?? 0), 'Payroll changed. Review it again before editing.');
  const entry = run.entries.find(item => item.staffId === body.staffId);
  requireValue(entry && permitted(entry), 'This action is outside your branch permissions.');
  if (operation === 'salary') {
    if (body.insuranceScheme !== undefined) {
      requireValue(['manual','old','new','none'].includes(body.insuranceScheme) && typeof body.insuranceSaned === 'boolean','Choose valid insurance settings.');
      if (body.insuranceScheme !== 'manual') {
        requireValue(body.insuranceBase<=45000 && (!['old','new'].includes(body.insuranceScheme) || body.insuranceBase>0),'Choose valid insurance settings.');
        body.insuranceRate=gosiRates(body.insuranceScheme,month,body.insuranceSaned).total;
      }
    }
    entry.insuranceOverride=true;
    entry.insuranceNeedsSetup=false;
    const fields=['base','housing','other','insuranceBase','insuranceRate','insuranceDays'];
    requireValue(fields.every(key=>typeof body[key]==='number' && Number.isFinite(body[key]) && body[key]>=0 && body[key]<=100000000) &&
      body.insuranceRate<=100 && Number.isInteger(body.insuranceDays) && body.insuranceDays<=30,'Enter valid payroll amounts and insurance settings.');
    for (const key of fields) entry[key]=payrollMoney(body[key]);
    if (body.insuranceScheme !== undefined) {
      entry.insuranceScheme=body.insuranceScheme;
      entry.insuranceSaned=body.insuranceSaned;
    } else entry.insuranceScheme='manual';
  } else if (operation === 'adjustment' || operation === 'edit-adjustment') {
    const existing=operation==='edit-adjustment' ? entry.adjustments.find(item=>item.id===body.adjustmentId && !item.removedAt) : null;
    if (operation==='edit-adjustment') {
      requireValue(existing,'Payroll adjustment not found.');
      requireValue(!existing.system,'Automatic payroll adjustments cannot be edited manually.');
    }
    const category=payrollCategories.find(item=>item[0]===(existing?.category??body.category));
    requireValue(category && typeof body.amount==='number' && Number.isFinite(body.amount) && body.amount>0 && body.amount<=100000000,'Enter a valid adjustment amount.');
    requireValue(typeof body.description==='string' && body.description.trim() && body.description.length<=1000,'Enter a description of up to 1000 characters.');
    const attachment=body.attachment;
    if (attachment) requireValue(typeof attachment.name==='string' && attachment.name.length<=180 &&
      ['image/png','image/jpeg','application/pdf'].includes(attachment.mime) && typeof attachment.data==='string' &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(attachment.data) && Buffer.from(attachment.data,'base64').length>0 && Buffer.from(attachment.data,'base64').length<=2*1024*1024,'Choose a PDF, PNG or JPEG up to 2 MB.');
    const actor=owner?'account-administrator':manager.id;
    const values={amount:payrollMoney(body.amount),description:body.description.trim(),
      ...(attachment?{attachment:{name:attachment.name,mime:attachment.mime,data:attachment.data}}:{})};
    if(existing) Object.assign(existing,values,{updatedAt:now,updatedBy:actor});
    else entry.adjustments.push({id:randomUUID(),category:category[0],kind:category[1],...values,createdAt:now,createdBy:actor});
  } else {
    const adjustment=entry.adjustments.find(item=>item.id===body.adjustmentId && !item.removedAt);
    requireValue(adjustment,'Payroll adjustment not found.');
    requireValue(!adjustment.system,'Automatic payroll adjustments cannot be removed manually.');
    adjustment.removedAt=now;
  }
  run.version=(run.version??0)+1; run.updatedAt=now;
}
export function publicPayrollRuns(runs=[]) {
  return runs.map(run=>({...run,entries:run.entries.map(entry=>({...entry,adjustments:entry.adjustments.map(({attachment,...item})=>
    ({...item,...(attachment?{attachment:{name:attachment.name,mime:attachment.mime}}:{})}))}))}));
}
