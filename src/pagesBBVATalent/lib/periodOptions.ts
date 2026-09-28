export interface PeriodDefinition { code:string; year:number; quarter:1|2|3|4; startDate:string; endDate:string; }

export function currentPeriodYear(currentCode?: string | null, referenceDate?: string | null): number {
  const fromCode = Number(String(currentCode ?? '').slice(0,4));
  if (Number.isInteger(fromCode) && fromCode > 2000) return fromCode;
  const fromDate = Number(String(referenceDate ?? '').slice(0,4));
  if (Number.isInteger(fromDate) && fromDate > 2000) return fromDate;
  return new Date().getFullYear();
}

export function periodOptions(periods: PeriodDefinition[], currentCode?: string | null, referenceDate?: string | null, includeAll = false) {
  const year=currentPeriodYear(currentCode,referenceDate);
  const values=periods.filter((item)=>item.year===year);
  return [
    ...(includeAll ? [{value:'',label:'Todos los periodos'}] : []),
    ...values.map((item)=>({value:item.code,label:`Periodo ${item.quarter} · ${item.year}${item.code===currentCode?' · Actual':''}`,description:`${item.startDate} → ${item.endDate}`})),
  ];
}

export function formatPeriodCode(code?: string | null, fallback = 'Periodo'): string {
  const match = /^(\d{4})Q([1-4])$/.exec(String(code ?? '').toUpperCase());
  return match ? `Periodo ${match[2]} · ${match[1]}` : fallback;
}
