export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'datetime-local';
  required?: boolean;
}

export const entitySchemas: Record<string, FormField[]> = {
  Technicians: [
    { name: 'firstName', label: 'First Name', type: 'text', required: true },
    { name: 'lastName', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text', required: true },
  ],
  ServiceBays: [
    { name: 'name', label: 'Bay Name', type: 'text', required: true },
  ],
  Customers: [
    { name: 'firstName', label: 'First Name', type: 'text', required: true },
    { name: 'lastName', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
  ],
  Vehicles: [
    { name: 'customerId', label: 'Customer ID', type: 'text', required: true },
    { name: 'vin', label: 'VIN', type: 'text', required: true },
    { name: 'licensePlate', label: 'License Plate', type: 'text', required: true },
    { name: 'make', label: 'Make', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
  ],
  ServiceTypes: [
    { name: 'name', label: 'Service Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text', required: false },
    { name: 'estimatedDurationMinutes', label: 'Estimated Duration (mins)', type: 'number', required: true },
  ],
  Tenants: [
    { name: 'name', label: 'Tenant Name', type: 'text', required: true },
  ],
  // Appointments have custom handling based on context. 
  // Update only updates status. Create requires specific fields.
  AppointmentsCreate: [
    { name: 'customerId', label: 'Customer ID', type: 'text', required: true },
    { name: 'vehicleId', label: 'Vehicle ID', type: 'text', required: true },
    { name: 'serviceTypeId', label: 'Service Type ID', type: 'text', required: true },
    { name: 'technicianId', label: 'Technician ID (optional)', type: 'text', required: false },
    { name: 'serviceBayId', label: 'Service Bay ID (optional)', type: 'text', required: false },
    { name: 'scheduledStartTime', label: 'Start Time', type: 'datetime-local', required: true },
    { name: 'scheduledEndTime', label: 'End Time', type: 'datetime-local', required: true },
    { name: 'notes', label: 'Notes', type: 'text', required: false },
  ],
  AppointmentsUpdate: [
    { name: 'status', label: 'Status (e.g. Scheduled, InProgress, Completed)', type: 'text', required: true },
  ],
};
