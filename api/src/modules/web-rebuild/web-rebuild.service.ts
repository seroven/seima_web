// Avisa a Render que reconstruya la web pública cuando cambia algo que ella muestra (la web es estática: lee la API al
// construirse). Es un «deploy hook» de Render: una URL secreta; al llamarla, Render reconstruye el sitio.
//
// Reglas:
//  - Junta los cambios seguidos en UNA sola llamada: espera `esperaMs` de calma, pero nunca más de `maxEsperaMs`
//    desde el primer cambio (si se sigue editando sin parar, igual se reconstruye).
//  - Un fallo al avisar NUNCA rompe lo que hacía Luis: se registra y ya.
//  - La URL del hook es un secreto: jamás se escribe en los logs.
//  - Sin `WEB_DEPLOY_HOOK_URL` (desarrollo) no hace nada.
import { logger } from '../../common/logger';

/** Lo único que necesitan los demás módulos: pedir una reconstrucción diciendo por qué. */
export interface AvisoReconstruccion {
  solicitar(motivo: string): void;
}

/** Para los módulos que no necesitan avisar (pruebas, desarrollo). */
export const sinAviso: AvisoReconstruccion = { solicitar() {} };

interface Opciones {
  esperaMs?: number;
  maxEsperaMs?: number;
  llamar?: typeof fetch;
  ahora?: () => number;
  log?: Pick<typeof logger, 'info' | 'warn'>;
}

export class WebRebuildService implements AvisoReconstruccion {
  private readonly esperaMs: number;
  private readonly maxEsperaMs: number;
  private readonly llamar: typeof fetch;
  private readonly ahora: () => number;
  private readonly log: Pick<typeof logger, 'info' | 'warn'>;
  private pendiente: { desde: number; motivos: Set<string> } | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly hookUrl: string | undefined,
    opciones: Opciones = {},
  ) {
    this.esperaMs = opciones.esperaMs ?? 60_000;
    this.maxEsperaMs = opciones.maxEsperaMs ?? 5 * 60_000;
    this.llamar = opciones.llamar ?? fetch;
    this.ahora = opciones.ahora ?? Date.now;
    this.log = opciones.log ?? logger;
  }

  get activo(): boolean {
    return Boolean(this.hookUrl);
  }

  solicitar(motivo: string): void {
    if (!this.hookUrl) return;
    const ahora = this.ahora();
    if (!this.pendiente) this.pendiente = { desde: ahora, motivos: new Set() };
    this.pendiente.motivos.add(motivo);
    if (this.temporizador) clearTimeout(this.temporizador);
    const queda = Math.max(0, this.maxEsperaMs - (ahora - this.pendiente.desde));
    this.temporizador = setTimeout(() => void this.avisarYa(), Math.min(this.esperaMs, queda));
    // No debe mantener vivo el proceso al apagarlo.
    this.temporizador.unref?.();
  }

  /** Llama al hook ahora mismo (lo usa el temporizador). Nunca lanza. */
  async avisarYa(): Promise<void> {
    if (!this.hookUrl || !this.pendiente) return;
    const motivos = [...this.pendiente.motivos];
    this.pendiente = null;
    this.temporizador = null;
    try {
      const respuesta = await this.llamar(this.hookUrl, { method: 'POST', signal: AbortSignal.timeout(15_000) });
      if (respuesta.ok) {
        this.log.info({ motivos, estado: respuesta.status }, 'Se pidió reconstruir la web');
      } else {
        this.log.warn({ motivos, estado: respuesta.status }, 'Render rechazó el aviso de reconstrucción de la web');
      }
    } catch (error) {
      // Solo el tipo de error: el mensaje de red podría traer la URL (que es un secreto).
      this.log.warn({ motivos, error: error instanceof Error ? error.name : 'desconocido' }, 'No se pudo avisar a Render para reconstruir la web');
    }
  }
}
