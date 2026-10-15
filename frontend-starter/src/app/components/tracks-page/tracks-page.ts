import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';

/** Taille maximale autorisée pour un fichier audio (25 Mo). */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Types MIME audio reconnus et acceptés par le backend Express / Multer. */
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

/** Extensions acceptées en cas d'absence de type MIME précis dans le navigateur. */
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent implements OnDestroy {
  private readonly service = inject(TrackService);

  // --- SIGNAUX D'ÉTAT (Angular 22) ---

  /** Liste des pistes audio affichées sur la page courante. */
  readonly tracks = signal<Track[]>([]);

  /** Numéro de la page actuellement affichée (commence à 1). */
  readonly page = signal(1);

  /** Nombre d'éléments par page envoyé au backend (?limit=5). */
  readonly limit = signal(5);

  /** Nombre total de pages calculé et renvoyé par le serveur. */
  readonly pages = signal(1);

  /** Indique si le chargement de la liste des pistes est en cours. */
  readonly loading = signal(false);

  /** Message d'erreur éventuel lors de la récupération de la liste. */
  readonly error = signal<string | null>(null);

  // --- SIGNAUX POUR LE FILTRE PAR TITRE ---

  /** Chaîne de recherche pour le filtre réactif par titre. */
  readonly titleFilter = signal('');

  /**
   * Morceaux filtrés réactivement grâce à computed().
   * Se recalcule instantanément dès que tracks() ou titleFilter() change.
   */
  readonly filteredTracks = computed(() => {
    const query = this.titleFilter().trim().toLowerCase();
    if (!query) return this.tracks();
    return this.tracks().filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.originalName.toLowerCase().includes(query),
    );
  });

  // --- SIGNAUX POUR L'UPLOAD ET SUPPRESSION ---

  /** Indique si un envoi de fichier audio est en cours vers le serveur. */
  readonly uploading = signal(false);

  /** Identifiant de la piste en cours de suppression (null si aucune). */
  readonly deletingId = signal<string | null>(null);

  /** Message d'erreur spécifique à la sélection ou à l'upload du fichier. */
  readonly uploadError = signal<string | null>(null);

  /** Message de succès suite à un upload ou une suppression réussie. */
  readonly uploadSuccess = signal<string | null>(null);

  /** Champ réactif pour saisir le titre lors de l'upload. */
  readonly title = new FormControl('', { nonNullable: true });

  /** Fichier audio sélectionné et validé localement. */
  file?: File;

  // --- SIGNAUX POUR LA LECTURE AUDIO ---

  /** URL binaire locale (Blob) actuellement liée au lecteur <audio>. */
  readonly audioUrl = signal('');

  /** Piste actuellement en cours de lecture. */
  readonly currentTrack = signal<Track | null>(null);

  /** Indique si le Blob de la piste demandée est en cours de téléchargement. */
  readonly audioLoading = signal(false);

  /** Message d'erreur spécifique à la lecture audio. */
  readonly audioError = signal<string | null>(null);

  constructor() {
    // Charge immédiatement la première page dès l'instanciation du composant
    this.load();
  }

  /**
   * Nettoyage impératif à la destruction du composant (changement de page ou déconnexion).
   * Libère immédiatement l'ObjectURL pour éviter toute fuite de mémoire vive (RAM).
   */
  ngOnDestroy(): void {
    const current = this.audioUrl();
    if (current) {
      console.debug('[TracksPage] Destruction du composant : révocation de l’URL Blob');
      URL.revokeObjectURL(current);
    }
  }

  /**
   * Récupère le fichier sélectionné et applique les validations frontend (taille, format).
   */
  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];

    // Réinitialisation des messages de notification
    this.uploadError.set(null);
    this.uploadSuccess.set(null);
    this.file = undefined;

    if (!selectedFile) return;

    // 1. Validation de la taille maximale (25 Mo)
    if (selectedFile.size > MAX_FILE_SIZE) {
      this.uploadError.set(
        `Le fichier dépasse la taille maximale autorisée de 25 Mo (taille : ${this.formatBytes(selectedFile.size)}).`,
      );
      input.value = '';
      return;
    }

    // 2. Validation du format audio
    const hasValidMime = ALLOWED_MIME_TYPES.has(selectedFile.type);
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext),
    );

    if (!hasValidMime && !hasValidExt) {
      this.uploadError.set(
        'Format de fichier non accepté. Les formats autorisés sont : MP3, WAV, OGG et M4A.',
      );
      input.value = '';
      return;
    }

    // Fichier validé côté client
    this.file = selectedFile;
    console.debug('[TracksPage] Fichier audio validé localement :', this.file.name);
  }

  /**
   * Effectue la requête HTTP GET /api/tracks avec page et limit.
   */
  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.list(this.page(), this.limit()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        this.pages.set(response.pages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[TracksPage] Chargement impossible', err);
        this.error.set(
          err.error?.message || 'Impossible de récupérer la liste des pistes audio.',
        );
        this.loading.set(false);
      },
    });
  }

  /**
   * Change de page et déclenche une nouvelle requête HTTP serveur.
   */
  go(targetPage: number): void {
    if (targetPage < 1 || targetPage > this.pages() || this.loading()) {
      return;
    }
    this.page.set(targetPage);
    this.load();
  }

  /**
   * Envoie le fichier audio via FormData au backend (POST /api/tracks).
   * Désactive les boutons pour empêcher les doubles soumissions.
   */
  upload(fileInput?: HTMLInputElement): void {
    if (!this.file || this.uploading()) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(null);

    const trackTitle = this.title.value.trim() || this.file.name;

    this.service.upload(this.file, trackTitle).subscribe({
      next: (track) => {
        console.debug('[TracksPage] Piste envoyée avec succès', track.id);
        this.uploading.set(false);
        this.uploadSuccess.set(`Piste « ${track.title} » importée avec succès !`);
        this.title.setValue('');
        this.file = undefined;
        if (fileInput) fileInput.value = '';

        // Rechargement automatique de la première page après succès
        this.page.set(1);
        this.load();
      },
      error: (err) => {
        console.error('[TracksPage] Échec de l’envoi', err);
        this.uploading.set(false);
        this.uploadError.set(
          err.error?.message || 'Une erreur est survenue lors de l’envoi du fichier.',
        );
      },
    });
  }

  /**
   * Récupère le Blob sécurisé de la piste demandée et l'affecte au lecteur audio.
   */
  play(track: Track): void {
    this.audioError.set(null);
    this.audioLoading.set(true);
    this.currentTrack.set(track);

    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Flux audio binaire reçu pour', track.id);
        this.audioLoading.set(false);

        // 1. Révocation impérative de l'ancienne URL Blob pour libérer la RAM
        const previousUrl = this.audioUrl();
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        // 2. Création d'une nouvelle URL locale pointant vers le Blob reçu
        this.audioUrl.set(URL.createObjectURL(blob));
      },
      error: (err) => {
        console.error('[TracksPage] Lecture impossible', err);
        this.audioLoading.set(false);
        this.audioError.set(
          'Impossible de charger ce fichier audio. Assurez-vous d’être le propriétaire de la piste.',
        );
      },
    });
  }

  /**
   * Gestionnaire d'erreur natif déclenché si la balise <audio> ne parvient pas à décoder le fichier.
   */
  onAudioPlaybackError(): void {
    console.error('[TracksPage] Erreur de décodage audio du navigateur');
    this.audioError.set('Le navigateur ne parvient pas à lire ce format audio.');
  }

  /**
   * Supprime une piste avec confirmation utilisateur via DELETE /api/tracks/:id.
   * Révoque l'URL Blob si le morceau supprimé était en cours d'écoute
   * et rafraîchit la pagination serveur.
   */
  deleteTrack(track: Track): void {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer définitivement le morceau « ${track.title} » ?`,
    );
    if (!confirmed) return;

    // Si la piste supprimée est celle actuellement lue, on stoppe le lecteur et révoque le Blob
    if (this.currentTrack()?.id === track.id) {
      const currentUrl = this.audioUrl();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      this.audioUrl.set('');
      this.currentTrack.set(null);
    }

    this.deletingId.set(track.id);
    this.uploadError.set(null);

    this.service.delete(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Piste supprimée avec succès', track.id);
        this.deletingId.set(null);
        this.uploadSuccess.set(`Piste « ${track.title} » supprimée avec succès.`);

        // Si on supprime le dernier élément d'une page > 1, reculer d'une page
        if (this.tracks().length === 1 && this.page() > 1) {
          this.page.set(this.page() - 1);
        }
        this.load();
      },
      error: (err) => {
        console.error('[TracksPage] Erreur lors de la suppression', err);
        this.deletingId.set(null);
        this.error.set(
          err.error?.message || 'Impossible de supprimer cette piste audio.',
        );
      },
    });
  }

  // --- FONCTIONS UTILITAIRES DE FORMATAGE ---

  /** Formate lisiblement une taille en octets vers Ko ou Mo. */
  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 Ko';
    const ko = bytes / 1024;
    if (ko < 1024) {
      return `${ko.toFixed(1)} Ko`;
    }
    const mo = ko / 1024;
    return `${mo.toFixed(2)} Mo`;
  }

  /** Formate une date ISO en chaîne lisible (ex: "17 oct. 2026"). */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /** Détermine le badge court de format audio (MP3, WAV, etc.). */
  formatMime(mime: string, originalName = ''): string {
    if (mime?.includes('mpeg') || originalName.toLowerCase().endsWith('.mp3')) return 'MP3';
    if (mime?.includes('wav') || originalName.toLowerCase().endsWith('.wav')) return 'WAV';
    if (mime?.includes('ogg') || originalName.toLowerCase().endsWith('.ogg')) return 'OGG';
    if (mime?.includes('mp4') || mime?.includes('m4a') || originalName.toLowerCase().endsWith('.m4a')) return 'M4A';
    return 'AUDIO';
  }
}
