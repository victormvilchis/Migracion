import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { readBbvaJson } from '../lib/bbvaHttp.js';
import { BbvaOperationalQuarterRepository, type BbvaOperationalQuarterOverride, type BbvaOperationalQuarterWrite } from '../lib/bbvaOperationalQuarterRepository.js';
import {
  BBVA_VENDOR_QUARTERS,
  configuredVendorQuarters,
  defaultOperationalQuarterWindow,
  generatedVendorYear,
  validateOperationalQuarterConfiguration,
  validateVendorSourceConfiguration,
  vendorQuarterContext,
} from '../lib/bbvaVendorCalendar.js';

const repository = new BbvaOperationalQuarterRepository();

function isoDate(value: unknown, label: string): string {
  const candidate = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) {
    throw Object.assign(new Error(`${label} debe tener formato YYYY-MM-DD.`), { statusCode: 400 });
  }
  return candidate;
}
function quarterCode(value:unknown):string{const code=String(value??'').trim().toUpperCase();if(!/^\d{4}Q[1-4]$/.test(code))throw Object.assign(new Error('Periodo inválido.'),{statusCode:400});return code;}

async function payload() {
  const overrides = await repository.listOverrides();
  const resolved = configuredVendorQuarters(overrides);
  const current = vendorQuarterContext(new Date(), null, overrides).currentQuarter?.code ?? null;
  const overrideMap = new Map(overrides.map((item) => [item.quarterCode, item]));
  return resolved.map((item) => {
    const persisted=overrideMap.get(item.code);
    const builtin=BBVA_VENDOR_QUARTERS.find((candidate)=>candidate.code===item.code);
    const sourceStartDate=item.sourceStartDate??builtin?.startDate??item.startDate;
    const sourceEndDate=item.sourceEndDate??builtin?.endDate??item.endDate;
    const suggested=defaultOperationalQuarterWindow({startDate:sourceStartDate,endDate:sourceEndDate});
    return {
      code:item.code,year:item.year,quarter:item.quarter,
      sourceStartDate,sourceEndDate,
      sourceConfigured:builtin?true:Boolean(persisted?.sourceConfigured),
      suggestedStartDate:suggested.startDate,suggestedEndDate:suggested.endDate,
      operationalStartDate:item.startDate,operationalEndDate:item.endDate,
      overridden:item.startDate!==suggested.startDate||item.endDate!==suggested.endDate,
      current:item.code===current,
      updatedAt:persisted?.updatedAt??null,updatedByEmail:persisted?.updatedByEmail??null,
    };
  });
}

function errorResponse(error: unknown, context: InvocationContext): HttpResponseInit {
  const value = error as { message?: string; statusCode?: number };
  const message = value?.message || String(error);
  context.error('[BBVA:OperationalQuarter] Error:', message);
  if (value.statusCode === 403) return { status: 403, jsonBody: { error: message } };
  if (value.statusCode === 400 || value.statusCode === 409) return { status: value.statusCode, jsonBody: { error: message } };
  return { status: 500, jsonBody: { error: 'No fue posible completar la configuración de periodos operativos.' } };
}

async function collectionHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    if(request.method==='GET'){
      assertBbvaPermission(user, 'CATALOG_READ');
      return { status: 200, jsonBody: { items: await payload(), storage: 'sql-server' } };
    }
    if(request.method!=='POST')return {status:405,jsonBody:{error:'Método no permitido.'}};
    assertBbvaPermission(user,'CATALOG_WRITE');
    const body=await readBbvaJson(request);const year=Number(body?.year);
    if(!Number.isInteger(year)||year<2020||year>2100)throw Object.assign(new Error('El año debe estar entre 2020 y 2100.'),{statusCode:400});
    const existing=await repository.listOverrides();
    const configured=configuredVendorQuarters(existing);
    if(configured.some((item)=>item.year===year))throw Object.assign(new Error(`El año ${year} ya está configurado.`),{statusCode:409});
    const currentMax=Math.max(...configured.map((item)=>item.year));
    if(year!==currentMax+1)throw Object.assign(new Error(`Para mantener continuidad, agrega primero el año ${currentMax+1}.`),{statusCode:400});
    const generated=generatedVendorYear(year);
    const rows:BbvaOperationalQuarterWrite[]=generated.map((item)=>{const suggested=defaultOperationalQuarterWindow(item);return {quarterCode:item.code,sourceStartDate:item.startDate,sourceEndDate:item.endDate,sourceConfigured:false,operationalStartDate:suggested.startDate,operationalEndDate:suggested.endDate};});
    const merged=[...existing,...rows.map((row):BbvaOperationalQuarterOverride=>({...row,updatedAt:null,updatedByEmail:user.email}))];
    const candidate=configuredVendorQuarters(merged);validateVendorSourceConfiguration(candidate);validateOperationalQuarterConfiguration(candidate);
    await repository.createYear(rows,user.email);
    return {status:201,jsonBody:{items:await payload(),year}};
  } catch (error) { return errorResponse(error, context); }
}

async function itemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = getCurrentUser(request);
    assertBbvaPermission(user, 'CATALOG_WRITE');
    const code = quarterCode(request.params.code);
    const existing=await repository.listOverrides();
    const resolved=configuredVendorQuarters(existing);
    const current=resolved.find((item)=>item.code===code);
    if(!current) return { status: 404, jsonBody: { error: 'Periodo no configurado en el calendario BBVA.' } };
    const sourceStartDate=current.sourceStartDate??current.startDate;const sourceEndDate=current.sourceEndDate??current.endDate;
    if (request.method === 'DELETE') {
      const suggested=defaultOperationalQuarterWindow({startDate:sourceStartDate,endDate:sourceEndDate});
      await repository.resetOperational(code,suggested.startDate,suggested.endDate,user.email);
      return { status: 200, jsonBody: { items: await payload(), reset: true } };
    }
    if (request.method !== 'PUT') return { status: 405, jsonBody: { error: 'Método no permitido.' } };
    const body = await readBbvaJson(request);
    const nextSourceStart=isoDate(body?.sourceStartDate??sourceStartDate,'El inicio Vendors');
    const nextSourceEnd=isoDate(body?.sourceEndDate??sourceEndDate,'El fin Vendors');
    if(nextSourceStart>nextSourceEnd)throw Object.assign(new Error('La ventana Vendors no es válida.'),{statusCode:400});
    const operationalStartDate = isoDate(body?.operationalStartDate, 'El inicio operativo');
    const operationalEndDate = isoDate(body?.operationalEndDate, 'El fin operativo');
    const candidate: BbvaOperationalQuarterOverride = { quarterCode: code, sourceStartDate:nextSourceStart,sourceEndDate:nextSourceEnd,sourceConfigured:true, operationalStartDate, operationalEndDate, updatedAt: null, updatedByEmail: user.email };
    const next = [...existing.filter((item) => item.quarterCode !== code), candidate];
    const configured=configuredVendorQuarters(next);validateVendorSourceConfiguration(configured);validateOperationalQuarterConfiguration(configured);
    await repository.upsertConfiguration({quarterCode:code,sourceStartDate:nextSourceStart,sourceEndDate:nextSourceEnd,sourceConfigured:true,operationalStartDate,operationalEndDate}, user.email);
    return { status: 200, jsonBody: { items: await payload() } };
  } catch (error) { return errorResponse(error, context); }
}

app.http('bbvaOperationalQuarters', { methods: ['GET','POST'], authLevel: 'anonymous', route: 'bbva/operational-quarters', handler: collectionHandler });
app.http('bbvaOperationalQuarterItem', { methods: ['PUT','DELETE'], authLevel: 'anonymous', route: 'bbva/operational-quarters/{code}', handler: itemHandler });
