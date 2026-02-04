import { ForbiddenException, Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { estimateEtaMinutes, haversineMeters } from '../common/utils/geo';

@Injectable()
export class ShortlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getShortlist(userId: string, sessionId: string, lat?: number, lng?: number) {
    await this.assertMember(userId, sessionId);

    const snapshots = await this.prisma.matchSnapshot.findMany({
      where: { sessionId, status: { in: [MatchStatus.PARTIAL, MatchStatus.MATCH] } },
      include: { place: true },
    });

    const items = snapshots.map((s) => {
      const distanceMeters = lat && lng && s.place.lat && s.place.lng
        ? haversineMeters(lat, lng, s.place.lat, s.place.lng)
        : null;
      const etaMinutes = distanceMeters !== null
        ? estimateEtaMinutes(distanceMeters, 'ANY')
        : null;
      return {
        place: s.place,
        yesCount: s.yesCount,
        noCount: s.noCount,
        status: s.status,
        distanceMeters,
        etaMinutes,
      };
    });

    const matches = items.filter((i) => i.status === MatchStatus.MATCH);
    const partials = items
      .filter((i) => i.status === MatchStatus.PARTIAL)
      .sort((a, b) => {
        if (b.yesCount !== a.yesCount) return b.yesCount - a.yesCount;
        const ratingA = a.place.rating ?? 0;
        const ratingB = b.place.rating ?? 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        const distA = a.distanceMeters ?? Number.MAX_SAFE_INTEGER;
        const distB = b.distanceMeters ?? Number.MAX_SAFE_INTEGER;
        return distA - distB;
      });

    return { matches, partials };
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
