import { IsString, MinLength } from 'class-validator';

export class AuthVerifyDto {
  @IsString()
  @MinLength(8)
  token!: string;
}
