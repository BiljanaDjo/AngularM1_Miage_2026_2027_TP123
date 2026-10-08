import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Page } from '../models/page.model';
import { Track } from '../models/track.model';

/** Encapsulates all HTTP operations for backing tracks. */
@Injectable({ providedIn: 'root' })
export class TrackService {
  private readonly http = inject(HttpClient);

  /**
   * Récupère une page de pistes audio depuis le serveur.
   * 
   * @param page Numéro de la page demandée (indexée à partir de 1).
   * @param limit Nombre maximal de pistes par page.
   * @returns Un Observable émettant un objet Page<Track> contenant les items et métadonnées de pagination.
   * 
   * Remarque M1 : Les paramètres passés dans l'objet `params` sont automatiquement 
   * encodés par Angular sous forme de Query Parameters dans l'URL :
   * GET /api/tracks?page=1&limit=5
   * Grâce à l'intercepteur `authInterceptor`, le header `Authorization: Bearer <token>` 
   * est automatiquement injecté dans cette requête.
   */
  list(page = 1, limit = 5) {
    return this.http.get<Page<Track>>('/api/tracks', {
      params: { page, limit },
    });
  }

  upload(file: File, title: string) {
    const body = new FormData();
    body.append('audio', file);
    body.append('title', title);
    return this.http.post<Track>('/api/tracks', body);
  }

  audio(id: string) {
    return this.http.get(`/api/tracks/${id}/audio`, {
      responseType: 'blob',
    });
  }
}
