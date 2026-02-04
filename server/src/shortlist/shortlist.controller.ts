import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ShortlistService } from './shortlist.service';

@Controller('api/sessions/:id/shortlist')
@UseGuards(AuthGuard)
export class ShortlistController {
  constructor(private readonly shortlistService: ShortlistService) {}

  @Get()
  async get(
    @CurrentUser() user: { id: string },
    @Param('id') sessionId: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLng = lng ? Number(lng) : undefined;
    return this.shortlistService.getShortlist(user.id, sessionId, parsedLat, parsedLng);
  }
}
