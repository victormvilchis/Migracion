import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { getCurrentUser } from '../lib/authzLocal.js';
import { assertBbvaPermission } from '../lib/bbvaAuthz.js';
import { readBbvaJson } from '../lib/bbvaHttp.js';
import { BbvaUserAdminService } from '../lib/bbvaUserAdminService.js';

const service=new BbvaUserAdminService();
function num(r:HttpRequest,key:string,fallback:number){const n=Number(r.query.get(key));return Number.isFinite(n)?n:fallback;}
function params(r:HttpRequest){return {search:r.query.get('search')??'',status:(r.query.get('status') as any)??'ACTIVE',page:num(r,'page',0),size:num(r,'size',10)};}
function errorResponse(error:unknown,ctx:InvocationContext):HttpResponseInit{
  const e=error as {message?:string;statusCode?:number;number?:number}; const message=e?.message||String(error); ctx.error('[BBVA:UserAdmin]',message);
  if(e.statusCode===400||e.statusCode===403||e.statusCode===404||e.statusCode===409)return {status:e.statusCode,jsonBody:{error:message}};
  if(e.number===2601||e.number===2627||/duplicate|unique/i.test(message))return {status:409,jsonBody:{error:'Ya existe un usuario o rol con los mismos datos de identificación.'}};
  return {status:500,jsonBody:{error:'No fue posible completar la operación de administración.'}};
}

async function users(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{const user=getCurrentUser(request);if(request.method==='GET'){assertBbvaPermission(user,'USER_ADMIN_READ');return {status:200,jsonBody:{...(await service.listUsers(params(request))),storage:'sql-server'}};}assertBbvaPermission(user,'USER_ADMIN_WRITE');const item=await service.createUser(await readBbvaJson(request),user.email);return {status:201,jsonBody:{item}};}catch(e){return errorResponse(e,context);}}
async function userItem(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{const id=request.params.id;if(!id)return {status:400,jsonBody:{error:'ID requerido.'}};const user=getCurrentUser(request);if(request.method==='GET'){assertBbvaPermission(user,'USER_ADMIN_READ');const item=await service.getUser(id);return item?{status:200,jsonBody:{item}}:{status:404,jsonBody:{error:'Usuario no encontrado.'}};}assertBbvaPermission(user,'USER_ADMIN_WRITE');if(request.method==='PUT'){const item=await service.updateUser(id,await readBbvaJson(request),user.email);return item?{status:200,jsonBody:{item}}:{status:404,jsonBody:{error:'Usuario no encontrado.'}};}const deleted=await service.deleteUser(id);return deleted?{status:200,jsonBody:{deleted:true}}:{status:404,jsonBody:{error:'Usuario no encontrado.'}};}catch(e){return errorResponse(e,context);}}
async function userStatus(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{const user=getCurrentUser(request);assertBbvaPermission(user,'USER_ADMIN_WRITE');const body=await readBbvaJson(request);const item=await service.updateUserStatus(request.params.id!,body?.status,user.email);return item?{status:200,jsonBody:{item}}:{status:404,jsonBody:{error:'Usuario no encontrado.'}};}catch(e){return errorResponse(e,context);}}
async function dmOptions(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{assertBbvaPermission(getCurrentUser(request),'USER_ADMIN_READ');return {status:200,jsonBody:{items:await service.deliveryManagerOptions()}};}catch(e){return errorResponse(e,context);}}
async function roles(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{const user=getCurrentUser(request);if(request.method==='GET'){assertBbvaPermission(user,'ROLE_ADMIN_READ');return {status:200,jsonBody:{...(await service.listRoles(params(request)))}};}assertBbvaPermission(user,'ROLE_ADMIN_WRITE');const item=await service.createRole(await readBbvaJson(request),user.email);return {status:201,jsonBody:{item}};}catch(e){return errorResponse(e,context);}}
async function roleOptions(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{assertBbvaPermission(getCurrentUser(request),'ROLE_ADMIN_READ');return {status:200,jsonBody:{items:await service.roleOptions()}};}catch(e){return errorResponse(e,context);}}
async function roleItem(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{const id=request.params.id;if(!id)return {status:400,jsonBody:{error:'ID requerido.'}};const user=getCurrentUser(request);if(request.method==='GET'){assertBbvaPermission(user,'ROLE_ADMIN_READ');const item=await service.getRole(id);return item?{status:200,jsonBody:{item}}:{status:404,jsonBody:{error:'Rol no encontrado.'}};}assertBbvaPermission(user,'ROLE_ADMIN_WRITE');if(request.method==='PUT'){const item=await service.updateRole(id,await readBbvaJson(request),user.email);return item?{status:200,jsonBody:{item}}:{status:404,jsonBody:{error:'Rol no encontrado.'}};}const deleted=await service.deleteRole(id);return deleted?{status:200,jsonBody:{deleted:true}}:{status:404,jsonBody:{error:'Rol no encontrado.'}};}catch(e){return errorResponse(e,context);}}
async function roleStatus(request:HttpRequest,context:InvocationContext):Promise<HttpResponseInit>{try{const user=getCurrentUser(request);assertBbvaPermission(user,'ROLE_ADMIN_WRITE');const body=await readBbvaJson(request);const item=await service.updateRoleStatus(request.params.id!,body?.status,user.email);return item?{status:200,jsonBody:{item}}:{status:404,jsonBody:{error:'Rol no encontrado.'}};}catch(e){return errorResponse(e,context);}}

app.http('bbvaAdminUsers',{methods:['GET','POST'],authLevel:'anonymous',route:'bbva/admin/users',handler:users});
app.http('bbvaAdminUserItem',{methods:['GET','PUT','DELETE'],authLevel:'anonymous',route:'bbva/admin/users/{id}',handler:userItem});
app.http('bbvaAdminUserStatus',{methods:['PATCH'],authLevel:'anonymous',route:'bbva/admin/users/{id}/status',handler:userStatus});
app.http('bbvaAdminDeliveryManagers',{methods:['GET'],authLevel:'anonymous',route:'bbva/admin/user-options/delivery-managers',handler:dmOptions});
app.http('bbvaAdminRoles',{methods:['GET','POST'],authLevel:'anonymous',route:'bbva/admin/roles',handler:roles});
app.http('bbvaAdminRoleOptions',{methods:['GET'],authLevel:'anonymous',route:'bbva/admin/role-options',handler:roleOptions});
app.http('bbvaAdminRoleItem',{methods:['GET','PUT','DELETE'],authLevel:'anonymous',route:'bbva/admin/roles/{id}',handler:roleItem});
app.http('bbvaAdminRoleStatus',{methods:['PATCH'],authLevel:'anonymous',route:'bbva/admin/roles/{id}/status',handler:roleStatus});
