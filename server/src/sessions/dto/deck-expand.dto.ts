import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TravelMode } from '@prisma/client';

export class DeckExpandDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxMinutes?: number;

  @IsOptional()
  @IsEnum(TravelMode)
  mode?: TravelMode;
}
