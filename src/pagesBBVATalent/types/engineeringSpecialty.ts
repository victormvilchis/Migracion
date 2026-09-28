export type EngineeringSpecialtyStatus='ACTIVE'|'INACTIVE';
export interface EngineeringSpecialty{ id:string;n3:string;guild:string;specialty:string;guildLeader:string|null;specialtyOwner:string|null;portfolioStaffing:string|null;staffer:string|null;status:EngineeringSpecialtyStatus;createdAt:string;updatedAt:string;createdByEmail:string;updatedByEmail:string; }
export interface EngineeringSpecialtyPayload{n3:string;guild:string;specialty:string;guildLeader:string;specialtyOwner:string;portfolioStaffing:string;staffer:string;}
export interface EngineeringSpecialtyPage{items:EngineeringSpecialty[];page:number;size:number;total:number;totalPages:number;}
