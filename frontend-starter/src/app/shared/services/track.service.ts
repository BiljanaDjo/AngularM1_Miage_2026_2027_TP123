import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  list(page = 1, limit = 5): Observable<Page<Track>> {
    return this.http.get<Page<Track>>('/api/tracks', {
      params: { page, limit },
    });
  }

  /**
   * Envoie un fichier audio et son titre vers le serveur avec suivi de progression (Mission 6).
   * 
   * Remarque M1 : Grâce aux options `{ reportProgress: true, observe: 'events' }`,
   * l'Observable n'émet pas une simple réponse finale, mais une séquence d'objets `HttpEvent`.
   * Cela permet de capturer les événements `HttpEventType.UploadProgress` (octets envoyés vs total)
   * pour calculer le pourcentage en direct, jusqu'à `HttpEventType.Response` (succès final).
   */
  upload(file: File, title: string): Observable<HttpEvent<Track>> {
    const body = new FormData();
    body.append('audio', file);
    body.append('title', title);
    return this.http.post<Track>('/api/tracks', body, {
      reportProgress: true,
      observe: 'events',
    });
  }

  audio(id: string) {
    return this.http.get(`/api/tracks/${id}/audio`, {
      responseType: 'blob',
    });
  }

  /**
   * Supprime une piste audio sur le serveur (DELETE /api/tracks/:id).
   * 
   * Remarque M1 : Le backend Express vérifie que l'utilisateur connecté est bien le
   * propriétaire de la piste, supprime le document dans MongoDB Atlas et efface
   * le fichier binaire correspondant sur le disque serveur (code HTTP 204 No Content).
   */
  delete(id: string) {
    return this.http.delete<void>(`/api/tracks/${id}`);
  }
}

