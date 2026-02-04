import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { DeckGroup, SwipeMode, TravelMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlacesService } from '../places/places.service';
import { deterministicShuffle } from '../common/utils/shuffle';
import { estimateEtaMinutes, haversineMeters } from '../common/utils/geo';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { DeckInitDto } from './dto/deck-init.dto';

const PAGE_SIZE = 8;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeGenerator = customAlphabet(CODE_ALPHABET, 6);

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly placesService: PlacesService,
    private readonly realtime: RealtimeService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto) {
    const code = await this.generateUniqueCode();
    const session = await this.prisma.session.create({
      data: {
        code,
        hostUserId: userId,
        name: dto.name,
        swipeMode: dto.swipeMode ?? SwipeMode.ALL_MUST_AGREE,
        agreeThreshold: dto.agreeThreshold ?? null,
        defaultTravelMode: dto.defaultTravelMode ?? TravelMode.ANY,
        defaultMaxMinutes: dto.defaultMaxMinutes ?? null,
        members: {
          create: {
            userId,
          },
        },
      },
      include: { members: true },
    });
    return session;
  }

  async joinSession(userId: string, code: string) {
    const session = await this.prisma.session.findUnique({ where: { code } });
    if (!session || !session.isActive) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.sessionMember.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      update: { leftAt: null },
      create: { sessionId: session.id, userId },
    });

    return this.getSessionState(userId, session.id);
  }

  async getSessionState(userId: string, sessionId: string) {
    await this.assertMember(userId, sessionId);
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        members: { include: { user: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async setReady(userId: string, sessionId: string, isReady: boolean) {
    await this.assertMember(userId, sessionId);
    await this.prisma.sessionMember.update({
      where: { sessionId_userId: { sessionId, userId } },
      data: { isReady },
    });
    this.realtime.emitToSession(sessionId, 'session:update', { sessionId });
    return { ok: true };
  }

  async leaveSession(userId: string, sessionId: string) {
    await this.assertMember(userId, sessionId);
    await this.prisma.sessionMember.update({
      where: { sessionId_userId: { sessionId, userId } },
      data: { leftAt: new Date(), isReady: false },
    });
    this.realtime.emitToSession(sessionId, 'session:update', { sessionId });
    return { ok: true };
  }

  async endSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.hostUserId !== userId) {
      throw new ForbiddenException('Only host can end the session');
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false, endedAt: new Date() },
    });
    this.realtime.emitToSession(sessionId, 'session:update', { sessionId });
    return { ok: true };
  }

  async initDeck(userId: string, sessionId: string, dto: DeckInitDto) {
    await this.assertMember(userId, sessionId);

    const existingCount = await this.prisma.sessionDeckItem.count({
      where: { sessionId, deckGroup: DeckGroup.NEAR },
    });

    if (existingCount > 0) {
      return this.getDeckPage(userId, sessionId, {
        group: DeckGroup.NEAR,
        pageCursor: 0,
        lat: dto.lat,
        lng: dto.lng,
        mode: dto.mode ?? 'ANY',
      });
    }

    const results = await this.placesService.searchNearby({
      lat: dto.lat,
      lng: dto.lng,
      mode: dto.mode ?? 'ANY',
      maxMinutes: dto.maxMinutes,
      cuisines: dto.cuisines,
      price: dto.price,
      openNow: dto.openNow,
    });

    const placeIds = results.map((r) => r.place.id);
    const shuffled = deterministicShuffle(placeIds, `${sessionId}-NEAR`);

    await this.prisma.sessionDeckItem.createMany({
      data: shuffled.map((placeId, index) => ({
        sessionId,
        placeId,
        deckGroup: DeckGroup.NEAR,
        rank: index,
      })),
      skipDuplicates: true,
    });

    return this.getDeckPage(userId, sessionId, {
      group: DeckGroup.NEAR,
      pageCursor: 0,
      lat: dto.lat,
      lng: dto.lng,
      mode: dto.mode ?? 'ANY',
    });
  }

  async expandDeck(userId: string, sessionId: string, dto: { lat: number; lng: number; mode?: TravelMode; maxMinutes?: number }) {
    await this.assertMember(userId, sessionId);

    const existing = await this.prisma.sessionDeckItem.findMany({
      where: { sessionId },
      select: { placeId: true },
    });
    const existingIds = new Set(existing.map((e) => e.placeId));

    const results = await this.placesService.searchNearby({
      lat: dto.lat,
      lng: dto.lng,
      mode: dto.mode ?? 'ANY',
      maxMinutes: dto.maxMinutes ?? 60,
    });

    const placeIds = results
      .map((r) => r.place.id)
      .filter((id) => !existingIds.has(id));

    const shuffled = deterministicShuffle(placeIds, `${sessionId}-FAR`);

    const existingCount = await this.prisma.sessionDeckItem.count({
      where: { sessionId, deckGroup: DeckGroup.FAR },
    });

    await this.prisma.sessionDeckItem.createMany({
      data: shuffled.map((placeId, index) => ({
        sessionId,
        placeId,
        deckGroup: DeckGroup.FAR,
        rank: existingCount + index,
      })),
      skipDuplicates: true,
    });

    return this.getDeckPage(userId, sessionId, {
      group: DeckGroup.FAR,
      pageCursor: 0,
      lat: dto.lat,
      lng: dto.lng,
      mode: dto.mode ?? 'ANY',
    });
  }

  async getDeckPage(
    userId: string,
    sessionId: string,
    params: {
      pageCursor?: number;
      group?: DeckGroup;
      lat?: number;
      lng?: number;
      mode?: 'WALK' | 'DRIVE' | 'ANY';
    },
  ) {
    await this.assertMember(userId, sessionId);
    const group = params.group ?? DeckGroup.NEAR;
    const pageCursor = params.pageCursor ?? 0;

    const items = await this.prisma.sessionDeckItem.findMany({
      where: { sessionId, deckGroup: group },
      include: { place: true },
      orderBy: { rank: 'asc' },
      skip: pageCursor,
      take: PAGE_SIZE,
    });

    const nextCursor = items.length === PAGE_SIZE ? pageCursor + PAGE_SIZE : null;

    const cardItems = items.map((item) => {
      const lat = params.lat;
      const lng = params.lng;
      const mode = params.mode ?? 'ANY';

      const distanceMeters = lat && lng && item.place.lat && item.place.lng
        ? haversineMeters(lat, lng, item.place.lat, item.place.lng)
        : null;

      const etaMinutes = distanceMeters !== null
        ? estimateEtaMinutes(distanceMeters, mode)
        : null;

      return {
        id: item.id,
        group: item.deckGroup,
        rank: item.rank,
        place: item.place,
        distanceMeters,
        etaMinutes,
      };
    });

    if (cardItems.length === 0 && group === DeckGroup.NEAR) {
      this.realtime.emitToSession(sessionId, 'deck:exhausted', { group: 'NEAR' });
    }

    return { items: cardItems, nextCursor };
  }

  private async assertMember(userId: string, sessionId: string) {
    const member = await this.prisma.sessionMember.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (!member || member.leftAt) {
      throw new ForbiddenException('Not a session member');
    }
  }

  private async generateUniqueCode() {
    for (let i = 0; i < 5; i += 1) {
      const code = codeGenerator();
      const existing = await this.prisma.session.findUnique({ where: { code } });
      if (!existing) {
        return code;
      }
    }
    return codeGenerator();
  }
}
