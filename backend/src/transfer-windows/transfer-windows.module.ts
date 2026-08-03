import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferRequest, TransferWindow } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { TransferWindowsService } from './transfer-windows.service';
import { TransferWindowsController } from './transfer-windows.controller';
import { InternalSweepController } from './internal-sweep.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransferWindow, TransferRequest]), AuthModule],
  controllers: [TransferWindowsController, InternalSweepController],
  providers: [TransferWindowsService],
  exports: [TransferWindowsService],
})
export class TransferWindowsModule {}
