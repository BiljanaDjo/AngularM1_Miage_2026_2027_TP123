import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TrackService } from './track.service';
import { Page } from '../models/page.model';
import { Track } from '../models/track.model';

describe('TrackService', () => {
  let service: TrackService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TrackService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TrackService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('list() transmet les query parameters page et limit', () => {
    const mockPage: Page<Track> = {
      items: [
        {
          id: 'track-1',
          title: 'Little Wing',
          originalName: 'little_wing.mp3',
          mimeType: 'audio/mpeg',
          size: 4096000,
          createdAt: '2026-10-15T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 2,
      pages: 3,
    };

    service.list(2, 5).subscribe((page) => {
      expect(page).toEqual(mockPage);
      expect(page.items.length).toBe(1);
      expect(page.page).toBe(2);
    });

    const req = httpTesting.expectOne((request) => {
      return (
        request.url === '/api/tracks' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '5'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('delete() appelle DELETE /api/tracks/:id', () => {
    const trackId = 'track-to-delete-123';

    service.delete(trackId).subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpTesting.expectOne(`/api/tracks/${trackId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('upload() envoie le FormData et transmet les options de suivi de progression', () => {
    const mockFile = new File(['dummy audio content'], 'solo.mp3', { type: 'audio/mpeg' });
    const mockTrack: Track = {
      id: 'new-track-id',
      title: 'Solo Blues',
      originalName: 'solo.mp3',
      mimeType: 'audio/mpeg',
      size: 19,
      createdAt: '2026-10-15T12:00:00.000Z',
    };

    service.upload(mockFile, 'Solo Blues').subscribe((event) => {
      if (event.type === HttpEventType.Response) {
        expect(event.body).toEqual(mockTrack);
      }
    });

    const req = httpTesting.expectOne('/api/tracks');
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBe(true);

    const body = req.request.body as FormData;
    expect(body.has('audio')).toBe(true);
    expect(body.get('title')).toBe('Solo Blues');

    req.event(new HttpResponse({ status: 201, body: mockTrack }));
  });
});
