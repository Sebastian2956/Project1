import { Readable } from 'stream';
import { Injectable } from '@nestjs/common';
import { Place, Provider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { estimateEtaMinutes, haversineMeters } from '../common/utils/geo';

export interface PlaceResult {
  place: Place;
  distanceMeters: number;
  etaMinutes: number;
}

interface SearchParams {
  lat: number;
  lng: number;
  mode: 'WALK' | 'DRIVE' | 'ANY';
  maxMinutes?: number;
  cuisines?: string[];
  price?: string;
  openNow?: boolean;
}

const DETAILS_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async searchNearby(params: SearchParams): Promise<PlaceResult[]> {
    if (process.env.PLACES_PROVIDER !== 'GOOGLE') {
      throw new Error('Only Google Places is implemented in this MVP');
    }

    const speedKmh = params.mode === 'WALK' ? 5 : params.mode === 'DRIVE' ? 35 : 20;
    const radiusMeters = params.maxMinutes
      ? Math.max(500, Math.round((params.maxMinutes * speedKmh * 1000) / 60))
      : 2000;

    const nearby = await this.fetchGoogleNearby(params.lat, params.lng, radiusMeters, params);

    const results: PlaceResult[] = [];
    for (const item of nearby) {
      const existing = await this.prisma.place.findUnique({
        where: { provider_providerPlaceId: { provider: Provider.GOOGLE, providerPlaceId: item.place_id } },
      });

      let place = existing;

      if (!place) {
        place = await this.prisma.place.create({
          data: {
            provider: Provider.GOOGLE,
            providerPlaceId: item.place_id,
            name: item.name,
            address: item.vicinity || item.formatted_address || null,
            lat: item.geometry?.location?.lat ?? null,
            lng: item.geometry?.location?.lng ?? null,
            rating: item.rating ?? null,
            priceLevel: item.price_level ?? null,
            categoriesJson: item.types ?? null,
          },
        });
      }

      const needsDetails = !place.updatedAt || Date.now() - place.updatedAt.getTime() > DETAILS_TTL_MS;
      if (needsDetails) {
        const details = await this.fetchGoogleDetails(item.place_id);
        if (details) {
          place = await this.prisma.place.update({
            where: { id: place.id },
            data: {
              address: details.formatted_address ?? place.address,
              phone: details.formatted_phone_number ?? place.phone,
              websiteUrl: details.website ?? place.websiteUrl,
              hoursJson: details.opening_hours ?? place.hoursJson,
              photosJson: details.photos ?? place.photosJson,
              categoriesJson: details.types ?? place.categoriesJson,
              rating: details.rating ?? place.rating,
              priceLevel: details.price_level ?? place.priceLevel,
              lat: details.geometry?.location?.lat ?? place.lat,
              lng: details.geometry?.location?.lng ?? place.lng,
            },
          });
        }
      }

      const distanceMeters = place.lat && place.lng
        ? haversineMeters(params.lat, params.lng, place.lat, place.lng)
        : 0;
      const etaMinutes = estimateEtaMinutes(distanceMeters, params.mode);

      results.push({ place, distanceMeters, etaMinutes });
    }

    return results;
  }

  async fetchPhotoStream(photoRef: string) {
    const key = process.env.PLACES_API_KEY;
    if (!key) {
      throw new Error('PLACES_API_KEY is missing');
    }
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${key}`;
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error('Failed to fetch photo');
    }
    const body = Readable.fromWeb(response.body as unknown as ReadableStream);
    return body;
  }

  private async fetchGoogleNearby(
    lat: number,
    lng: number,
    radiusMeters: number,
    params: SearchParams,
  ) {
    const key = process.env.PLACES_API_KEY;
    if (!key) {
      throw new Error('PLACES_API_KEY is missing');
    }

    const query = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radiusMeters),
      type: 'restaurant',
      key,
    });

    if (params.openNow) {
      query.set('opennow', 'true');
    }

    if (params.cuisines?.length) {
      query.set('keyword', params.cuisines.join(' '));
    }

    if (params.price) {
      const priceInt = Number(params.price);
      if (!Number.isNaN(priceInt)) {
        query.set('minprice', String(priceInt));
        query.set('maxprice', String(priceInt));
      }
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${query.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results ?? [];
  }

  private async fetchGoogleDetails(placeId: string) {
    const key = process.env.PLACES_API_KEY;
    if (!key) {
      throw new Error('PLACES_API_KEY is missing');
    }

    const fields = [
      'formatted_address',
      'formatted_phone_number',
      'geometry',
      'opening_hours',
      'photos',
      'price_level',
      'rating',
      'types',
      'website',
    ];

    const query = new URLSearchParams({
      place_id: placeId,
      fields: fields.join(','),
      key,
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${query.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.result ?? null;
  }
}
