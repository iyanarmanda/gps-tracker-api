import { Module } from '@nestjs/common';
import { ThrottlerModule } from '../../config/throttler/throttler.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [ThrottlerModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
