import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, SwipeDecision, SwipeMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class SwipesService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async recordSwipe(userId: string, sessionId: string, placeId: string, decision: SwipeDecision) {
    await this.assertMember(userId, sessionId);

    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      throw new NotFoundException('Place not found');
    }

    try {
      await this.prisma.swipe.create({
        data: {
          sessionId,
          userId,
          placeId,
          decision,
        },
      });
    } catch {
      throw new ConflictException('Swipe already recorded');
    }

    const snapshot = await this.updateMatchSnapshot(sessionId, placeId);

    this.realtime.emitToSession(sessionId, 'match:update', {
      placeId,
      yesCount: snapshot.yesCount,
      noCount: snapshot.noCount,
      status: snapshot.status,
    });

    return { ok: true, snapshot };
  }

  private async updateMatchSnapshot(sessionId: string, placeId: string) {
    const [session, swipes] = await Promise.all([
      this.prisma.session.findUnique({ where: { id: sessionId } }),
      this.prisma.swipe.findMany({
        where: { sessionId, placeId },
        select: { decision: true },
      }),
    ]);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const yesCount = swipes.filter((s) => s.decision === SwipeDecision.YES).length;
    const noCount = swipes.filter((s) => s.decision === SwipeDecision.NO).length;

    const activeMembers = await this.prisma.sessionMember.count({
      where: { sessionId, leftAt: null },
    });

    let status: MatchStatus = MatchStatus.NONE;
    if (session.swipeMode === SwipeMode.ALL_MUST_AGREE) {
      if (yesCount > 0 && yesCount === activeMembers) {
        status = MatchStatus.MATCH;
      } else if (yesCount >= 2) {
        status = MatchStatus.PARTIAL;
      }
    } else {
      const threshold = session.agreeThreshold ?? Math.max(2, Math.ceil(activeMembers / 2));
      if (yesCount >= threshold) {
        status = yesCount === activeMembers ? MatchStatus.MATCH : MatchStatus.PARTIAL;
      }
    }

    return this.prisma.matchSnapshot.upsert({
      where: { sessionId_placeId: { sessionId, placeId } },
      update: { yesCount, noCount, status },
      create: { sessionId, placeId, yesCount, noCount, status },
    });
  }

  private async assertMember(userId: string, sessionId: string) {
    const member = await this.prisma.sessionMember.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (!member || member.leftAt) {
      throw new ForbiddenException('Not a session member');
    }
  }
}
