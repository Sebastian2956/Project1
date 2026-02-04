import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { ReadyDto } from './dto/ready.dto';
import { DeckInitDto } from './dto/deck-init.dto';
import { DeckPageDto } from './dto/deck-page.dto';
import { DeckExpandDto } from './dto/deck-expand.dto';

@Controller('api/sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(user.id, dto);
  }

  @Post('join')
  async join(@CurrentUser() user: { id: string }, @Body() dto: JoinSessionDto) {
    return this.sessionsService.joinSession(user.id, dto.code);
  }

  @Get(':id')
  async get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.sessionsService.getSessionState(user.id, id);
  }

  @Post(':id/ready')
  async ready(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: ReadyDto) {
    return this.sessionsService.setReady(user.id, id, dto.isReady);
  }

  @Post(':id/leave')
  async leave(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.sessionsService.leaveSession(user.id, id);
  }

  @Post(':id/end')
  async end(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.sessionsService.endSession(user.id, id);
  }

  @Post(':id/deck/init')
  async initDeck(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: DeckInitDto,
  ) {
    return this.sessionsService.initDeck(user.id, id, dto);
  }

  @Get(':id/deck')
  async deck(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query() query: DeckPageDto,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('mode') mode?: string,
  ) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLng = lng ? Number(lng) : undefined;
    return this.sessionsService.getDeckPage(user.id, id, {
      pageCursor: query.pageCursor,
      group: query.group,
      lat: parsedLat,
      lng: parsedLng,
      mode: mode as 'WALK' | 'DRIVE' | 'ANY' | undefined,
    });
  }

  @Post(':id/deck/expand')
  async expandDeck(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: DeckExpandDto,
  ) {
    return this.sessionsService.expandDeck(user.id, id, dto);
  }
}
