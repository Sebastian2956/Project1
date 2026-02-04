import { IsBoolean } from 'class-validator';

export class ReadyDto {
  @IsBoolean()
  isReady!: boolean;
}
