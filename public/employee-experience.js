export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const requestCounts = requests => ({all:requests.length,pending:requests.filter(r=>r.status==='Pending').length,completed:requests.filter(r=>r.status!=='Pending').length});
export const filterRequests = (requests,filter) => requests.filter(r=>filter==='pending'?r.status==='Pending':filter==='completed'?r.status!=='Pending':true);
export function availableLeave(balance) {
 if(Number.isFinite(balance?.available)) return balance.available;
 return Number.isFinite(balance?.current)&&Number.isFinite(balance?.opening)?balance.current+balance.opening:null;
}
export const cardIcons = {
 request:'<svg viewBox="0 0 48 48"><path d="M12 7h17l7 7v27H12zM29 7v8h7M18 23h12M18 30h9"/></svg>',
 leave:'<svg viewBox="0 0 48 48"><rect x="7" y="13" width="34" height="26" rx="2"/><path d="M19 13V7h10v6M13 39v4m22-4v4M15 18v16m18-16v16"/></svg>',
 correction:'<svg viewBox="0 0 48 48"><path d="M33 32a16.5 16.5 0 1 1 4-10M20 11v10l6 3m0 14 13-13 5 5-13 13-6 1z"/></svg>',
 excuse:'<svg viewBox="0 0 48 48"><path d="M33 35a17 17 0 1 1 3-20M21 14v9l5 3M31 28h13m-5-5 5 5-5 5"/></svg>',
 person:'<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M3 22v-3a9 9 0 0 1 18 0v3z"/></svg>',
 eye:'<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
 download:'<svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></svg>',
 share:'<svg viewBox="0 0 24 24"><path d="M12 15V3m-5 5 5-5 5 5M5 12v8h14v-8"/></svg>'
};
export const requestIcon = type => cardIcons[type==='Missed punch'?'correction':type==='Attendance excuse'?'excuse':/leave/i.test(type)?'leave':'request'];
export const iconBox = svg => '<span class="employee-card-icon" aria-hidden="true">'+svg+'</span>';
export function requestCardMarkup(request,{label,statusLabel,dateLabel,progress,compact=false}) {
 const e=escapeHtml,tone=request.status==='Pending'?'amber':request.status==='Approved'?'green':request.status==='Declined'?'red':'neutral';
 const badge='<span class="badge '+tone+'" data-status="'+e(request.status)+'">'+e(statusLabel)+'</span>';
 return compact ? iconBox(requestIcon(request.type))+'<span class="employee-card-copy"><strong>'+e(label)+'</strong><small>'+e(dateLabel)+'</small></span>'+badge :
 '<span class="employee-card-row">'+iconBox(requestIcon(request.type))+'<span class="employee-card-copy"><strong>'+e(label)+'</strong><small class="employee-request-range">'+e(dateLabel)+'</small></span>'+badge+'</span><span class="employee-card-foot"><span>'+e(progress)+'</span><span aria-hidden="true">‹</span></span>';
}
export function recordedDuration(minutes,language='ar') {
 if(!Number.isFinite(minutes))return '—';
 const hours=Math.floor(Math.max(0,minutes)/60),rest=Math.floor(Math.max(0,minutes)%60);
 return language==='en'?`${hours} h${rest?' '+rest+' min':''}`:`${hours} س${rest?' و'+rest+' د':''}`;
}

export function employeeActionDialog(title, closeLabel, className) {
  const dialog = document.createElement('dialog');
  dialog.className = 'employee-sheet ' + className;
  dialog.setAttribute('aria-label', title);
  dialog.innerHTML = '<header class="employee-section-heading"><h2></h2>' +
    '<button type="button" class="button secondary employee-icon-button">×</button></header>';
  dialog.querySelector('h2').textContent = title;
  const close = dialog.querySelector('button');
  close.setAttribute('aria-label', closeLabel);
  close.onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove(), {once:true});
  document.body.append(dialog);
  return dialog;
}
