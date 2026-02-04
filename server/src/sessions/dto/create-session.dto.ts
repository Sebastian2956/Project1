import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SwipeMode, TravelMode } from '@prisma/client';

export class CreateSessionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(SwipeMode)
  swipeMode?: SwipeMode;

  @IsOptional()
  @IsInt()
  @Min(2)
  agreeThreshold?: number;

  @IsOptional()
  @IsEnum(TravelMode)
  defaultTravelMode?: TravelMode;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  defaultMaxMinutes?: number;
}
