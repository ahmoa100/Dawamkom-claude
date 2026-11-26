import {dateText,dateFormatter} from './date-format.js';
import { normalizeSearch } from './ux-model.js';
import { readPageFilter, writePageFilter, actionError } from './ux.js';
import { payrollBanks, payrollCategories, payrollEntries, payrollExportEntries, payrollMonths, payrollTotals, payrollMonthBounds, payrollMoney, gosiRates } from './payroll-model.js';
let selectedEmployee = null;
const expandedPayrollGroups=new Set();
const payrollPreference=key=>location.pathname+':payroll:'+key;
const payrollBranch=state=>{
 const branch=readPageFilter(payrollPreference('branch'),'');
 return state.locations?.some(location=>location.id===branch)?branch:'';
};
const visiblePayrollEntries=(state,month)=>{
 const entries=payrollExportEntries(payrollEntries(state,month),state.staff,{bankTemplate:true}),branch=payrollBranch(state);
 return branch?entries.filter(entry=>entry.branchId===branch):entries;
};
const monthFromRoute = () => location.hash.match(/^#payroll\/(\d{4}-(?:0[1-9]|1[0-2]))$/)?.[1];
const labelFor = (category, language) => category[language === 'ar' ? 2 : 3];
const number = value => new Intl.NumberFormat('en', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(value);
const monthLabel = (month,language) => new Intl.DateTimeFormat(language==='ar'?'ar-SA-u-ca-gregory':'en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
export function payrollMarkup({state,language,esc}) {
 const ar=language==='ar', L=(a,b)=>ar?a:b, month=monthFromRoute();
 if(!month) {
  const monthStatusFilter = readPageFilter('payroll-month-status', 'all');
  const dateLabel=value=>dateFormatter(ar?'ar-SA-u-ca-gregory':'en',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
  const rows=payrollMonths(state).map(value=>{
   const run=state.payrollRuns?.find(item=>item.month===value), status=run?.status??'NotPrepared';
   const bounds=payrollMonthBounds(value);
   const total=run?payrollMoney(run.entries.reduce((sum,entry)=>sum+payrollTotals(entry).net,0)):null;
   const label=L(status==='Approved'?'معتمد':status==='Draft'?'تحت الإنشاء':'غير مُعد',status==='Approved'?'Approved':status==='Draft'?'Draft':'Not prepared');
   return '<tr tabindex="0" aria-label="'+esc(L('فتح مسير ','Open payroll for ')+monthLabel(value,language))+'" data-payroll-month-status="'+status+'"'+(monthStatusFilter!=='all'&&monthStatusFilter!==status?' hidden':'')+'><td><button type="button" class="period-name" data-open-payroll="'+value+'">'+esc(monthLabel(value,language))+'</button><small class="hint payroll-month-range"><bdi>'+esc(dateLabel(bounds.start))+'</bdi> — <bdi>'+esc(dateLabel(bounds.end))+'</bdi></small></td><td><span class="badge '+(status==='Approved'?'green':status==='Draft'?'amber':'')+'">'+label+'</span>'+(run?.approvedAt?'<small class="hint">'+L('بواسطة مسؤول الحساب','By the account administrator')+'</small>':'')+'</td><td>'+esc(run?.deductionDate?dateLabel(run.deductionDate):'—')+'</td><td><bdi>'+(total===null?'—':number(total))+'</bdi></td></tr>';
  }).join('');
  return '<h1>'+L('مسير الرواتب','Payroll')+'</h1><section class="card"><div class="payroll-heading"><h2>'+L('كل كشوف الرواتب','All payroll statements')+'</h2><label class="payroll-month-filter">'+L('المرشحات','Filters')+'<select id="payroll-month-status">'+[['all',L('كل الحالات','All statuses')],['NotPrepared',L('غير مُعد','Not prepared')],['Draft',L('تحت الإنشاء','Draft')],['Approved',L('معتمد','Approved')]].map(([key,label])=>'<option value="'+key+'"'+(readPageFilter('payroll-month-status','all')===key?' selected':'')+'>'+label+'</option>').join('')+'</select></label></div><div class="table-wrap payroll-months-wrap"><table class="payroll-months-table"><thead><tr>'+[L('الشهر','Month'),L('الحالة','Status'),L('يوم استقطاع الرواتب','Payroll deduction date'),L('الإجمالي','Total')].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div><p class="hint" id="payroll-month-filter-empty" hidden>'+L('لا يوجد','No results')+'</p></section>';
 }
 const run=state.payrollRuns?.find(item=>item.month===month), entries=visiblePayrollEntries(state,month), locked=run?.status==='Approved';
 const branch=payrollBranch(state);
 const controls='<div class="actions payroll-heading"><label>'+L('الفرع','Branch')+
  '<select id="payroll-branch"><option value="">'+L('كل الفروع','All branches')+'</option>'+
  (state.locations??[]).map(location=>'<option value="'+esc(location.id)+'"'+(location.id===branch?' selected':'')+'>'+esc(location.name)+'</option>').join('')+
  '</select></label></div>';
 const sums=entries.reduce((sum,entry)=>{const values=payrollTotals(entry);for(const key of Object.keys(sum))sum[key]=payrollMoney(sum[key]+values[key]);return sum;},{gross:0,additions:0,deductions:0,net:0});
 const categoryCell=(entry,category)=>{const amount=payrollMoney((entry.adjustments??[]).filter(item=>!item.removedAt&&item.category===category[0]).reduce((sum,item)=>sum+item.amount,0));return '<span class="payroll-cell-actions"><button type="button" class="payroll-cell-add" data-payroll-adjust="'+category[0]+'" data-staff="'+esc(entry.staffId)+'"'+(locked?' disabled':'')+' aria-label="'+esc(L('إضافة: ','Add: ')+labelFor(category,language)+' — '+(entry.nameEn||'—'))+'"><span aria-hidden="true">+</span></button>'+(amount>0?'<button type="button" class="period-name" data-payroll-person="'+esc(entry.staffId)+'" data-payroll-adjustments aria-label="'+esc(L('عرض البنود: ','View adjustments: ')+labelFor(category,language)+' — '+number(amount))+'"><bdi>'+number(amount)+'</bdi></button>':'<bdi>'+number(amount)+'</bdi>')+'</span>';};
 const add=payrollCategories.filter(item=>item[1]==='addition'),ded=payrollCategories.filter(item=>item[1]==='deduction');
 const headers=[L('رقم الموظف','Employee number'),L('اسم الموظف','Employee name'),L('الراتب الأساسي','Basic salary'),L('بدل سكن','Housing allowance'),L('أخرى','Other allowances'),L('إجمالي الراتب','Gross salary'),...add.map(item=>labelFor(item,language)),L('إجمالي الإضافات','Total additions'),L('التأمينات الاجتماعية','Social insurance'),...ded.map(item=>labelFor(item,language)),L('إجمالي الخصومات','Total deductions'),L('صافي الراتب','Net salary')];
 const salaries=new Map(state.staff.map(person=>[person.id,person.salary]));
 const salaryCell=(amount,profileAmount)=>{
  const differs=typeof profileAmount==='number'&&Number.isFinite(profileAmount)&&payrollMoney(profileAmount)!==payrollMoney(amount);
  return '<td><bdi>'+number(amount)+'</bdi>'+(differs?'<div class="hint">'+L('في ملف الموظف','In employee profile')+' <bdi>'+number(profileAmount)+'</bdi></div>':'')+'</td>';
 };
 const rows=entries.map(entry=>{const totals=payrollTotals(entry),salary=salaries.get(entry.staffId);const name=entry.nameEn||'—';return '<tr data-payroll-row="'+esc((name+' '+entry.employeeNumber).toLowerCase())+'"><td>'+esc(entry.employeeNumber||'—')+'</td><td class="payroll-staff-cell"><button type="button" class="period-name" data-payroll-person="'+esc(entry.staffId)+'">'+esc(name)+'</button></td>'+salaryCell(entry.base,salary?.monthlyBase)+salaryCell(entry.housing,salary?.monthlyHousing)+salaryCell(entry.other,salary?.monthlyAllowances)+'<td><bdi>'+number(totals.gross)+'</bdi></td>'+add.map(category=>'<td class="payroll-addition">'+categoryCell(entry,category)+'</td>').join('')+'<td class="payroll-addition"><bdi>'+number(totals.additions)+'</bdi></td><td class="payroll-deduction"><button type="button" class="period-name" data-payroll-insurance="'+esc(entry.staffId)+'"><bdi>'+(entry.insuranceNeedsSetup?L('استكمال بيانات التأمينات','Complete GOSI settings'):number(totals.insurance))+'</bdi></button></td>'+ded.map(category=>'<td class="payroll-deduction">'+categoryCell(entry,category)+'</td>').join('')+'<td class="payroll-deduction"><bdi>'+number(totals.deductions)+'</bdi></td><td><strong><bdi>'+number(totals.net)+'</bdi></strong></td></tr>';}).join('');
 return '<a class="settings-back" href="#payroll">'+L('العودة إلى الأشهر','Back to months')+'</a><div class="payroll-heading"><div><h1>'+L('ملخص المسير','Payroll summary')+'</h1><p>'+esc(monthLabel(month,language))+' · '+L(locked?'معتمد':'قيد الإعداد',locked?'Approved':'Draft')+'</p></div><div class="actions">'+(state.isCompanyOwner&&!locked&&entries.length?'<button class="button primary" id="approve-payroll">'+L('اعتماد المسير','Approve payroll')+'</button>':'')+'<button type="button" class="button secondary" id="payroll-bank" aria-label="'+L('اختيار البنك','Choose bank')+'">▣ '+esc(payrollBanks.some(([id])=>id===run?.bank?.id)?(ar?run.bank.name:run.bank.nameEn):L('اختيار البنك','Choose bank'))+'</button><details class="report-export"><summary class="button secondary">'+L('تصدير','Export')+' ⇩</summary><div class="report-export-options"><button type="button" data-payroll-export="bank">'+L('Excel — قالب البنك','Excel — Bank template')+'</button><button type="button" data-payroll-export="xlsx">'+L('كشف المراجعة (Excel)','Review statement (Excel)')+'</button><button type="button" data-payroll-export="pdf">PDF</button>'+(run?.bank?.id==='snb'?'':'<button type="button" data-payroll-export="csv">CSV</button>')+'</div></details></div></div>'+
 controls+'<div class="payroll-summary">'+[['gross',L('إجمالي الرواتب','Gross salaries')],['additions',L('إجمالي الإضافات','Total additions')],['deductions',L('إجمالي الخصومات','Total deductions')],['net',L('صافي الرواتب','Net salaries')]].map(([key,title])=>'<section class="card '+(key==='additions'?'payroll-positive':key==='deductions'?'payroll-negative':'')+'"><h2>'+title+'</h2><strong><bdi>'+number(sums[key])+'</bdi> '+L('ر.س','SAR')+'</strong></section>').join('')+'</div>'+
 '<section class="card"><div class="payroll-heading"><h2>'+L('الإضافات والخصومات','Additions and deductions')+'</h2><input id="payroll-search" type="search" placeholder="'+L('ابحث باسم الموظف أو رقمه','Search by employee name or number')+'" aria-label="'+L('بحث الموظفين','Search employees')+'"></div><p class="hint">'+L('يُحسب خصم التأمينات تلقائيًا من تاريخ أول اشتراك المعتمد كتاريخ البداية والراتب المسجل، مع أولوية بيانات التأمينات المحددة يدويًا. يُستثنى تمهير. تُسجّل الإضافات والخصومات يدويًا لهذا الشهر.','Insurance uses the confirmed first-enrollment joining date and registered salary, with explicit GOSI settings taking priority. Tamheer is exempt. Adjustments apply to this month.')+'</p>'+
 (locked?'<p class="hint">'+L('المسير معتمد ومقفل للتعديل.','Approved payroll is locked.')+'</p>':'')+
 (entries.length?'<div class="table-wrap payroll-table-wrap"><table class="payroll-table"><thead><tr><th colspan="2">'+L('معلومات الموظف','Employee details')+'</th><th colspan="4">'+L('الراتب والبدلات','Salary and allowances')+'</th><th class="payroll-addition" colspan="'+(add.length+1)+'">'+L('الإضافات','Additions')+'</th><th class="payroll-deduction" colspan="'+(ded.length+2)+'">'+L('الخصومات','Deductions')+'</th><th>'+L('معلومات الدفع','Payment details')+'</th></tr><tr>'+headers.map(title=>'<th>'+esc(title)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>':'<p class="empty">'+L('لا يوجد موظفون لهذا الشهر.','No employees in this month.')+'</p>')+'</section>'+
 '<p class="hint">'+L('اختر قالب البنك لتصدير نموذج الأهلي أو الجزيرة، أو Excel وPDF وCSV للكشف العام.','Choose Bank template for SNB or AlJazira, or Excel, PDF and CSV for a general statement.')+'</p><dialog id="payroll-dialog" class="catalog-dialog"></dialog>'+drawer(entries.find(entry=>entry.staffId===selectedEmployee),locked,language,esc,state);
}
function drawer(entry,locked,language,esc,state) {
 if(!entry)return '';
 const ar=language==='ar',L=(a,b)=>ar?a:b,total=payrollTotals(entry);
 const nationality=state.staff.find(person=>person.id===entry.staffId)?.nationality;
 const showInsurance=!nationality||nationality==='SA';
 const items=(entry.adjustments??[]).filter(item=>!item.removedAt);
 return '<dialog class="payroll-drawer" id="payroll-person-dialog"><header><div><h2>'+esc(entry.nameEn||'—')+'</h2><p>'+L('الرقم الوظيفي: ','Employee number: ')+esc(entry.employeeNumber||'—')+'</p><button type="button" class="button secondary compact" data-payroll-payment="'+esc(entry.staffId)+'">'+L('بيانات الدفع','Payment details')+'</button></div><button type="button" class="button secondary compact" data-close-payroll-person aria-label="'+L('إغلاق','Close')+'">×</button></header><section class="card"><h3>'+L('صافي الراتب','Net salary')+'</h3><strong class="payroll-net">'+number(total.net)+' '+L('ر.س','SAR')+'</strong><dl class="payroll-details">'+[[L('الأجور والبدلات','Salary and allowances'),total.gross],[L('إجمالي الإضافات','Total additions'),total.additions],[L('إجمالي المستقطعات','Total deductions'),total.deductions]].map(([label,value])=>'<div><dt>'+label+'</dt><dd><bdi>'+number(value)+'</bdi></dd></div>').join('')+'</dl></section><section class="card"><h3>'+L('الأجور والبدلات','Salary and allowances')+'</h3>'+[['base',L('الراتب الأساسي','Basic salary')],['housing',L('بدل سكن','Housing allowance')],['other',L('أخرى','Other allowances')]].map(([key,label])=>'<button type="button" class="payroll-detail-line" data-payroll-salary="'+esc(entry.staffId)+'"><span>'+label+'</span><bdi>'+number(entry[key])+'</bdi><span>‹</span></button>').join('')+'</section><section class="card" data-payroll-adjustment-list><h3>'+L('الإضافات والخصومات','Additions and deductions')+'</h3>'+(!locked?'<label>'+L('إضافة أو خصم جديد','New addition or deduction')+'<select data-adjustment-category="'+esc(entry.staffId)+'"><option value="">'+L('اختر التصنيف','Choose category')+'</option>'+payrollCategories.map(category=>'<option value="'+category[0]+'">'+esc(labelFor(category,language))+'</option>').join('')+'</select></label>':'')+(showInsurance?'<button type="button" class="payroll-detail-line" data-payroll-insurance="'+esc(entry.staffId)+'"><span>'+L('التأمينات الاجتماعية','Social insurance')+'</span><bdi class="payroll-negative">'+number(total.insurance)+'</bdi><span>‹</span></button>':'')+items.map(item=>'<div class="payroll-adjustment-item"><strong>'+esc(labelFor(payrollCategories.find(category=>category[0]===item.category),language))+' · <bdi>'+number(item.amount)+'</bdi></strong><p>'+esc(item.description)+'</p>'+(item.attachment?'<a href="'+(location.pathname.startsWith('/company/')?location.pathname.replace(/\/$/,''):'')+'/api/payroll-attachment?month='+monthFromRoute()+'&staffId='+encodeURIComponent(entry.staffId)+'&id='+encodeURIComponent(item.id)+'">'+esc(item.attachment.name)+'</a>':'')+(!locked&&!item.system?'<div class="actions"><button class="button secondary compact" type="button" data-edit-payroll-adjustment="'+esc(item.id)+'" data-staff="'+esc(entry.staffId)+'">'+L('تعديل','Edit')+'</button><button class="button secondary compact" type="button" data-remove-payroll-adjustment="'+esc(item.id)+'" data-staff="'+esc(entry.staffId)+'">'+L('حذف','Remove')+'</button></div>':'')+'</div>').join('')+'</section></dialog>';
}
export function mountPayroll(options) {
 const {state,language,esc,save,say,companyPrefix,downloadReport,render}=options;
 const ar=language==='ar',L=(a,b)=>ar?a:b,month=monthFromRoute();
 const main=document.querySelector('#main');
 const run=state.payrollRuns?.find(item=>item.month===month),locked=run?.status==='Approved';
 const entries=month?visiblePayrollEntries(state,month):[];
 const branchSelect=main.querySelector('#payroll-branch');
 if(branchSelect)branchSelect.onchange=()=>{
  writePageFilter(payrollPreference('branch'),branchSelect.value);
  selectedEmployee=null;
  render();
  document.querySelector('#payroll-branch')?.focus();
 };
 const payrollTable=main.querySelector('.payroll-table');
 if(payrollTable){
  const addCount=payrollCategories.filter(item=>item[1]==='addition').length;
  const dedCount=payrollCategories.filter(item=>item[1]==='deduction').length;
  const groups=[{key:'employee',start:0,length:2,keep:1},{key:'salary',start:2,length:4,keep:5},
    {key:'additions',start:6,length:addCount+1,keep:6+addCount},
    {key:'deductions',start:7+addCount,length:dedCount+2,keep:8+addCount+dedCount}];
  const groupHeaders=[...payrollTable.tHead.rows[0].cells],columnHeaders=[...payrollTable.tHead.rows[1].cells];
  const updateColumns=()=>{
    for(const [index,group] of groups.entries()){
      const expanded=expandedPayrollGroups.has(group.key);groupHeaders[index].colSpan=expanded?group.length:1;
      groupHeaders[index].querySelector('button').setAttribute('aria-expanded',String(expanded));
      groupHeaders[index].querySelector('[aria-hidden]').textContent=expanded?'−':'+';
      for(let column=group.start;column<group.start+group.length;column++){
        const hidden=!expanded&&column!==group.keep;columnHeaders[column].hidden=hidden;
        for(const row of payrollTable.tBodies[0].rows)row.cells[column].hidden=hidden;
      }
    }
    payrollTable.classList.toggle('payroll-hide-employee-number',!expandedPayrollGroups.has('employee'));
  };
  for(const [index,group] of groups.entries()){
    const heading=groupHeaders[index],text=heading.textContent;heading.replaceChildren();
    const button=document.createElement('button');button.type='button';button.className='payroll-group-toggle';button.dataset.payrollGroup=group.key;
    button.append(document.createTextNode(text+' '));const marker=document.createElement('span');marker.setAttribute('aria-hidden','true');button.append(marker);
    button.onclick=()=>{expandedPayrollGroups.has(group.key)?expandedPayrollGroups.delete(group.key):expandedPayrollGroups.add(group.key);updateColumns();};heading.append(button);
  }
  updateColumns();
 }
 const personDialog=main.querySelector('#payroll-person-dialog');
 const closePerson=()=>{selectedEmployee=null;personDialog?.close();};
 if(personDialog){personDialog.querySelector('[data-close-payroll-person]').onclick=closePerson;personDialog.addEventListener('cancel',closePerson);personDialog.showModal();}
 const perform=async(control,action)=>{control.disabled=true;try{await action();}catch(error){say(error.message,true);}finally{control.disabled=false;}};
 const action=body=>save('payroll',{month,expectedVersion:run?.version??0,...body});
 const openDialog=(title,content,submit)=>{
  const dialog=main.querySelector('#payroll-dialog');
  dialog.setAttribute('aria-labelledby','payroll-dialog-title');
  dialog.innerHTML='<header><h2 id="payroll-dialog-title">'+esc(title)+'</h2><button type="button" class="button secondary compact" data-close-payroll-dialog aria-label="'+L('إغلاق','Close')+'">×</button></header><form>'+content+'</form>';
  dialog.querySelector('[data-close-payroll-dialog]').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=event=>{event.preventDefault();if(submit)void perform(event.submitter,()=>submit(new FormData(event.target),event.target));};
  dialog.showModal();return dialog;
 };
 const bankButton=main.querySelector('#payroll-bank');
 if(bankButton)bankButton.onclick=()=>{
  const options=payrollBanks.map(([id,nameAr,nameEn])=>'<option value="'+id+'"'+(run?.bank?.id===id?' selected':'')+'>'+esc(ar?nameAr:nameEn)+'</option>').join('');
  openDialog(L('اختيار البنك','Choose bank'),'<label>'+L('البنك','Bank')+'<select name="bankId" required><option value="">'+L('اختر البنك','Choose bank')+'</option>'+options+'</select></label><button class="button primary">'+L('حفظ البنك','Save bank')+'</button>',async fields=>{await action({operation:'bank',bankId:fields.get('bankId')});});
 };
 const payment=id=>{
  const entry=entries.find(item=>item.staffId===id), values=entry.payment??{};
  openDialog(L('بيانات الدفع','Payment details'),'<p class="hint">'+L('رمز البنك هو رمز بنك الموظف، مثل NCBK أو RJHI.','Use the employee bank code, such as NCBK or RJHI.')+'</p>'+[['account',L('رقم الحساب / IBAN','Account / IBAN')],['identity',L('رقم الهوية أو الإقامة','ID / Iqama')],['bankCode',L('رمز البنك','Bank code')],['address',L('عنوان الموظف','Employee address')]].map(([key,label])=>'<label>'+label+'<input dir="ltr" name="'+key+'" maxlength="120" value="'+esc(values[key]??'')+'"'+'></label>').join('')+'<button class="button primary">'+L('حفظ','Save')+'</button>',async fields=>action({operation:'payment',staffId:id,...Object.fromEntries(fields)}));
 };
 const insurance=id=>{
  const entry=entries.find(item=>item.staffId===id);const total=payrollTotals(entry),rates=gosiRates(entry.insuranceScheme,month,entry.insuranceSaned!==false);
  openDialog(L('تفاصيل خصم التأمينات الاجتماعية GOSI','Social insurance deduction details'),'<section class="card"><h3>'+L('قيمة الخصم','Deduction amount')+'</h3><strong class="payroll-net payroll-negative">'+(entry.insuranceNeedsSetup?L('استكمال بيانات التأمينات','Complete GOSI settings'):number(total.insurance))+' '+L('ر.س','SAR')+'</strong></section><dl class="payroll-details">'+[...(entry.insuranceScheme&&entry.insuranceScheme!=='manual'?[[L('المعاشات (%)','Pension (%)'),rates.pension],[L('ساند (%)','SANED (%)'),rates.saned]]:[]),[L('عدد الأيام','Days'),entry.insuranceDays],[L('راتب الاشتراك','Contribution base'),number(entry.insuranceBase)],[L('نسبة مساهمة الموظف','Employee contribution rate'),entry.insuranceRate+'%']].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl><p class="hint">'+L('القيمة = راتب الاشتراك × النسبة ÷ 100 × الأيام ÷ 30. حدّد النسبة المناسبة لهذا الموظف.','Amount = contribution base × rate ÷ 100 × days ÷ 30. Set the applicable employee rate.')+'</p>'+(!locked?'<button type="button" class="button primary" data-insurance-edit>'+L('تعديل بيانات الشهر','Edit monthly settings')+'</button>':''));
  main.querySelector('[data-insurance-edit]')?.addEventListener('click',()=>salary(id));
 };
 const salary=id=>{
  const entry=entries.find(item=>item.staffId===id);
  openDialog(L('بيانات الراتب لهذا الشهر','Salary settings for this month'),'<p class="hint">'+L('هذه التعديلات تخص المسير الحالي ولا تغير بيانات الموظف الأصلية.','Changes apply to this payroll only, without changing the employee profile.')+'</p><div class="fields"><label>'+L('تصنيف التأمينات','GOSI scheme')+'<select name="insuranceScheme">'+[['manual',L('يدوي','Manual')],['old',L('النظام القديم','Old scheme')],['new',L('النظام الجديد','New scheme')],['none',L('غير خاضع','Not subject')]].map(([value,label])=>'<option value="'+value+'"'+((entry.insuranceScheme||'manual')===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label><label>'+L('الخضوع لساند','Subject to SANED')+'<select name="insuranceSaned"><option value="yes"'+(entry.insuranceSaned!==false?' selected':'')+'>'+L('نعم','Yes')+'</option><option value="no"'+(entry.insuranceSaned===false?' selected':'')+'>'+L('لا','No')+'</option></select></label></div><p class="hint">'+L('يُستخدم تاريخ البداية كتاريخ أول اشتراك حسب البيانات المعتمدة. يمكنك تصحيح التصنيف من سجل التأمينات؛ وتُحسب النسبة حسب شهر المسير.','The confirmed joining date is used as first GOSI enrollment. Correct the scheme from the GOSI record when needed; rates follow the payroll month.')+'</p><div class="fields">'+[['base',L('الراتب الأساسي','Basic salary')],['housing',L('بدل سكن','Housing allowance')],['other',L('بدلات أخرى','Other allowances')],['insuranceBase',L('راتب الاشتراك في التأمينات','Insurance contribution base')],['insuranceRate',L('نسبة مساهمة الموظف (%)','Employee contribution (%)')],['insuranceDays',L('عدد أيام التأمينات','Insurance days')]].map(([key,label])=>'<label>'+label+'<input name="'+key+'" type="number" min="0" max="'+(key==='insuranceDays'?30:key==='insuranceRate'?100:100000000)+'" step="'+(key==='insuranceDays'?'1':'0.01')+'" required value="'+entry[key]+'"'+(locked?' disabled':'')+'></label>').join('')+'</div>'+(!locked?'<button class="button primary">'+L('حفظ','Save')+'</button>':''),async fields=>{await action({operation:'salary',staffId:id,...Object.fromEntries([...fields].map(([key,value])=>[key,key==='insuranceScheme'?value:key==='insuranceSaned'?value==='yes':Number(value)]))});});

  const scheme=main.querySelector('[name="insuranceScheme"]'),saned=main.querySelector('[name="insuranceSaned"]'),rate=main.querySelector('[name="insuranceRate"]');
  const updateRate=()=>{if(!scheme||!rate)return;rate.readOnly=scheme.value!=='manual';if(rate.readOnly)rate.value=gosiRates(scheme.value,monthFromRoute(),saned.value==='yes').total;};
  scheme?.addEventListener('change',updateRate);saned?.addEventListener('change',updateRate);updateRate();
 };
 const adjustment=(id,categoryKey,existing)=>{
  const category=payrollCategories.find(item=>item[0]===categoryKey);
  const dialog=openDialog(existing?L('تعديل البند','Edit adjustment'):L(category[1]==='addition'?'إضافة مبلغ':'إضافة خصم',category[1]==='addition'?'Add amount':'Add deduction'),'<p>'+esc(labelFor(category,language))+'</p><label>'+L('المبلغ (ر.س)','Amount (SAR)')+'<input name="amount" type="number" min="0.01" max="100000000" step="0.01" required value="'+esc(existing?.amount??'')+'"></label><label>'+L('الوصف','Description')+'<textarea name="description" maxlength="1000" required>'+esc(existing?.description??'')+'</textarea></label><label class="payroll-upload">'+L('اختر ملفًا للتحميل أو اسحبه وأفلته هنا','Choose a file or drag and drop it here')+'<input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg"><small>PDF / PNG / JPG · '+L('حتى ٢ ميجابايت','Up to 2 MB')+'</small></label><div class="actions"><button class="button primary">'+(existing?L('حفظ','Save'):L('إضافة','Add'))+'</button><button type="button" class="button secondary" data-cancel-adjustment>'+L('إلغاء','Cancel')+'</button></div>',async(fields,form)=>{
   const file=fields.get('attachment');let attachment;
   if(file?.size){if(file.size>2*1024*1024||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw Error(L('اختر ملف PDF أو PNG أو JPG حتى ٢ ميجابايت.','Choose a PDF, PNG or JPG up to 2 MB.'));
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});attachment={name:file.name,mime:file.type,data};}
   await action({operation:existing?'edit-adjustment':'adjustment',staffId:id,...(existing?{adjustmentId:existing.id}:{category:categoryKey}),amount:Number(fields.get('amount')),description:fields.get('description'),...(attachment?{attachment}:{})});
  });
  dialog.querySelector('[data-cancel-adjustment]').onclick=()=>dialog.close();
  const zone=dialog.querySelector('.payroll-upload');zone.ondragover=event=>event.preventDefault();zone.ondrop=event=>{event.preventDefault();if(event.dataTransfer.files.length)zone.querySelector('input').files=event.dataTransfer.files;};
 };
 for(const row of main.querySelectorAll('[data-payroll-month-status]')) {
  row.onclick=event=>{if(!event.target.closest('button,a,input,select'))row.querySelector('[data-open-payroll]').click();};
  row.onkeydown=event=>{if(event.target===row && ['Enter',' '].includes(event.key)){event.preventDefault();row.querySelector('[data-open-payroll]').click();}};
 }
 const statusFilter=main.querySelector('#payroll-month-status');
 if(statusFilter)statusFilter.onchange=()=>{
  const monthStatusFilter = statusFilter.value;
  writePageFilter('payroll-month-status', monthStatusFilter);
  const rows=[...main.querySelectorAll('[data-payroll-month-status]')];
  for(const row of rows)row.hidden=monthStatusFilter!=='all'&&row.dataset.payrollMonthStatus!==monthStatusFilter;
  main.querySelector('#payroll-month-filter-empty').hidden=rows.some(row=>!row.hidden);
 };
 for(const button of main.querySelectorAll('[data-open-payroll]'))button.onclick=()=>perform(button,async()=>{if(!state.payrollRuns?.some(run=>run.month===button.dataset.openPayroll))await save('payroll',{operation:'prepare',month:button.dataset.openPayroll});selectedEmployee=null;location.hash='payroll/'+button.dataset.openPayroll;});
 for(const button of main.querySelectorAll('[data-payroll-person]'))button.onclick=()=>{selectedEmployee=button.dataset.payrollPerson; const old=main.querySelector('#payroll-person-dialog');old?.remove();main.insertAdjacentHTML('beforeend',drawer(entries.find(entry=>entry.staffId===selectedEmployee),locked,language,esc,state));mountPayroll(options);if(button.hasAttribute('data-payroll-adjustments'))main.querySelector('[data-payroll-adjustment-list]')?.scrollIntoView({block:'nearest'});};
 for(const select of main.querySelectorAll('[data-adjustment-category]'))select.onchange=()=>{if(select.value)adjustment(select.dataset.adjustmentCategory,select.value);};
 for(const button of main.querySelectorAll('[data-payroll-payment]'))button.onclick=()=>payment(button.dataset.payrollPayment);
 for(const button of main.querySelectorAll('[data-payroll-salary]'))button.onclick=()=>salary(button.dataset.payrollSalary);
 for(const button of main.querySelectorAll('[data-payroll-insurance]'))button.onclick=()=>insurance(button.dataset.payrollInsurance);
 for(const button of main.querySelectorAll('[data-payroll-adjust]'))button.onclick=()=>adjustment(button.dataset.staff,button.dataset.payrollAdjust);
 for(const button of main.querySelectorAll('[data-edit-payroll-adjustment]'))button.onclick=()=>{
  const id=button.dataset.staff;
  const item=entries.find(entry=>entry.staffId===id)?.adjustments.find(entry=>entry.id===button.dataset.editPayrollAdjustment&&!entry.removedAt&&!entry.system);
  if(item)adjustment(id,item.category,item);
 };
 for(const button of main.querySelectorAll('[data-remove-payroll-adjustment]'))button.onclick=()=>{
  if(confirm(L('حذف هذا البند من المسير؟','Remove this adjustment from payroll?')))void perform(button,()=>action({operation:'remove-adjustment',staffId:button.dataset.staff,adjustmentId:button.dataset.removePayrollAdjustment}));
 };
 const search=main.querySelector('#payroll-search');if(search){search.value=readPageFilter(payrollPreference('search'),'');search.oninput=()=>{const text=normalizeSearch(search.value);for(const row of main.querySelectorAll('[data-payroll-row]'))row.hidden=!normalizeSearch(row.dataset.payrollRow).includes(text);writePageFilter(payrollPreference('search'),search.value);};search.oninput();}
 main.querySelector('#approve-payroll')?.addEventListener('click',event=>{if(confirm(L('اعتماد المسير وإيقاف التعديل عليه؟ راجع جميع الرواتب والإضافات والخصومات أولًا.','Approve and lock this payroll? Review all salaries and adjustments first.')))void perform(event.currentTarget,()=>action({operation:'approve',expectedVersion:run?.version??0}));});
 for(const button of main.querySelectorAll('[data-payroll-export]'))button.onclick=()=>perform(button,async()=>{
  if(!payrollBanks.some(([id])=>id===run?.bank?.id)){bankButton.click();say(L('اختر البنك أولًا ثم اختر صيغة التصدير.','Choose the bank first, then export.'),true);return;}
  const bankTemplate=button.dataset.payrollExport==='bank'||(button.dataset.payrollExport==='csv'&&run.bank.id==='snb');
  if(bankTemplate){
    const bankEntries=entries;
    if(!bankEntries.length){say(L('لا يوجد موظفون مؤهلون للتصدير البنكي بعد استثناء تمهير.','No employees are eligible for bank export after excluding Tamheer.'),true);return;}
  }
  const result=await action({operation:'export',format:button.dataset.payrollExport==='bank'?'xlsx':button.dataset.payrollExport,
    bankTemplate,language,branchId:payrollBranch(state)||undefined});
  const response=await fetch(companyPrefix+'/api/issued-reports?id='+encodeURIComponent(result.payrollReportId));
  if(!response.ok)throw Error(L('تعذر تحميل التقرير. النسخة محفوظة في السجل.','Download failed. The report remains in history.'));
  await document.fonts.ready;downloadReport(await response.json());say(L('بدأ التحميل وحُفظت نسخة في سجل التقارير الصادرة.','Download started; a copy was saved in issued reports.'));
 });
}
