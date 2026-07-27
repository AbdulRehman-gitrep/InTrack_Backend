import { IsOptional, IsInt, IsString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../../common/enums/task-status.enum';

export class FindAllTasksDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  internId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  managerId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
