import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TravelMode } from '@prisma/client';

export class DeckInitDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsEnum(TravelMode)
  mode?: TravelMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(120)
  maxMinutes?: number;

  @IsOptional()
  @IsString({ each: true })
  cuisines?: string[];

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  openNow?: boolean;
}
