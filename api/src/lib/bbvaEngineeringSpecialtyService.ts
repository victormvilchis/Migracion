import { BbvaEngineeringSpecialtyRepository } from './bbvaEngineeringSpecialtyRepository.js';
import type { EngineeringSpecialtyInput,EngineeringSpecialtyStatus } from './bbvaEngineeringSpecialtyDomain.js';
const repo=new BbvaEngineeringSpecialtyRepository();const clean=(v:unknown,max=220)=>{const x=String(v??'').trim().replace(/\s+/g,' ');return x?x.slice(0,max):null};const upper=(v:unknown,max=220)=>clean(v,max)?.toLocaleUpperCase('es-MX')??null;
export class BbvaEngineeringSpecialtyService{
 list(search:string,status:EngineeringSpecialtyStatus|'ALL',page:number,size:number){return repo.list(search,status,page,size)} get(id:string){return repo.get(id)}
 private input(payload:any):EngineeringSpecialtyInput{const n3=upper(payload?.n3,180),guild=upper(payload?.guild),specialty=upper(payload?.specialty);if(!n3||!guild||!specialty)throw Object.assign(new Error('N3, gremio y especialidad son obligatorios.'),{statusCode:400});return{n3,guild,specialty,guildLeader:upper(payload?.guildLeader),specialtyOwner:upper(payload?.specialtyOwner),portfolioStaffing:upper(payload?.portfolioStaffing),staffer:upper(payload?.staffer)};}
 create(payload:any,actor:string){return repo.create(this.input(payload),actor)} update(id:string,payload:any,actor:string){return repo.update(id,this.input(payload),actor)} status(id:string,status:EngineeringSpecialtyStatus,actor:string){if(!['ACTIVE','INACTIVE'].includes(status))throw Object.assign(new Error('Estado inválido.'),{statusCode:400});return repo.status(id,status,actor)}
}
