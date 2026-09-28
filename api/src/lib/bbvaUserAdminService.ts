import type { BbvaAdminListParams, BbvaAdminStatus, BbvaSystemRolePayload, BbvaSystemUserPayload } from './bbvaUserAdminDomain.js';
import { BbvaUserAdminRepository } from './bbvaUserAdminRepository.js';

const repository = new BbvaUserAdminRepository();
function clean(value:unknown,max:number){const text=String(value??'').trim().replace(/\s+/g,' ');return text?text.slice(0,max):null;}
function required(value:unknown,label:string,max:number){const v=clean(value,max);if(!v)throw Object.assign(new Error(`${label} es obligatorio.`),{statusCode:400});return v;}
function status(value:unknown):BbvaAdminStatus{if(value!=='ACTIVE'&&value!=='INACTIVE')throw Object.assign(new Error('Estado inválido.'),{statusCode:400});return value;}
function roleIds(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.map((x)=>String(x??'').trim()).filter(Boolean))]:[];}

export class BbvaUserAdminService {
  listUsers(params:BbvaAdminListParams){return repository.listUsers(params);}
  getUser(id:string){return repository.userById(id);}
  deliveryManagerOptions(){return repository.userOptions('DELIVERY_MANAGER');}
  async resolveDeliveryManagerName(value:unknown){const name=required(value,'El Delivery Manager',220);const item=await repository.activeDeliveryManagerByName(name);if(!item)throw Object.assign(new Error('Selecciona un Delivery Manager activo del módulo de Usuarios.'),{statusCode:400,code:'INVALID_DELIVERY_MANAGER'});return item.fullName;}
  async createUser(payload:any,actor:string){return repository.createUser(this.userPayload(payload),actor);}
  async updateUser(id:string,payload:any,actor:string){return repository.updateUser(id,this.userPayload(payload),actor);}
  updateUserStatus(id:string,value:unknown,actor:string){return repository.updateUserStatus(id,status(value),actor);}
  deleteUser(id:string){return repository.deleteUser(id);}
  reassignDeliveryManager(id:string,targetUserId:unknown,actor:string){return repository.reassignDeliveryManager(id,required(targetUserId,'El Delivery Manager destino',80),actor);}

  listRoles(params:BbvaAdminListParams){return repository.listRoles(params);}
  getRole(id:string){return repository.roleById(id);}
  roleOptions(){return repository.roleOptions();}
  createRole(payload:any,actor:string){return repository.createRole(this.rolePayload(payload),actor);}
  updateRole(id:string,payload:any,actor:string){return repository.updateRole(id,this.rolePayload(payload),actor);}
  updateRoleStatus(id:string,value:unknown,actor:string){return repository.updateRoleStatus(id,status(value),actor);}
  deleteRole(id:string){return repository.deleteRole(id);}

  private userPayload(payload:any):BbvaSystemUserPayload{
    const email=clean(payload?.email,255)?.toLowerCase()??null;
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Object.assign(new Error('El correo no tiene un formato válido.'),{statusCode:400});
    const roles=roleIds(payload?.roleIds);
    if(!roles.length)throw Object.assign(new Error('Selecciona al menos un rol.'),{statusCode:400});
    return { fullName:required(payload?.fullName,'El nombre',220),email,corporateUser:clean(payload?.corporateUser,100)?.toUpperCase()??null,softtekCode:clean(payload?.softtekCode,80)?.toUpperCase()??null,roleIds:roles };
  }
  private rolePayload(payload:any):BbvaSystemRolePayload{
    return {name:required(payload?.name,'El nombre',120),description:clean(payload?.description,500),isDeliveryManager:Boolean(payload?.isDeliveryManager)};
  }
}
