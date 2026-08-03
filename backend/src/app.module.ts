import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { dataSourceOptions } from './config/data-source';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';
import { TransferWindowsModule } from './transfer-windows/transfer-windows.module';
import { PaymentGatewayModule } from './payment-gateway/payment-gateway.module';
import { TransferRequestsModule } from './transfer-requests/transfer-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    ScheduleModule.forRoot(),
    AuthModule,
    TeamsModule,
    PlayersModule,
    TransferWindowsModule,
    PaymentGatewayModule,
    TransferRequestsModule,
  ],
})
export class AppModule {}
