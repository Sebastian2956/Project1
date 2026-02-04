import { Test } from '@nestjs/testing';
import { SwipesService } from '../src/swipes/swipes.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RealtimeService } from '../src/realtime/realtime.service';
import { resetDb, prisma } from './setup';
import { SwipeDecision, SwipeMode } from '@prisma/client';

describe('SwipesService', () => {
  let service: SwipesService;
  let sessionId: string;
  let user1Id: string;
  let user2Id: string;
  let placeId: string;

  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();

    const user1 = await prisma.user.create({ data: { email: 'u1@example.com' } });
    const user2 = await prisma.user.create({ data: { email: 'u2@example.com' } });
    const session = await prisma.session.create({
      data: {
        code: 'ABC123',
        hostUserId: user1.id,
        name: 'Test',
        swipeMode: SwipeMode.ALL_MUST_AGREE,
        members: { create: [{ userId: user1.id }, { userId: user2.id }] },
      },
    });

    const place = await prisma.place.create({
      data: {
        provider: 'GOOGLE',
        providerPlaceId: 'px',
        name: 'Place X',
      },
    });

    user1Id = user1.id;
    user2Id = user2.id;
    sessionId = session.id;
    placeId = place.id;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SwipesService,
        PrismaService,
        { provide: RealtimeService, useValue: { emitToSession: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(SwipesService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('enforces swipe uniqueness', async () => {
    await service.recordSwipe(user1Id, sessionId, placeId, SwipeDecision.YES);
    await expect(
      service.recordSwipe(user1Id, sessionId, placeId, SwipeDecision.NO),
    ).rejects.toThrow('Swipe already recorded');
  });

  it('creates unanimous match when all members swipe yes', async () => {
    await service.recordSwipe(user1Id, sessionId, placeId, SwipeDecision.YES);
    const result = await service.recordSwipe(user2Id, sessionId, placeId, SwipeDecision.YES);
    expect(result.snapshot.status).toBe('MATCH');
  });

  it('creates partial match when some members swipe yes', async () => {
    await service.recordSwipe(user1Id, sessionId, placeId, SwipeDecision.YES);
    const snapshot = await prisma.matchSnapshot.findUnique({
      where: { sessionId_placeId: { sessionId, placeId } },
    });
    expect(snapshot?.status).toBe('PARTIAL');
  });

  it('keeps none status when only no votes', async () => {
    await service.recordSwipe(user1Id, sessionId, placeId, SwipeDecision.NO);
    const snapshot = await prisma.matchSnapshot.findUnique({
      where: { sessionId_placeId: { sessionId, placeId } },
    });
    expect(snapshot?.status).toBe('NONE');
  });
});
