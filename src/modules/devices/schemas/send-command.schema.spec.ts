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

    it.each([2, 5, 10, 30])('should accept interval %i second', (interval) => {
      const payload = { active: true, interval };
      const result = sendCommandSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(payload);
      }
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

    it.each([0, 1, 3, 7, 15, 60, 3600, -5, 2.5, '10'])(
      'should reject if interval outer than [2, 5, 10, 30]: %p',
      (invalidInterval) => {
        const result = sendCommandSchema.safeParse({
          active: true,
          interval: invalidInterval,
        });

        expect(result.success).toBe(false);
      },
    );
  });
});
