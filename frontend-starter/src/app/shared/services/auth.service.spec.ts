import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('login() doit utiliser POST /api/auth/login avec les identifiants requis', () => {
    const mockCredentials = { email: 'guitarist@example.com', password: 'SecretPassword123' };
    const mockResponse = {
      token: 'jwt-test-token-12345',
      user: {
        id: 'user-id-1',
        name: 'Jimi Hendrix',
        email: 'guitarist@example.com',
        avatarUrl: null,
      },
    };

    service.login(mockCredentials.email, mockCredentials.password).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(service.token()).toBe(mockResponse.token);
      expect(service.currentUser()?.email).toBe(mockCredentials.email);
      expect(localStorage.getItem('gpc_token')).toBe(mockResponse.token);
    });

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockCredentials);

    req.flush(mockResponse);
  });
});
