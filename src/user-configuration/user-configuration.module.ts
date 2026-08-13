import { Module } from '@nestjs/common';
import { UserConfigurationController } from './user-configuration.controller';
import { UserConfigurationService } from './user-configuration.service';
import { UserConfigurationStore } from './user-configuration.store';
import { UserConfigurationRateLimitGuard } from './user-configuration-rate-limit.guard';

@Module({
  controllers: [UserConfigurationController],
  providers: [
    UserConfigurationService,
    UserConfigurationStore,
    UserConfigurationRateLimitGuard,
  ],
})
export class UserConfigurationModule {}
