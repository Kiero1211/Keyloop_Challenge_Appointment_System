export interface Appointment {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  serviceTypeId: string;
  technicianId: string;
  serviceBayId: string;
  status: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
