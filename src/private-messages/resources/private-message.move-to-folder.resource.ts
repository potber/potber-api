import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PrivateMessageFolder } from 'src/private-messages/types';

export class PrivateMessagesMoveToFolderResource {
  @ApiProperty({
    description: 'The target folder.',
    enum: PrivateMessageFolder,
    enumName: 'PrivateMessageFolder',
  })
  @IsEnum(PrivateMessageFolder)
  folder: PrivateMessageFolder;
}
