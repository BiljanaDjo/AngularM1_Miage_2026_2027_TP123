import { TestBed } from "@angular/core/testing";
import { Router, UrlTree } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { describe, it, expect, beforeEach } from "vitest";
import { authGuard } from "./auth.guard";
import { AuthService } from "../services/auth.service";

describe("authGuard", () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            createUrlTree: (commands: any[]) => ({ toString: () => commands.join("/") } as unknown as UrlTree),
          },
        },
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it("autorise l’accès si un token JWT est présent", () => {
    authService.token.set("valid-jwt-token");
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it("redirige vers /login si aucun token n’est présent", () => {
    authService.token.set(null);
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).not.toBe(true);
  });
});
