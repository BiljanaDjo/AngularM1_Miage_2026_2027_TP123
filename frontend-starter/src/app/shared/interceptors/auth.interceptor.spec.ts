import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('ajoute le header Authorization Bearer lorsqu’un token existe', () => {
    authService.token.set('valid-test-jwt-token');

    http.get('/api/tracks').subscribe();

    const req = httpTesting.expectOne('/api/tracks');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-test-jwt-token');

    req.flush({});
  });

  it('n’ajoute pas de header Authorization si aucun token n’est présent', () => {
    authService.token.set(null);

    http.get('/api/health').subscribe();

    const req = httpTesting.expectOne('/api/health');
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush({});
  });
});
