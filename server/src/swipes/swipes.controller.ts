import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SwipesService } from './swipes.service';
import { SwipeDto } from './dto/swipe.dto';

@Controller('api/sessions/:id/swipes')
@UseGuards(AuthGuard)
export class SwipesController {
  constructor(private readonly swipesService: SwipesService) {}

  @Post()
  async swipe(
    @CurrentUser() user: { id: string },
    @Param('id') sessionId: string,
    @Body() dto: SwipeDto,
  ) {
    return this.swipesService.recordSwipe(user.id, sessionId, dto.placeId, dto.decision);
  }
}
