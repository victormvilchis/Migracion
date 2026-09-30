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
  code:string;
  year:number;
  quarter:1|2|3|4;
  sourceStartDate:string;
  sourceEndDate:string;
  sourceConfigured:boolean;
  suggestedStartDate:string;
  suggestedEndDate:string;
  operationalStartDate:string;
  operationalEndDate:string;
  operationalDerived:true;
  synchronized:boolean;
  current:boolean;
  updatedAt:string|null;
  updatedByEmail:string|null;
}

const repository=new BbvaOperationalQuarterRepository();

export class BbvaOperationalQuarterService {
  async list():Promise<BbvaOperationalQuarterView[]> {
    const overrides=await repository.listOverrides();
    const resolved=configuredVendorQuarters(overrides);
    validateVendorSourceConfiguration(resolved);
    validateOperationalQuarterConfiguration(resolved);
    const current=vendorQuarterContext(new Date(),null,overrides).currentQuarter?.code??null;
    const overrideMap=new Map(overrides.map((item)=>[item.quarterCode,item]));
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
        operationalStartDate:derived.startDate,operationalEndDate:derived.endDate,
        operationalDerived:true as const,
        synchronized:!persisted||(persisted.operationalStartDate===derived.startDate&&persisted.operationalEndDate===derived.endDate),
        current:item.code===current,
        updatedAt:persisted?.updatedAt??null,updatedByEmail:persisted?.updatedByEmail??null,
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
    const rows:BbvaOperationalQuarterWrite[]=generated.map((item)=>{
      const derived=defaultOperationalQuarterWindow(item);
      return {quarterCode:item.code,sourceStartDate:item.startDate,sourceEndDate:item.endDate,sourceConfigured:false,operationalStartDate:derived.startDate,operationalEndDate:derived.endDate};
    });
    const merged=[...existing,...rows.map((row):BbvaOperationalQuarterOverride=>({...row,updatedAt:null,updatedByEmail:actorEmail}))];
    const candidate=configuredVendorQuarters(merged);
    validateVendorSourceConfiguration(candidate);
    validateOperationalQuarterConfiguration(candidate);
    await repository.createYear(rows,actorEmail);
    return {items:await this.list(),year};
  }

  async updateSource(code:string,sourceStartDate:string,sourceEndDate:string,actorEmail:string):Promise<BbvaOperationalQuarterView[]> {
    const existing=await repository.listOverrides();
    const resolved=configuredVendorQuarters(existing);
    const current=resolved.find((item)=>item.code===code);
    if(!current)throw Object.assign(new Error('Periodo no configurado en el calendario BBVA.'),{statusCode:404});
    if(sourceStartDate>sourceEndDate)throw Object.assign(new Error('La ventana Vendors no es válida.'),{statusCode:400});
    const derived=defaultOperationalQuarterWindow({startDate:sourceStartDate,endDate:sourceEndDate});
    const candidate:BbvaOperationalQuarterOverride={quarterCode:code,sourceStartDate,sourceEndDate,sourceConfigured:true,operationalStartDate:derived.startDate,operationalEndDate:derived.endDate,updatedAt:null,updatedByEmail:actorEmail};
    const next=[...existing.filter((item)=>item.quarterCode!==code),candidate];
    const configured=configuredVendorQuarters(next);
    validateVendorSourceConfiguration(configured);
    validateOperationalQuarterConfiguration(configured);
    await repository.upsertConfiguration({quarterCode:code,sourceStartDate,sourceEndDate,sourceConfigured:true,operationalStartDate:derived.startDate,operationalEndDate:derived.endDate},actorEmail);
    await repository.invalidateMetricSnapshots(code);
    return this.list();
  }

  async synchronize(code:string,actorEmail:string):Promise<BbvaOperationalQuarterView[]> {
    const existing=await repository.listOverrides();
    const resolved=configuredVendorQuarters(existing);
    const current=resolved.find((item)=>item.code===code);
    if(!current)throw Object.assign(new Error('Periodo no configurado en el calendario BBVA.'),{statusCode:404});
    const sourceStartDate=current.sourceStartDate??current.startDate;
    const sourceEndDate=current.sourceEndDate??current.endDate;
    const derived=defaultOperationalQuarterWindow({startDate:sourceStartDate,endDate:sourceEndDate});
    const persisted=existing.find((item)=>item.quarterCode===code);
    await repository.upsertConfiguration({quarterCode:code,sourceStartDate:persisted?.sourceStartDate??sourceStartDate,sourceEndDate:persisted?.sourceEndDate??sourceEndDate,sourceConfigured:persisted?.sourceStartDate?Boolean(persisted.sourceConfigured):Boolean(current.sourceConfigured),operationalStartDate:derived.startDate,operationalEndDate:derived.endDate},actorEmail);
    await repository.invalidateMetricSnapshots(code);
    return this.list();
  }
}
