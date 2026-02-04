import { IsString, MinLength } from 'class-validator';

export class AuthRefreshDto {
  @IsString()
  @MinLength(8)
  refreshToken!: string;
}
