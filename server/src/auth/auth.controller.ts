import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthStartDto } from './dto/auth-start.dto';
import { AuthVerifyDto } from './dto/auth-verify.dto';
import { AuthRefreshDto } from './dto/auth-refresh.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('start')
  async start(@Body() dto: AuthStartDto) {
    return this.authService.startMagicLink(dto.email);
  }

  @Post('verify')
  async verify(@Body() dto: AuthVerifyDto) {
    return this.authService.verifyMagicLink(dto.token);
  }

  @Post('refresh')
  async refresh(@Body() dto: AuthRefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: AuthRefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
