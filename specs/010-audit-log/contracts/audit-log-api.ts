export interface GetAuditLogsRequestQuery {
  /**
   * Start time for the query range.
   * Required. Format: ISO 8601 string.
   */
  start_time: string;

  /**
   * End time for the query range.
   * Required. Format: ISO 8601 string.
   * Note: The server will automatically cap future dates to current time (now).
   * The duration between start_time and end_time must be between 1 hour and 30 days.
   */
  end_time: string;

  /**
   * Filter by entity type.
   * Optional.
   */
  entity_type?: string;

  /**
   * Filter by specific entity ID.
   * Optional.
   */
  entity_id?: string;
}

export interface AuditLogEntryResponse {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  result: Record<string, any>;
  timestamp: string; // ISO 8601
  user_id?: string | null;
}

export interface GetAuditLogsResponse {
  data: AuditLogEntryResponse[];
}
