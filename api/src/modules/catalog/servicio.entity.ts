import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Servicio que se puede pedir en el cotizador (cocina, baño, pintura…). Es un catálogo: se edita sin tocar el código. */
@Entity('services')
@Index('uq_services_slug', ['slug'], { unique: true })
export class Servicio {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Identificador estable (lo usan la web y los filtros del panel). */
  @Column({ type: 'varchar', length: 40 })
  slug!: string;

  @Column({ type: 'varchar', length: 80 })
  nombre!: string;

  /** Nombre del ícono de la web (components/ui/Icon). */
  @Column({ type: 'varchar', length: 40 })
  icono!: string;

  @Column({ type: 'int', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
