import { IsString, IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  toId!: number;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
