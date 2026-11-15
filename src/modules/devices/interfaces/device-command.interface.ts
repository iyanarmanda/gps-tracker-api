export interface DeviceCommandPayload {
  device_id: string;
  active: boolean;
  interval_seconds: number;
  timestamp: number;
}
