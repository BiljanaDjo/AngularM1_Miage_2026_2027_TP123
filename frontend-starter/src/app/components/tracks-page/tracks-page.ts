import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent {
  private readonly service = inject(TrackService);

  // --- SIGNAUX D'ÉTAT (Angular 22) ---
  // En Angular 22, les Signals remplacent avantageusement les propriétés classiques.
  // Toute modification avec .set() notifie directement les éléments du DOM qui en dépendent.
  
  /** Liste des pistes audio affichées sur la page courante. */
  readonly tracks = signal<Track[]>([]);

  /** Numéro de la page actuellement affichée (commence à 1). */
  readonly page = signal(1);

  /** Nombre d'éléments par page envoyé au backend (?limit=5). */
  readonly limit = signal(5);

  /** Nombre total de pages calculé et renvoyé par le serveur. */
  readonly pages = signal(1);

  /** Indique si une requête de chargement est en cours (pour afficher un spinner ou message). */
  readonly loading = signal(false);

  /** Message d'erreur éventuel en cas d'échec de la requête HTTP (null si tout va bien). */
  readonly error = signal<string | null>(null);

  /** URL binaire (Blob) temporaire de la piste en cours de lecture. */
  readonly audioUrl = signal('');

  /** Champ réactif pour saisir le titre lors de l'upload. */
  readonly title = new FormControl('', { nonNullable: true });

  /** Fichier audio sélectionné par l'utilisateur avant envoi. */
  file?: File;

  constructor() {
    // Charge immédiatement la première page dès l'instanciation du composant
    this.load();
  }

  /**
   * Récupère le fichier sélectionné dans l'input <input type="file">.
   */
  choose(event: Event): void {
    this.file = (event.target as HTMLInputElement).files?.[0];
    console.debug('[TracksPage] Fichier sélectionné', this.file?.name);
  }

  /**
   * Effectue la requête HTTP GET /api/tracks avec page et limit.
   * La pagination est faite côté serveur : le client ne télécharge que les pistes nécessaires.
   */
  load(): void {
    // 1. On passe en état de chargement et on efface l'erreur précédente
    this.loading.set(true);
    this.error.set(null);

    // 2. Appel du service avec les valeurs actuelles des signaux page() et limit()
    this.service.list(this.page(), this.limit()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        // Mise à jour réactive des signaux avec les données du serveur
        this.tracks.set(response.items);
        this.pages.set(response.pages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[TracksPage] Chargement impossible', err);
        // On extrait le message d'erreur du backend ou un message par défaut
        this.error.set(
          err.error?.message || 'Impossible de récupérer la liste des pistes audio.',
        );
        this.loading.set(false);
      },
    });
  }

  /**
   * Change de page et déclenche une nouvelle requête HTTP serveur.
   * Sécurise les bornes pour éviter de requêter une page < 1 ou > pages().
   */
  go(targetPage: number): void {
    // Garde-fou : ne rien faire si la page demandée est invalide ou si un chargement est en cours
    if (targetPage < 1 || targetPage > this.pages() || this.loading()) {
      return;
    }
    this.page.set(targetPage);
    this.load();
  }

  upload(): void {
    if (!this.file) return;

    this.service.upload(this.file, this.title.value || this.file.name).subscribe({
      next: (track) => {
        console.debug('[TracksPage] Piste envoyée', track.id);
        this.title.setValue('');
        this.file = undefined;
        this.page.set(1);
        this.load();
      },
      error: (error) => console.error('[TracksPage] Envoi impossible', error),
    });
  }

  play(track: Track): void {
    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
      },
      error: (error) => console.error('[TracksPage] Lecture impossible', error),
    });
  }
}
