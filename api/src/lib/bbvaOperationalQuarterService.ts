import { BbvaOperationalQuarterRepository, type BbvaOperationalQuarterOverride, type BbvaOperationalQuarterWrite } from './bbvaOperationalQuarterRepository.js';
import {
  BBVA_VENDOR_QUARTERS,
  configuredVendorQuarters,
  defaultOperationalQuarterWindow,
  generatedVendorYear,
  validateOperationalQuarterConfiguration,
  validateVendorSourceConfiguration,
  vendorQuarterContext,
} from './bbvaVendorCalendar.js';

export interface BbvaOperationalQuarterView {
  code:string;year:number;quarter:1|2|3|4;
  sourceStartDate:string;sourceEndDate:string;sourceConfigured:boolean;
  suggestedStartDate:string;suggestedEndDate:string;
  operationalStartDate:string;operationalEndDate:string;
  operationalDerived:boolean;synchronized:boolean;current:boolean;
  updatedAt:string|null;updatedByEmail:string|null;
  deletable:boolean;yearDeletable:boolean;
}

const repository=new BbvaOperationalQuarterRepository();

export class BbvaOperationalQuarterService {
  async list():Promise<BbvaOperationalQuarterView[]> {
    const overrides=await repository.listOverrides();
    const resolved=configuredVendorQuarters(overrides);
    validateVendorSourceConfiguration(resolved);
    validateOperationalQuarterConfiguration(resolved);
    const context=vendorQuarterContext(new Date(),null,overrides);
    const current=context.currentQuarter?.code??null;
    const today=context.referenceDate;
    const overrideMap=new Map(overrides.map((item)=>[item.quarterCode,item]));
    const builtinCodes=new Set(BBVA_VENDOR_QUARTERS.map((item)=>item.code));
    const latest=resolved.at(-1)??null;
    const latestYear=latest?.year??null;
    const yearDeletionAllowed=new Map<number,boolean>();
    for(const year of [...new Set(resolved.map((item)=>item.year))]){
      const yearItems=resolved.filter((item)=>item.year===year);
      const removable=year===latestYear&&yearItems.length>0&&yearItems.every((item)=>Boolean(overrideMap.get(item.code))&&!builtinCodes.has(item.code)&&item.startDate>today&&item.code!==current);
      yearDeletionAllowed.set(year,removable);
    }
    return resolved.map((item)=>{
      const persisted=overrideMap.get(item.code);
      const builtin=BBVA_VENDOR_QUARTERS.find((candidate)=>candidate.code===item.code);
      const sourceStartDate=item.sourceStartDate??builtin?.startDate??item.startDate;
      const sourceEndDate=item.sourceEndDate??builtin?.endDate??item.endDate;
      const derived=defaultOperationalQuarterWindow({startDate:sourceStartDate,endDate:sourceEndDate});
      return {
        code:item.code,year:item.year,quarter:item.quarter,
        sourceStartDate,sourceEndDate,sourceConfigured:Boolean(item.sourceConfigured),
        suggestedStartDate:derived.startDate,suggestedEndDate:derived.endDate,
        operationalStartDate:item.startDate,operationalEndDate:item.endDate,
        operationalDerived:!persisted||(item.startDate===derived.startDate&&item.endDate===derived.endDate),
        synchronized:!persisted||(item.startDate===derived.startDate&&item.endDate===derived.endDate),
        current:item.code===current,
        updatedAt:persisted?.updatedAt??null,updatedByEmail:persisted?.updatedByEmail??null,
        deletable:Boolean(persisted)&&!builtinCodes.has(item.code)&&item.code===latest?.code&&item.startDate>today&&item.code!==current,
        yearDeletable:Boolean(yearDeletionAllowed.get(item.year)),
      };
    });
  }

  async createYear(year:number,actorEmail:string):Promise<{items:BbvaOperationalQuarterView[];year:number}> {
    if(!Number.isInteger(year)||year<2020||year>2100)throw Object.assign(new Error('El año debe estar entre 2020 y 2100.'),{statusCode:400});
    const existing=await repository.listOverrides();
    const configured=configuredVendorQuarters(existing);
    if(configured.some((item)=>item.year===year))throw Object.assign(new Error(`El año ${year} ya está configurado.`),{statusCode:409});
    const currentMax=Math.max(...configured.map((item)=>item.year));
    if(year!==currentMax+1)throw Object.assign(new Error(`Para mantener continuidad, agrega primero el año ${currentMax+1}.`),{statusCode:400});
    const generated=generatedVendorYear(year);
    const rows:BbvaOperationalQuarterWrite[]=generated.map((item)=>{const derived=defaultOperationalQuarterWindow(item);return {quarterCode:item.code,sourceStartDate:item.startDate,sourceEndDate:item.endDate,sourceConfigured:false,operationalStartDate:derived.startDate,operationalEndDate:derived.endDate};});
    const merged=[...existing,...rows.map((row):BbvaOperationalQuarterOverride=>({...row,updatedAt:null,updatedByEmail:actorEmail}))];
    const candidate=configuredVendorQuarters(merged);validateVendorSourceConfiguration(candidate);validateOperationalQuarterConfiguration(candidate);
    await repository.createYear(rows,actorEmail);
    return {items:await this.list(),year};
  }

  async updateConfiguration(code:string,sourceStartDate:string,sourceEndDate:string,operationalStartDate:string,operationalEndDate:string,actorEmail:string):Promise<BbvaOperationalQuarterView[]> {
    const existing=await repository.listOverrides();
    const resolved=configuredVendorQuarters(existing);
    const current=resolved.find((item)=>item.code===code);
    if(!current)throw Object.assign(new Error('Periodo no configurado en el calendario BBVA.'),{statusCode:404});
    if(sourceStartDate>sourceEndDate)throw Object.assign(new Error('La ventana Vendors no es válida.'),{statusCode:400});
    if(operationalStartDate>operationalEndDate)throw Object.assign(new Error('La ventana operativa no es válida.'),{statusCode:400});
    const candidate:BbvaOperationalQuarterOverride={quarterCode:code,sourceStartDate,sourceEndDate,sourceConfigured:true,operationalStartDate,operationalEndDate,updatedAt:null,updatedByEmail:actorEmail};
    const next=[...existing.filter((item)=>item.quarterCode!==code),candidate];
    const configured=configuredVendorQuarters(next);
    validateVendorSourceConfiguration(configured);
    validateOperationalQuarterConfiguration(configured);
    await repository.upsertConfiguration({quarterCode:code,sourceStartDate,sourceEndDate,sourceConfigured:true,operationalStartDate,operationalEndDate},actorEmail);
    const ordered=configured.map((item)=>item.code);const index=ordered.indexOf(code);
    for(const affected of [ordered[index-1],code,ordered[index+1]].filter(Boolean) as string[]) await repository.invalidateMetricSnapshots(affected);
    return this.list();
  }

  async updateSource(code:string,sourceStartDate:string,sourceEndDate:string,actorEmail:string):Promise<BbvaOperationalQuarterView[]> {
    const derived=defaultOperationalQuarterWindow({startDate:sourceStartDate,endDate:sourceEndDate});
    return this.updateConfiguration(code,sourceStartDate,sourceEndDate,derived.startDate,derived.endDate,actorEmail);
  }

  async deletePeriod(code:string):Promise<BbvaOperationalQuarterView[]> {
    const existing=await repository.listOverrides();
    const resolved=configuredVendorQuarters(existing);
    const persisted=existing.find((item)=>item.quarterCode===code);
    const item=resolved.find((candidate)=>candidate.code===code);
    if(!item||!persisted)throw Object.assign(new Error('El periodo no existe como configuración eliminable.'),{statusCode:404});
    if(BBVA_VENDOR_QUARTERS.some((candidate)=>candidate.code===code))throw Object.assign(new Error('Los periodos base del calendario BBVA no se pueden eliminar.'),{statusCode:409});
    const context=vendorQuarterContext(new Date(),null,existing);const latest=resolved.at(-1);
    if(item.code===context.currentQuarter?.code||item.startDate<=context.referenceDate)throw Object.assign(new Error('No puedes eliminar el periodo actual ni un periodo histórico.'),{statusCode:409});
    if(latest?.code!==code)throw Object.assign(new Error(`Para conservar continuidad, elimina primero el periodo más reciente (${latest?.code??'N/D'}).`),{statusCode:409});
    await repository.deletePeriod(code);return this.list();
  }

  async deleteYear(year:number):Promise<BbvaOperationalQuarterView[]> {
    if(!Number.isInteger(year)||year<2020||year>2100)throw Object.assign(new Error('Año inválido.'),{statusCode:400});
    const existing=await repository.listOverrides();const resolved=configuredVendorQuarters(existing);const yearItems=resolved.filter((item)=>item.year===year);
    if(!yearItems.length)throw Object.assign(new Error(`El año ${year} no está configurado.`),{statusCode:404});
    const latestYear=resolved.at(-1)?.year??null;if(year!==latestYear)throw Object.assign(new Error(`Para conservar continuidad, elimina primero el año más reciente (${latestYear??'N/D'}).`),{statusCode:409});
    const context=vendorQuarterContext(new Date(),null,existing);const persistedCodes=new Set(existing.map((item)=>item.quarterCode));const builtinCodes=new Set(BBVA_VENDOR_QUARTERS.map((item)=>item.code));
    const removable=yearItems.every((item)=>persistedCodes.has(item.code)&&!builtinCodes.has(item.code)&&item.startDate>context.referenceDate&&item.code!==context.currentQuarter?.code);
    if(!removable)throw Object.assign(new Error('Sólo se puede eliminar un año futuro agregado manualmente; el año actual, históricos y periodos base están protegidos.'),{statusCode:409});
    await repository.deleteYear(year);return this.list();
  }

  async synchronize(code:string,actorEmail:string):Promise<BbvaOperationalQuarterView[]> {
    const existing=await repository.listOverrides();const resolved=configuredVendorQuarters(existing);const current=resolved.find((item)=>item.code===code);
    if(!current)throw Object.assign(new Error('Periodo no configurado en el calendario BBVA.'),{statusCode:404});
    const sourceStartDate=current.sourceStartDate??current.startDate;const sourceEndDate=current.sourceEndDate??current.endDate;const derived=defaultOperationalQuarterWindow({startDate:sourceStartDate,endDate:sourceEndDate});
    const persisted=existing.find((item)=>item.quarterCode===code);
    await repository.upsertConfiguration({quarterCode:code,sourceStartDate:persisted?.sourceStartDate??sourceStartDate,sourceEndDate:persisted?.sourceEndDate??sourceEndDate,sourceConfigured:persisted?.sourceStartDate?Boolean(persisted.sourceConfigured):Boolean(current.sourceConfigured),operationalStartDate:derived.startDate,operationalEndDate:derived.endDate},actorEmail);
    await repository.invalidateMetricSnapshots(code);return this.list();
  }
}
