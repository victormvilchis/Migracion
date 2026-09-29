import { fetchApi } from '../../lib/api';
import type { StructureOption,StructurePayload,StructureRecord,StructureStatus } from '../types/structureCatalog';
export const structureCatalogApi={
 list:(search='',status:StructureStatus|'ALL'='ACTIVE')=>fetchApi<{items:StructureRecord[]}>(`/bbva/structures?search=${encodeURIComponent(search)}&status=${status}`),
 options:()=>fetchApi<{items:StructureOption[]}>('/bbva/structure-options'),
 get:(id:string)=>fetchApi<{item:StructureRecord}>(`/bbva/structures/${id}`),
 create:(payload:StructurePayload)=>fetchApi<{item:StructureRecord}>('/bbva/structures',{method:'POST',body:JSON.stringify(payload)}),
 update:(id:string,payload:StructurePayload)=>fetchApi<{item:StructureRecord}>(`/bbva/structures/${id}`,{method:'PUT',body:JSON.stringify(payload)}),
 status:(id:string,status:StructureStatus)=>fetchApi<{item:StructureRecord}>(`/bbva/structures/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
};
