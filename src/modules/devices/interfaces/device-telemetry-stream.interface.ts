export interface DeviceTelemetryStreamData {
  espId: string;
  lat: number;
  lng: number;
  speed: number;
  satellites: number;
  active: boolean;
  updatedAt: number;
}
