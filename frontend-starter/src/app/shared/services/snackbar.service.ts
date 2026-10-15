import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarData {
  id: number;
  message: string;
  type: SnackbarType;
}

/**
 * Service gérant l'affichage des notifications SnackBar éphémères.
 * Utilisé pour notifier les succès ou les erreurs des opérations métier (ex: suppression de piste).
 */
@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  /** Signal contenant les données de la notification active, ou null */
  readonly current = signal<SnackbarData | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private counter = 0;

  /**
   * Affiche une notification pendant une durée déterminée.
   */
  show(message: string, type: SnackbarType = 'info', durationMs = 4000): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const id = ++this.counter;
    this.current.set({ id, message, type });

    this.timer = setTimeout(() => {
      if (this.current()?.id === id) {
        this.dismiss();
      }
    }, durationMs);
  }

  success(message: string, durationMs = 4000): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 5000): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = 4000): void {
    this.show(message, 'info', durationMs);
  }

  /**
   * Ferme manuellement la notification courante.
   */
  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.current.set(null);
  }
}
