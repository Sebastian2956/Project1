import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, sha256 } from '../common/utils/crypto';

const MAGIC_LINK_TTL_MINUTES = 15;
const ACCESS_TOKEN_TTL_MINUTES = 15;
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  async startMagicLink(email: string) {
    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const token = randomToken(24);
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

    await this.prisma.magicLinkToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const response: Record<string, string> = {
      ok: 'true',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.verificationToken = token;
    }

    return response;
  }

  async verifyMagicLink(token: string) {
    const tokenHash = sha256(token);
    const record = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    return this.issueTokens(record.userId);
  }

  async refresh(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(token.userId);
  }

  async logout(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async issueTokens(userId: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      { secret: process.env.JWT_SECRET, expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m` },
    );

    const refreshToken = randomToken(32);
    const tokenHash = sha256(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresInMinutes: ACCESS_TOKEN_TTL_MINUTES,
    };
  }
}
