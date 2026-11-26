import {effectivePeriodIds,periodBounds,periodOnDay,isFlexiblePeriod} from './work-schedule.js';

const twoDigits = value => String(value).padStart(2, '0');
function correctionHourLabel(hour) {
  const arabic = (document.documentElement.lang || 'ar') !== 'en';
  const twelve = hour % 12 || 12;
  if (!arabic) return twelve + (hour < 12 ? ' AM' : ' PM');
  return twelve + (hour === 12 ? ' ظهرًا' : hour < 12 ? ' صباحًا' : ' مساءً');
}

// Staff pick the time with two taps (hour, then minute) instead of typing it.
// The original text input stays in the form, visually hidden, so validation and
// submission keep working with the same HH:MM value.
export function configureCorrectionTime(input) {
  input.classList.add('correction-time');
  input.dir = 'ltr';
  input.inputMode = 'none';
  input.pattern = '(?:[01][0-9]|2[0-3]):[0-5][0-9]';
  input.autocomplete = 'off';
  input.tabIndex = -1;
  const picker = document.createElement('span'), hour = document.createElement('select'), minute = document.createElement('select');
  picker.className = 'correction-time-picker';
  picker.dir = 'ltr';
  hour.dir = (document.documentElement.lang || 'ar') === 'en' ? 'ltr' : 'rtl';
  hour.append(new Option((document.documentElement.lang || 'ar') === 'en' ? 'Hour' : 'الساعة', ''));
  for (let h = 0; h < 24; h++) hour.append(new Option(correctionHourLabel(h), twoDigits(h)));
  minute.append(new Option((document.documentElement.lang || 'ar') === 'en' ? 'Min' : 'الدقيقة', ''));
  for (let m = 0; m < 60; m++) minute.append(new Option(twoDigits(m), twoDigits(m)));
  const separator = document.createElement('b');
  separator.textContent = ':';
  separator.setAttribute('aria-hidden', 'true');
  picker.append(hour, separator, minute);
  const write = () => {
    if (hour.value && !minute.value) minute.value = '00';
    const value = hour.value && minute.value ? hour.value + ':' + minute.value : '';
    if (input.value !== value) { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  hour.addEventListener('change', write);
  minute.addEventListener('change', write);
  const sync = () => {
    picker.hidden = input.hidden;
    hour.disabled = minute.disabled = input.disabled;
    const [h = '', m = ''] = /^\d{2}:\d{2}$/.test(input.value) ? input.value.split(':') : [];
    if (hour.value !== h) hour.value = h;
    if (minute.value !== m) minute.value = m;
  };
  new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['hidden', 'disabled'] });
  input.addEventListener('focus', () => { sync(); if (!picker.hidden && picker.isConnected) hour.focus(); });
  input.addEventListener('invalid', () => picker.classList.add('is-invalid'));
  input.addEventListener('input', () => { picker.classList.remove('is-invalid'); });
  const name = () => { const label = input.getAttribute('aria-label') || ''; const en = (document.documentElement.lang || 'ar') === 'en'; hour.setAttribute('aria-label', (label ? label + ' · ' : '') + (en ? 'hour' : 'الساعة')); minute.setAttribute('aria-label', (label ? label + ' · ' : '') + (en ? 'minute' : 'الدقيقة')); };
  const attach = () => { if (input.isConnected) { if (picker.previousElementSibling !== input) input.after(picker); name(); sync(); } else requestAnimationFrame(attach); };
  queueMicrotask(attach);
}

export function correctionPeriods(workspace, person, day) {
  return effectivePeriodIds(workspace,person,day).map(id=>periodOnDay(workspace.workPeriods.find(p=>p.id===id),day))
    .filter(Boolean).map(period=>({...periodBounds(period,day),period}))
    .sort((a,b)=>a.start-b.start);
}

export function periodPunches(workspace, person, range) {
  return workspace.punches.filter(p=>{
    if(p.staffId!==person.id)return false;
    if(p.shiftStart!=null)return p.shiftStart===range.start;
    const time=Date.parse(p.time);
    return p.kind==='in' ? time>=range.start && time<range.end : time>range.start && time<=range.end;
  }).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
}

export function applyPunchCorrection(workspace, person, request, now=Date.now()) {
  const day=request.date;
  const ranges=correctionPeriods(workspace,person,day);
  const starts=new Set(ranges.map(r=>r.start));
  const logs=workspace.punches.filter(p=>p.staffId===person.id &&
    (p.shiftStart==null?p.date===day:starts.has(p.shiftStart)||(!ranges.length&&new Date(p.shiftStart+10800000).toISOString().slice(0,10)===day))).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  const changes=[];
  const scoped=request.periodCorrections;
  const groups=scoped ? scoped.map(edit=>{
    const range=ranges.find(r=>r.period.id===edit.periodId && r.start===edit.shiftStart && r.end===edit.shiftEnd);
    if(!range)throw Error('The work schedule changed. Submit a new correction request.');
    return {edit,range,logs:periodPunches(workspace,person,range)};
  }) : [{edit:request,logs}];
  for(const {edit,range:target,logs} of groups) {
    const groupChanges=[];
    for(const [kind,value] of [['in',edit.proposedIn],['out',edit.proposedOut]]) {
      if(!value)continue;
      if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Choose at least one valid proposed time.');
      const existing=kind==='in'?logs.find(p=>p.kind===kind):logs.findLast(p=>p.kind===kind);
      const originalKey=kind==='in'?'originalIn':'originalOut';
      if(Object.hasOwn(edit,originalKey) && edit[originalKey] !== (existing?.time ?? null))
        throw Error('The recorded punches changed. Submit a new correction request.');
      let timestamp=Date.parse(day+'T'+value+':00+03:00');
      const range=target ?? ranges.find(r=>r.start===existing?.shiftStart) ?? [...ranges].sort((a,b)=>
        Math.abs((kind==='in'?a.start:a.end)-timestamp)-Math.abs((kind==='in'?b.start:b.end)-timestamp))[0];
      if(kind==='out' && range && range.end>Date.parse(day+'T00:00:00+03:00')+86400000 && timestamp<range.start)
        timestamp+=86400000;
      if(!Number.isFinite(timestamp)||timestamp>now)throw Error('Correction time cannot be in the future.');
      const entry={...(existing??{}),staffId:person.id,kind,time:new Date(timestamp).toISOString(),
        date:new Date(timestamp+10800000).toISOString().slice(0,10),correctionRequestId:request.id};
      if(range)Object.assign(entry,{shiftStart:range.start,shiftEnd:range.end,flexible:isFlexiblePeriod(range.period)});
      entry.correctionHistory=[...(existing?.correctionHistory??[]),{requestId:request.id,at:new Date(now).toISOString(),
        previous:existing?{time:existing.time,date:existing.date,shiftStart:existing.shiftStart??null,shiftEnd:existing.shiftEnd??null,flexible:Boolean(existing.flexible)}:null}];
      groupChanges.push({existing,entry});
    }
    if(!groupChanges.length)continue;
    const proposed=logs.map(p=>groupChanges.find(c=>c.existing===p)?.entry??p).concat(groupChanges.filter(c=>!c.existing).map(c=>c.entry));
    if(target)proposed.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
    const arrival=proposed.find(p=>p.kind==='in'),departure=proposed.findLast(p=>p.kind==='out');
    if(arrival&&departure && (arrival.shiftStart==null||departure.shiftStart==null||arrival.shiftStart===departure.shiftStart) && Date.parse(departure.time)<=Date.parse(arrival.time))
      throw Error('Clock-out must be after clock-in.');
    changes.push(...groupChanges);
  }
  if(!changes.length)return; // Older requests may have a note without proposed times.
  for(const {existing,entry} of changes) {
    if(existing)workspace.punches[workspace.punches.indexOf(existing)]=entry;
    else workspace.punches.push(entry);
  }
  workspace.punches.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
}
