export type StructureLevel=2|3;
export type StructureStatus='ACTIVE'|'INACTIVE';
export interface StructureRecord{ id:string;level:StructureLevel;parentId:string|null;parentName:string|null;name:string;description:string|null;status:StructureStatus;usageCount:number;childCount:number;createdAt:string;updatedAt:string;createdByEmail:string;updatedByEmail:string; }
export interface StructureOption{ id:string;level:StructureLevel;parentId:string|null;parentName:string|null;name:string; }
export interface StructurePayload{ level:StructureLevel;parentId:string|null;name:string;description:string|null; }
