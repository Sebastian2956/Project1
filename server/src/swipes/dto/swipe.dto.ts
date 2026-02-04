import { IsEnum, IsString } from 'class-validator';
import { SwipeDecision } from '@prisma/client';

export class SwipeDto {
  @IsString()
  placeId!: string;

  @IsEnum(SwipeDecision)
  decision!: SwipeDecision;
}
