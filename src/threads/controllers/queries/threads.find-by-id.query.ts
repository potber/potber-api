import {
  IsBoolean,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TransformBooleanString } from 'src/utility/transformers/boolean-string.transformer';

export class ThreadsFindByIdQuery {
  @IsNumberString()
  @IsOptional()
  postId?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @TransformBooleanString('updateBookmark')
  @IsBoolean()
  @IsOptional()
  updateBookmark: boolean;

  @IsString()
  @IsOptional()
  include?: string;

  get includeRichMessage() {
    return this.include
      ?.split(',')
      .map((value) => value.trim())
      .includes('richMessage');
  }
}
