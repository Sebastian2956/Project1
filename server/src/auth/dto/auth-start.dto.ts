import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthStartDto {
  @IsEmail()
  email!: string;
}
