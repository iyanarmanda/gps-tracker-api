import { TelemetryPayloadDto, telemetryPayloadSchema } from './telemetry.schema';

describe('telemetryPayloadSchema', () => {
  const validPayload = {
    device_id: 'esp32:001',
    lat: -7.257472,
    lng: 112.752088,
    speed: 15.4,
    satellites: 8,
    timestamp: 1793701140,
  };

  describe('valid cases', () => {
    it('should accept with valid payload', () => {
      const result = telemetryPayloadSchema.safeParse(validPayload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('should accept payload without timestamp', () => {
      const payloadWithoutTimestamp = {
        device_id: validPayload.device_id,
        lat: validPayload.lat,
        lng: validPayload.lng,
        speed: validPayload.speed,
        satellites: validPayload.satellites,
      };

      const result = telemetryPayloadSchema.safeParse(payloadWithoutTimestamp);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBeUndefined();
      }
    });

    it('should accept value boundary', () => {
      const boundaryPayload = {
        device_id: 'esp32:boundary',
        lat: -90,
        lng: 180,
        speed: 0,
        satellites: 0,
      };

      const result = telemetryPayloadSchema.safeParse(boundaryPayload);
      expect(result.success).toBe(true);
    });

    it('should initialization via TelemetryPayloadDto.create()', () => {
      const dto = TelemetryPayloadDto.create(validPayload);
      expect(dto).toEqual(validPayload);
    });
  });

  describe('invalid cases', () => {
    it('should reject if device_id empty or not string', () => {
      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, device_id: '' })
          .success,
      ).toBe(false);

      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, device_id: 123 })
          .success,
      ).toBe(false);
    });

    it('should reject if lat out of range (-90 until 90)', () => {
      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, lat: -90.0001 })
          .success,
      ).toBe(false);

      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, lat: 90.0001 })
          .success,
      ).toBe(false);
    });

    it('should reject if lng out of range (-180 until 180)', () => {
      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, lng: -180.0001 })
          .success,
      ).toBe(false);

      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, lng: 180.0001 })
          .success,
      ).toBe(false);
    });

    it('should reject if speed value is negatif', () => {
      const result = telemetryPayloadSchema.safeParse({
        ...validPayload,
        speed: -0.1,
      });

      expect(result.success).toBe(false);
    });

    it('should reject if satellites value is negatif or desimal', () => {
      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, satellites: -1 })
          .success,
      ).toBe(false);

      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, satellites: 4.5 })
          .success,
      ).toBe(false);
    });

    it('should reject if timestamp value is 0, negatif, or desimal', () => {
      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, timestamp: 0 })
          .success,
      ).toBe(false);

      expect(
        telemetryPayloadSchema.safeParse({ ...validPayload, timestamp: -100 })
          .success,
      ).toBe(false);

      expect(
        telemetryPayloadSchema.safeParse({
          ...validPayload,
          timestamp: 1793701140.5,
        }).success,
      ).toBe(false);
    });
  });
});
