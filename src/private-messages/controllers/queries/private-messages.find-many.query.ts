import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PrivateMessageFolder } from 'src/private-messages/types';
import { TransformBooleanString } from 'src/utility/transformers/boolean-string.transformer';

export class PrivateMessagesFindManyQuery {
  @ApiPropertyOptional({
    description: 'The message folder to filter by.',
    enum: PrivateMessageFolder,
    enumName: 'PrivateMessageFolder',
  })
  @IsEnum(PrivateMessageFolder)
  @IsOptional()
  folder?: PrivateMessageFolder;

  @TransformBooleanString('unread')
  @IsBoolean()
  @IsOptional()
  unread?: boolean;
}
