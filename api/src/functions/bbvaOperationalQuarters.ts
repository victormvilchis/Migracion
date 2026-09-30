import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { readBbvaJson } from '../lib/bbvaHttp.js';
import { BbvaOperationalQuarterService } from '../lib/bbvaOperationalQuarterService.js';

const service=new BbvaOperationalQuarterService();
// Regla multiaño V31.9 preservada en servicio: para mantener continuidad, "agrega primero el año" siguiente.

function isoDate(value:unknown,label:string):string{
  const candidate=String(value??'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(candidate)||Number.isNaN(Date.parse(`${candidate}T00:00:00Z`)))throw Object.assign(new Error(`${label} debe tener formato YYYY-MM-DD.`),{statusCode:400});
  return candidate;
}
function quarterCode(value:unknown):string{const code=String(value??'').trim().toUpperCase();if(!/^\d{4}Q[1-4]$/.test(code))throw Object.assign(new Error('Periodo inválido.'),{statusCode:400});return code;}
function errorResponse(error:unknown,context:InvocationContext):HttpResponseInit{
  const value=error as {message?:string;statusCode?:number};const message=value?.message||String(error);
  context.error('[BBVA:OperationalQuarter] Error:',message);
  if([400,403,404,409].includes(Number(value.statusCode)))return {status:Number(value.statusCode),jsonBody:{error:message}};
  return {status:500,jsonBody:{error:'No fue posible completar la configuración de periodos operativos.'}};
}

async function collectionHandler(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{
  try{
    const user=getCurrentUser(request);
    if(request.method==='GET'){
      assertBbvaPermission(user,'CATALOG_READ');
      return {status:200,jsonBody:{items:await service.list(),storage:'sql-server'}};
    }
    if(request.method!=='POST')return {status:405,jsonBody:{error:'Método no permitido.'}};
    assertBbvaPermission(user,'CATALOG_WRITE');
    const body=await readBbvaJson(request);const year=Number(body?.year);
    const result=await service.createYear(year,user.email);
    return {status:201,jsonBody:result};
  }catch(error){return errorResponse(error,context);}
}

async function itemHandler(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{
  try{
    const user=getCurrentUser(request);assertBbvaPermission(user,'CATALOG_WRITE');
    const code=quarterCode(request.params.code);
    if(request.method==='DELETE')return {status:200,jsonBody:{items:await service.synchronize(code,user.email),reset:true}};
    if(request.method!=='PUT')return {status:405,jsonBody:{error:'Método no permitido.'}};
    const body=await readBbvaJson(request);
    const sourceStartDate=isoDate(body?.sourceStartDate,'El inicio Vendors');
    const sourceEndDate=isoDate(body?.sourceEndDate,'El fin Vendors');
    // La API NO acepta límites operativos autoritativos: se derivan exclusivamente de Vendors.
    return {status:200,jsonBody:{items:await service.updateSource(code,sourceStartDate,sourceEndDate,user.email)}};
  }catch(error){return errorResponse(error,context);}
}

app.http('bbvaOperationalQuarters',{methods: ['GET','POST'],authLevel:'anonymous',route:'bbva/operational-quarters',handler:collectionHandler});
app.http('bbvaOperationalQuarterItem',{methods: ['PUT','DELETE'],authLevel:'anonymous',route:'bbva/operational-quarters/{code}',handler:itemHandler});
