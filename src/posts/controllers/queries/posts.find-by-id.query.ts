import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class PostsFindByIdQuery {
  @IsNumberString()
  threadId: string;

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
