export type InitialCertificationPhase = 'FIRST_ATTEMPT' | 'SECOND_ATTEMPT';
export type InitialCertificationTiming = 'ON_TIME' | 'DUE_TODAY' | 'OVERDUE';

export interface InitialCertificationScheduleInput {
  bbvaStartDate: string | null | undefined;
  initialCompletionDays: number | null | undefined;
  initialDueDate?: string | null;
  currentCycle: number;
  baseStatus: string;
  applicable: boolean;
  requiresAttempts: boolean;
  attemptCount: number;
  latestAttemptResult?: string | null;
}

export interface InitialCertificationSchedule {
  firstAttemptDueDate: string | null;
  completionDueDate: string | null;
  phase: InitialCertificationPhase | null;
  dueDate: string | null;
  daysRemaining: number | null;
  timing: InitialCertificationTiming | null;
}

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;

function dateEpoch(value: string | null | undefined): number | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const [year,month,day]=value.split('-').map(Number);
  const epoch=Date.UTC(year,month-1,day);
  return Number.isNaN(epoch)?null:epoch;
}

export function addCalendarDays(value: string | null | undefined, days: number | null | undefined): string | null {
  const epoch=dateEpoch(value);
  if (epoch===null || !days || days<1) return null;
  const date=new Date(epoch);
  date.setUTCDate(date.getUTCDate()+Math.trunc(days));
  return date.toISOString().slice(0,10);
}

export function calendarDayDiff(fromIso: string, toIso: string | null | undefined): number | null {
  const from=dateEpoch(fromIso);
  const to=dateEpoch(toIso);
  if (from===null || to===null) return null;
  return Math.round((to-from)/86_400_000);
}

export function deriveInitialCertificationSchedule(input: InitialCertificationScheduleInput, todayIso: string): InitialCertificationSchedule {
  const completionDays=input.initialCompletionDays && input.initialCompletionDays>0 ? Math.trunc(input.initialCompletionDays) : null;
  const firstAttemptDays=completionDays ? Math.ceil(completionDays/2) : null;
  const firstAttemptDueDate=addCalendarDays(input.bbvaStartDate,firstAttemptDays);
  const completionDueDate=input.initialDueDate ?? addCalendarDays(input.bbvaStartDate,completionDays);

  if (!input.applicable || !input.requiresAttempts || input.currentCycle!==1 || input.baseStatus==='APPROVED' || input.baseStatus==='NOT_APPLICABLE') {
    return { firstAttemptDueDate,completionDueDate,phase:null,dueDate:null,daysRemaining:null,timing:null };
  }

  let phase:InitialCertificationPhase|null=null;
  let dueDate:string|null=null;
  if (input.attemptCount===0) {
    phase='FIRST_ATTEMPT';
    dueDate=firstAttemptDueDate;
  } else if (input.attemptCount===1 && String(input.latestAttemptResult??'').toUpperCase()==='FAILED') {
    phase='SECOND_ATTEMPT';
    dueDate=completionDueDate;
  }

  const daysRemaining=dueDate ? calendarDayDiff(todayIso,dueDate) : null;
  const timing=daysRemaining===null ? null : daysRemaining<0 ? 'OVERDUE' : daysRemaining===0 ? 'DUE_TODAY' : 'ON_TIME';
  return { firstAttemptDueDate,completionDueDate,phase,dueDate,daysRemaining,timing };
}
