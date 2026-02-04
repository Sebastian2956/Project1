import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DeckGroup } from '@prisma/client';

export class DeckPageDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pageCursor?: number;

  @IsOptional()
  @IsEnum(DeckGroup)
  group?: DeckGroup;
}
