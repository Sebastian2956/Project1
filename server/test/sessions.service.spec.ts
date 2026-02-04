import { Test } from '@nestjs/testing';
import { SessionsService } from '../src/sessions/sessions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PlacesService } from '../src/places/places.service';
import { RealtimeService } from '../src/realtime/realtime.service';
import { resetDb, prisma } from './setup';
import { DeckGroup, SwipeMode } from '@prisma/client';

class MockPlacesService {
  constructor(private readonly places: any[]) {}

  async searchNearby() {
    return this.places;
  }
}

describe('SessionsService', () => {
  let service: SessionsService;
  let mockPlacesService: MockPlacesService;

  beforeAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const user = await prisma.user.create({ data: { email: 'a@example.com' } });
    const place1 = await prisma.place.create({
      data: {
        provider: 'GOOGLE',
        providerPlaceId: 'p1',
        name: 'Alpha',
      },
    });
    const place2 = await prisma.place.create({
      data: {
        provider: 'GOOGLE',
        providerPlaceId: 'p2',
        name: 'Beta',
      },
    });
    const place3 = await prisma.place.create({
      data: {
        provider: 'GOOGLE',
        providerPlaceId: 'p3',
        name: 'Gamma',
      },
    });

    mockPlacesService = new MockPlacesService([
      { place: place1, distanceMeters: 100, etaMinutes: 2 },
      { place: place2, distanceMeters: 200, etaMinutes: 4 },
      { place: place3, distanceMeters: 300, etaMinutes: 6 },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionsService,
        PrismaService,
        { provide: PlacesService, useValue: mockPlacesService },
        { provide: RealtimeService, useValue: { emitToSession: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(SessionsService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates session with host member', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: 'a@example.com' } });
    const session = await service.createSession(user.id, { name: 'Dinner' });

    const members = await prisma.sessionMember.findMany({ where: { sessionId: session.id } });
    expect(members.length).toBe(1);
    expect(members[0].userId).toBe(user.id);
  });

  it('joins session by code', async () => {
    const host = await prisma.user.findFirstOrThrow({ where: { email: 'a@example.com' } });
    const session = await service.createSession(host.id, { name: 'Night' });

    const user2 = await prisma.user.create({ data: { email: 'b@example.com' } });
    await service.joinSession(user2.id, session.code);

    const members = await prisma.sessionMember.findMany({ where: { sessionId: session.id } });
    expect(members.length).toBe(2);
  });

  it('builds deterministic deck order', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: 'a@example.com' } });
    const session = await service.createSession(user.id, { name: 'Shuffle', swipeMode: SwipeMode.ALL_MUST_AGREE });

    const first = await service.initDeck(user.id, session.id, { lat: 1, lng: 2 });
    const second = await service.getDeckPage(user.id, session.id, { group: DeckGroup.NEAR, pageCursor: 0 });

    const firstIds = first.items.map((i: any) => i.place.id);
    const secondIds = second.items.map((i: any) => i.place.id);
    expect(firstIds).toEqual(secondIds);
  });

  it('expand deck avoids duplicates', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: 'a@example.com' } });
    const session = await service.createSession(user.id, { name: 'Expand' });

    await service.initDeck(user.id, session.id, { lat: 1, lng: 2 });

    const expand = await service.expandDeck(user.id, session.id, { lat: 1, lng: 2, maxMinutes: 60 });
    const nearIds = (await prisma.sessionDeckItem.findMany({
      where: { sessionId: session.id, deckGroup: DeckGroup.NEAR },
    })).map((i) => i.placeId);

    const farIds = expand.items.map((i: any) => i.place.id);
    const overlap = farIds.filter((id: string) => nearIds.includes(id));
    expect(overlap.length).toBe(0);
  });
});
