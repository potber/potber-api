import { ApiProperty } from '@nestjs/swagger';
import {
  IsBase64,
  IsInt,
  IsOptional,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UserConfigurationWriteResource {
  @ApiProperty({
    description: 'The encrypted payload format version.',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(1)
  version: number;

  @ApiProperty({
    description: 'The 96-bit AES-GCM initialization vector, base64 encoded.',
  })
  @IsBase64()
  @Length(16, 16)
  iv: string;

  @ApiProperty({
    description: 'The opaque AES-GCM ciphertext, base64 encoded.',
  })
  @IsBase64()
  @MinLength(1)
  @MaxLength(65536)
  ciphertext: string;

  @ApiProperty({
    description:
      'The last revision observed by the client. Omit only when creating the first revision.',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRevision?: number;
}

export class UserConfigurationResource {
  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty()
  iv: string;

  @ApiProperty()
  ciphertext: string;

  @ApiProperty({ example: 1 })
  revision: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
