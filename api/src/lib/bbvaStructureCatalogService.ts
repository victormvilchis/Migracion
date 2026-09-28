import { BbvaStructureCatalogRepository } from './bbvaStructureCatalogRepository.js';
import type { BbvaStructureInput, BbvaStructureLevel, BbvaStructureStatus } from './bbvaStructureCatalogDomain.js';
const repository=new BbvaStructureCatalogRepository();
const text=(value:unknown,max:number)=>{const v=String(value??'').trim().replace(/\s+/g,' ');return v?v.slice(0,max):null;};
export class BbvaStructureCatalogService {
  list(search='',status:BbvaStructureStatus|'ALL'='ACTIVE'){return repository.list(search,status);}
  options(){return repository.options();}
  get(id:string){return repository.get(id);}
  private async input(payload:any):Promise<BbvaStructureInput>{
    const level=Number(payload?.level) as BbvaStructureLevel; if(level!==2&&level!==3)throw Object.assign(new Error('El nivel debe ser 2 o 3.'),{statusCode:400});
    const name=text(payload?.name,220)?.toLocaleUpperCase('es-MX') ?? null; if(!name)throw Object.assign(new Error('El nombre es obligatorio.'),{statusCode:400});
    const parentId=level===3?text(payload?.parentId,36):null;if(level===3&&!parentId)throw Object.assign(new Error('Selecciona la estructura nivel 2 de la que depende.'),{statusCode:400});
    if(parentId){const parent=await repository.get(parentId);if(!parent||parent.level!==2||parent.status!=='ACTIVE')throw Object.assign(new Error('La estructura nivel 2 seleccionada no está disponible.'),{statusCode:400});}
    return {level,parentId,name,description:text(payload?.description,500)};
  }
  async create(payload:any,actor:string){return repository.create(await this.input(payload),actor);}
  async update(id:string,payload:any,actor:string){return repository.update(id,await this.input(payload),actor);}
  async status(id:string,status:unknown,actor:string){const value=String(status??'').toUpperCase();if(!['ACTIVE','INACTIVE'].includes(value))throw Object.assign(new Error('Estado inválido.'),{statusCode:400});return repository.updateStatus(id,value as BbvaStructureStatus,actor);}
  delete(id:string){return repository.delete(id);}
}
