export type EngineeringSpecialtyStatus='ACTIVE'|'INACTIVE';
export interface EngineeringSpecialtyRecord{
 id:string;n3:string;guild:string;specialty:string;guildLeader:string|null;specialtyOwner:string|null;portfolioStaffing:string|null;staffer:string|null;status:EngineeringSpecialtyStatus;createdAt:string;updatedAt:string;createdByEmail:string;updatedByEmail:string;
}
export interface EngineeringSpecialtyInput{n3:string;guild:string;specialty:string;guildLeader:string|null;specialtyOwner:string|null;portfolioStaffing:string|null;staffer:string|null;}
export interface EngineeringSpecialtyPage{items:EngineeringSpecialtyRecord[];page:number;size:number;total:number;totalPages:number;}
