import { fetchApi } from '../../lib/api';
export interface OperationalQuarterItem {code:string;year:number;quarter:1|2|3|4;sourceStartDate:string;sourceEndDate:string;sourceConfigured:boolean;suggestedStartDate:string;suggestedEndDate:string;operationalStartDate:string;operationalEndDate:string;operationalDerived:boolean;synchronized:boolean;current:boolean;updatedAt:string|null;updatedByEmail:string|null;deletable:boolean;yearDeletable:boolean;}
export interface OperationalQuarterDraft {sourceStartDate:string;sourceEndDate:string;operationalStartDate:string;operationalEndDate:string;}
export const operationalQuarterApi={
  list:()=>fetchApi<{items:OperationalQuarterItem[]}>('/bbva/operational-quarters'),
  createYear:(year:number)=>fetchApi<{items:OperationalQuarterItem[];year:number}>('/bbva/operational-quarters',{method:'POST',body:JSON.stringify({year})}),
  update:(code:string,payload:OperationalQuarterDraft)=>fetchApi<{items:OperationalQuarterItem[]}>(`/bbva/operational-quarters/${encodeURIComponent(code)}`,{method:'PUT',body:JSON.stringify(payload)}),
  remove:(code:string)=>fetchApi<{items:OperationalQuarterItem[];deleted:string}>(`/bbva/operational-quarters/${encodeURIComponent(code)}`,{method:'DELETE'}),
  removeYear:(year:number)=>fetchApi<{items:OperationalQuarterItem[];deletedYear:number}>(`/bbva/operational-quarter-years/${year}`,{method:'DELETE'}),
  synchronize:(code:string)=>fetchApi<{items:OperationalQuarterItem[];synchronized:string}>(`/bbva/operational-quarters/${encodeURIComponent(code)}/synchronize`,{method:'POST'}),
};
