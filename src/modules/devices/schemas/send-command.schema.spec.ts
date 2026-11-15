import { SendCommandDto, sendCommandSchema } from './send-command.schema';

describe('sendCommandSchema', () => {
  describe('valid cases', () => {
    it('should accept with valid payload', () => {
      const payload = { active: true, interval: 10 };
      const result = sendCommandSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(payload);
      }
    });

    it('should accept without interval data', () => {
      const payload = { active: false };
      const result = sendCommandSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ active: false });
        expect(result.data.interval).toBeUndefined();
      }
    });

    it('should accept value within minimum (1) dan maximum (3600) on interval', () => {
      expect(
        sendCommandSchema.safeParse({ active: true, interval: 1 }).success,
      ).toBe(true);

      expect(
        sendCommandSchema.safeParse({ active: true, interval: 3600 }).success,
      ).toBe(true);
    });

    it('should initialization via SendCommandDto.create()', () => {
      const dto = SendCommandDto.create({ active: true, interval: 5 });
      expect(dto).toEqual({ active: true, interval: 5 });
    });
  });

  describe('invalid cases', () => {
    it('should reject if active empty or not boolean', () => {
      expect(sendCommandSchema.safeParse({}).success).toBe(false);
      expect(sendCommandSchema.safeParse({ active: 'true' }).success).toBe(
        false,
      );
      expect(sendCommandSchema.safeParse({ active: 1 }).success).toBe(false);
    });

    it('should reject if interval less than 1 or more than 3600', () => {
      expect(
        sendCommandSchema.safeParse({ active: true, interval: 0 }).success,
      ).toBe(false);

      expect(
        sendCommandSchema.safeParse({ active: true, interval: -5 }).success,
      ).toBe(false);

      expect(
        sendCommandSchema.safeParse({ active: true, interval: 3601 }).success,
      ).toBe(false);
    });

    it('should reject if interval type is decimal or string', () => {
      expect(
        sendCommandSchema.safeParse({ active: true, interval: 2.5 }).success,
      ).toBe(false);

      expect(
        sendCommandSchema.safeParse({ active: true, interval: '10' }).success,
      ).toBe(false);
    });
  });
});
