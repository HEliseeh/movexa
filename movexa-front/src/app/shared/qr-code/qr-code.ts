import { Component, effect, ElementRef, input, viewChild } from '@angular/core';
import QRCode from 'qrcode';

/**
 * Dessine un QR code dans un <canvas> (bibliothèque « qrcode »).
 * Le canvas permet aussi d'enregistrer l'image (toPng) pour l'envoyer au membre par WhatsApp.
 */
@Component({
  selector: 'app-qr-code',
  template: `<canvas #canvas role="img" [attr.aria-label]="label()"></canvas>`,
  styles: `
    :host { display: inline-flex; }
    canvas { display: block; max-width: 100%; height: auto !important; }
  `,
})
export class QrCode {
  /** Contenu encodé (le jeton QR du membre) */
  readonly value = input.required<string>();
  readonly size = input(160);
  readonly label = input('QR code du membre');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect(() => {
      const value = this.value();
      if (!value) return;
      void QRCode.toCanvas(this.canvas().nativeElement, value, {
        width: this.size(),
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#1e2336', light: '#ffffff' },
      });
    });
  }

  /** Image PNG du QR code (data URL), pour la télécharger ou la partager */
  toPng(): string {
    return this.canvas().nativeElement.toDataURL('image/png');
  }
}
