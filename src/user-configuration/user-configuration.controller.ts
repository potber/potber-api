import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { SessionResource } from 'src/auth/resources/session.resource';
import {
  UserConfigurationResource,
  UserConfigurationWriteResource,
} from './resources/user-configuration.resource';
import { UserConfigurationService } from './user-configuration.service';
import { UserConfigurationRateLimitGuard } from './user-configuration-rate-limit.guard';

interface AuthenticatedRequest {
  user: SessionResource;
}

@Controller('user-configuration')
@ApiTags('User configuration')
@UseGuards(JwtAuthGuard, UserConfigurationRateLimitGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@ApiBearerAuth('access-token')
export class UserConfigurationController {
  constructor(private readonly service: UserConfigurationService) {}

  @Get()
  @ApiOperation({
    summary: 'Returns the current user’s opaque encrypted configuration.',
  })
  @ApiOkResponse({ type: UserConfigurationResource })
  find(@Request() request: AuthenticatedRequest) {
    return this.service.find(request.user.userId);
  }

  @Put()
  @ApiOperation({
    summary: 'Creates or replaces the current user’s encrypted configuration.',
  })
  @ApiOkResponse({ type: UserConfigurationResource })
  write(
    @Body() body: UserConfigurationWriteResource,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.service.write(request.user.userId, body);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Deletes the current user’s encrypted configuration.',
  })
  @ApiNoContentResponse()
  delete(@Request() request: AuthenticatedRequest) {
    return this.service.delete(request.user.userId);
  }
}
