import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api')
export class UsersController {
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { id: string; email: string }) {
    return { id: user.id, email: user.email };
  }
}
