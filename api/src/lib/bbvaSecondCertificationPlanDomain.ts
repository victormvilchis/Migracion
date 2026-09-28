export type SecondCertificationPlanStatus='PLANNED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED';
export interface SecondCertificationPlanRecord{id:string;personId:string;collaboratorId:string|null;fullName:string;technology:string|null;certificationId:string;certificationName:string;status:SecondCertificationPlanStatus;targetDate:string|null;notes:string|null;createdAt:string;updatedAt:string;createdByEmail:string;updatedByEmail:string;}
export interface SecondCertificationPlanInput{personId:string;certificationId:string;status:SecondCertificationPlanStatus;targetDate:string|null;notes:string|null;}
export interface SecondCertificationPlanPage{items:SecondCertificationPlanRecord[];page:number;size:number;total:number;totalPages:number;}
