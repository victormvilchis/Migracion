export type SecondCertificationPlanStatus='PLANNED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED';
export interface SecondCertificationPlan{ id:string;personId:string;collaboratorId:string|null;fullName:string;technology:string|null;certificationId:string;certificationName:string;status:SecondCertificationPlanStatus;targetDate:string|null;notes:string|null;createdAt:string;updatedAt:string;createdByEmail:string;updatedByEmail:string; }
export interface SecondCertificationPlanPayload{personId:string;certificationId:string;status:SecondCertificationPlanStatus;targetDate:string;notes:string;}
export interface SecondCertificationPlanPage{items:SecondCertificationPlan[];page:number;size:number;total:number;totalPages:number;}
