import { bbvaBusinessDate } from './bbvaBusinessTime.js';

export interface VendorQuarterDefinition {
  code: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  /** startDate/endDate son la ventana operativa efectiva usada por todo BBVA Workspace. */
  startDate: string;
  endDate: string;
  /** Fechas reales/provisionales del calendario Vendors. */
  sourceStartDate?: string;
  sourceEndDate?: string;
  sourceConfigured?: boolean;
  operationalStartDate?: string;
  operationalEndDate?: string;
}

export interface VendorQuarterOperationalOverride {
  quarterCode: string;
  operationalStartDate: string;
  operationalEndDate: string;
  sourceStartDate?: string | null;
  sourceEndDate?: string | null;
  sourceConfigured?: boolean;
}

export interface VendorQuarterContext {
  calendarName: string;
  sourceYear: number;
  referenceDate: string;
  currentQuarter: VendorQuarterDefinition | null;
  nextQuarter: VendorQuarterDefinition | null;
  selectedQuarter: VendorQuarterDefinition | null;
  targetQuarter: VendorQuarterDefinition | null;
  daysToTargetStart: number | null;
  daysToTargetEnd: number | null;
  daysToSelectedStart: number | null;
  daysToSelectedEnd: number | null;
  progressPercent: number | null;
  years: number[];
  quarters: VendorQuarterDefinition[];
}

/** Calendario real proporcionado por el negocio para 2026. */
export const BBVA_VENDOR_QUARTERS: VendorQuarterDefinition[] = [
  { code: '2026Q1', year: 2026, quarter: 1, startDate: '2025-12-29', endDate: '2026-03-29', sourceConfigured:true },
  { code: '2026Q2', year: 2026, quarter: 2, startDate: '2026-03-30', endDate: '2026-06-28', sourceConfigured:true },
  { code: '2026Q3', year: 2026, quarter: 3, startDate: '2026-06-29', endDate: '2026-09-27', sourceConfigured:true },
  { code: '2026Q4', year: 2026, quarter: 4, startDate: '2026-09-28', endDate: '2026-12-27', sourceConfigured:true },
];

function validIso(value:string):boolean{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));}
function addMonthsFirstDay(value:string,months:number):string{const d=new Date(`${value.slice(0,7)}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+months);return d.toISOString().slice(0,10);}
function lastDayOfMonth(value:string):string{const d=new Date(`${value.slice(0,7)}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return d.toISOString().slice(0,10);}
function nextDay(value:string):string{const d=new Date(`${value}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function parseCode(code:string):{year:number;quarter:1|2|3|4}|null{const match=/^(\d{4})Q([1-4])$/.exec(String(code??'').trim().toUpperCase());if(!match)return null;return {year:Number(match[1]),quarter:Number(match[2]) as 1|2|3|4};}

/** Regla BBVA: un mes nunca se divide entre Q. */
export function defaultOperationalQuarterWindow(source: Pick<VendorQuarterDefinition,'startDate'|'endDate'>): {startDate:string;endDate:string} {
  if(!validIso(source.startDate)||!validIso(source.endDate)) throw new Error('El periodo fuente contiene fechas inválidas.');
  const startDate=source.startDate.endsWith('-01')?source.startDate:addMonthsFirstDay(source.startDate,1);
  const endDate=lastDayOfMonth(source.endDate);
  return {startDate,endDate};
}

/** Plantilla mensual para crear un año nuevo. Sus fechas Vendors son provisionales hasta que el usuario las confirme. */
export function generatedVendorYear(year:number):VendorQuarterDefinition[]{
  if(!Number.isInteger(year)||year<2020||year>2100) throw Object.assign(new Error('El año debe estar entre 2020 y 2100.'),{statusCode:400});
  const end=(month:number)=>lastDayOfMonth(`${year}-${String(month).padStart(2,'0')}-01`);
  return [
    {code:`${year}Q1`,year,quarter:1,startDate:`${year}-01-01`,endDate:end(3),sourceConfigured:false},
    {code:`${year}Q2`,year,quarter:2,startDate:`${year}-04-01`,endDate:end(6),sourceConfigured:false},
    {code:`${year}Q3`,year,quarter:3,startDate:`${year}-07-01`,endDate:end(9),sourceConfigured:false},
    {code:`${year}Q4`,year,quarter:4,startDate:`${year}-10-01`,endDate:end(12),sourceConfigured:false},
  ];
}

export function configuredVendorQuarters(overrides: VendorQuarterOperationalOverride[]=[]): VendorQuarterDefinition[] {
  const sources=new Map<string,VendorQuarterDefinition>();
  for(const item of BBVA_VENDOR_QUARTERS)sources.set(item.code,{...item});
  for(const override of overrides){
    const code=String(override.quarterCode??'').trim().toUpperCase();
    const parsed=parseCode(code);if(!parsed)continue;
    const existing=sources.get(code);
    const hasPersistedSource=validIso(String(override.sourceStartDate??''))&&validIso(String(override.sourceEndDate??''));
    const sourceStart=hasPersistedSource?String(override.sourceStartDate):String(existing?.startDate??'');
    const sourceEnd=hasPersistedSource?String(override.sourceEndDate):String(existing?.endDate??'');
    if(!validIso(sourceStart)||!validIso(sourceEnd))continue;
    const sourceConfigured=hasPersistedSource?Boolean(override.sourceConfigured):(existing?.sourceConfigured??false);
    sources.set(code,{code,year:parsed.year,quarter:parsed.quarter,startDate:sourceStart,endDate:sourceEnd,sourceConfigured});
  }
  const overrideMap=new Map(overrides.map((item)=>[String(item.quarterCode??'').trim().toUpperCase(),item]));
  return [...sources.values()]
    .sort((a,b)=>a.year-b.year||a.quarter-b.quarter)
    .map((source)=>{
      const derived=defaultOperationalQuarterWindow(source);
      const override=overrideMap.get(source.code);
      const operationalStartDate=validIso(String(override?.operationalStartDate??''))?String(override?.operationalStartDate):derived.startDate;
      const operationalEndDate=validIso(String(override?.operationalEndDate??''))?String(override?.operationalEndDate):derived.endDate;
      // V31.14: Vendors conserva la referencia de negocio; la ventana operativa persistida gobierna KPIs y puede ajustarse manualmente.
      return {...source,sourceStartDate:source.startDate,sourceEndDate:source.endDate,sourceConfigured:source.sourceConfigured??false,operationalStartDate,operationalEndDate,startDate:operationalStartDate,endDate:operationalEndDate};
    });
}

export function validateOperationalQuarterConfiguration(periods: VendorQuarterDefinition[]): void {
  const ordered=[...periods].sort((a,b)=>a.startDate.localeCompare(b.startDate));
  for(let i=0;i<ordered.length;i+=1){
    const item=ordered[i];
    if(!validIso(item.startDate)||!validIso(item.endDate)||item.startDate>item.endDate) throw Object.assign(new Error(`Ventana operativa inválida para ${item.code}.`),{statusCode:400});
    if(!item.startDate.endsWith('-01')) throw Object.assign(new Error(`El inicio operativo de ${item.code} debe ser el primer día de un mes.`),{statusCode:400});
    if(item.endDate!==lastDayOfMonth(item.endDate)) throw Object.assign(new Error(`El fin operativo de ${item.code} debe ser el último día de un mes.`),{statusCode:400});
    if(i>0&&nextDay(ordered[i-1].endDate)!==item.startDate) throw Object.assign(new Error(`Los periodos operativos ${ordered[i-1].code} y ${item.code} deben ser continuos, sin huecos ni traslapes.`),{statusCode:400});
  }
}

export function validateVendorSourceConfiguration(periods:VendorQuarterDefinition[]):void{
  // Las ventanas Vendors son referencias reales del negocio y pueden traslaparse entre Q.
  // Sólo se valida la consistencia interna de cada intervalo; los KPIs usan la ventana operativa.
  for(const item of periods){
    const sourceStart=String(item.sourceStartDate??'');const sourceEnd=String(item.sourceEndDate??'');
    if(!validIso(sourceStart)||!validIso(sourceEnd)||sourceStart>sourceEnd) throw Object.assign(new Error(`Ventana Vendors inválida para ${item.code}.`),{statusCode:400});
  }
}

function daysBetween(fromIso:string,toIso:string):number{const from=Date.parse(`${fromIso}T00:00:00Z`);const to=Date.parse(`${toIso}T00:00:00Z`);return Math.ceil((to-from)/86400000);}

export function vendorQuarterByCode(code:string|null|undefined,overrides:VendorQuarterOperationalOverride[]=[]):VendorQuarterDefinition|null{
  const normalized=String(code??'').trim().toUpperCase();if(!normalized)return null;return configuredVendorQuarters(overrides).find((item)=>item.code===normalized)??null;
}

export function vendorQuarterForDate(dateIso:string|null|undefined,overrides:VendorQuarterOperationalOverride[]=[]):VendorQuarterDefinition|null{
  const value=String(dateIso??'').trim();if(!validIso(value))return null;return configuredVendorQuarters(overrides).find((item)=>value>=item.startDate&&value<=item.endDate)??null;
}

export function vendorQuarterContext(reference=new Date(),requestedCode?:string|null,overrides:VendorQuarterOperationalOverride[]=[]):VendorQuarterContext{
  const today=bbvaBusinessDate(reference);const quarters=configuredVendorQuarters(overrides);validateOperationalQuarterConfiguration(quarters);
  const currentQuarter=quarters.find((item)=>today>=item.startDate&&today<=item.endDate)??null;
  const nextQuarter=quarters.find((item)=>item.startDate>today)??null;
  const requestedQuarter=vendorQuarterByCode(requestedCode,overrides);
  const selectedQuarter=requestedQuarter??currentQuarter??nextQuarter??quarters.at(-1)??null;
  const targetQuarter=requestedQuarter??nextQuarter??currentQuarter??selectedQuarter;
  const sourceYear=selectedQuarter?.year??currentQuarter?.year??quarters.at(-1)?.year??new Date().getUTCFullYear();
  const duration=selectedQuarter?Math.max(1,daysBetween(selectedQuarter.startDate,selectedQuarter.endDate)+1):null;
  const elapsed=selectedQuarter?Math.max(0,Math.min(duration??1,daysBetween(selectedQuarter.startDate,today)+1)):null;
  return {calendarName:'Calendario BBVA',sourceYear,referenceDate:today,currentQuarter,nextQuarter,selectedQuarter,targetQuarter,
    daysToTargetStart:targetQuarter?Math.max(0,daysBetween(today,targetQuarter.startDate)):null,daysToTargetEnd:targetQuarter?Math.max(0,daysBetween(today,targetQuarter.endDate)):null,
    daysToSelectedStart:selectedQuarter?Math.max(0,daysBetween(today,selectedQuarter.startDate)):null,daysToSelectedEnd:selectedQuarter?Math.max(0,daysBetween(today,selectedQuarter.endDate)):null,
    progressPercent:duration&&elapsed!==null?Math.round((elapsed/duration)*10000)/100:null,years:[...new Set(quarters.map((item)=>item.year))].sort((a,b)=>a-b),quarters};
}
