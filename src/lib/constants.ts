export const MachineCriticality = {
  A: 'A',
  B: 'B',
  C: 'C',
} as const;

export const MachineStatus = {
  RUNNING: 'RUNNING',
  DOWN: 'DOWN',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
} as const;

export const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const FaultType = {
  MAN: 'MAN',
  MACHINE: 'MACHINE',
  MATERIAL: 'MATERIAL',
  METHOD: 'METHOD',
} as const;

export const WoType = {
  BREAKDOWN: 'BREAKDOWN',
  PREVENTIVE: 'PREVENTIVE',
  INSPECTION: 'INSPECTION',
  CALIBRATION: 'CALIBRATION',
} as const;

export const WoPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const WoStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
} as const;

export const RoleCode = {
  WORKER: 'WORKER',
  OPERATOR: 'OPERATOR',
  TECHNICIAN: 'TECHNICIAN',
  SUPERVISOR: 'SUPERVISOR',
  MANAGER: 'MANAGER',
  SUPPORT: 'SUPPORT',
} as const;
