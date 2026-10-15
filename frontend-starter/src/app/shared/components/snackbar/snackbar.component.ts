import { Component, inject } from '@angular/core';
import { SnackbarService } from '../../services/snackbar.service';

/**
 * Composant autonome Angular représentant la barre de notification (SnackBar).
 * Affiche des messages de confirmation ou d'erreur accessibles et animés.
 */
@Component({
  selector: 'app-snackbar',
  standalone: true,
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.css',
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);
}
