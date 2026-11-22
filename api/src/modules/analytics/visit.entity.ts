import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { Dispositivo, TipoVisita } from './analytics.constants';

/**
 * Una página vista (o un toque importante) en la web pública. SIN cookies y SIN IP:
 * `visitante` es un código anónimo que cambia cada día (ver analytics.rules.ts).
 */
@Entity('visits')
@Index('idx_visits_creado', ['createdAt'])
@Index('idx_visits_proyecto_creado', ['proyectoSlug', 'createdAt'])
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 12 })
  tipo!: TipoVisita;

  @Column({ type: 'varchar', length: 200 })
  ruta!: string;

  /** Si la ruta es /proyectos/<slug>. Sin llave foránea: si la obra se borra, el historial no se rompe. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  proyectoSlug!: string | null;

  @Column({ type: 'varchar', length: 32 })
  visitante!: string;

  @Column({ type: 'varchar', length: 60 })
  origen!: string;

  /** Código ISO de dos letras (PE, US…). */
  @Column({ type: 'varchar', length: 2, nullable: true })
  pais!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  ciudad!: string | null;

  @Column({ type: 'varchar', length: 10 })
  dispositivo!: Dispositivo;
}
