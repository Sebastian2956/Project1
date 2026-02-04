import { IsString, Length } from 'class-validator';

export class JoinSessionDto {
  @IsString()
  @Length(4, 8)
  code!: string;
}
