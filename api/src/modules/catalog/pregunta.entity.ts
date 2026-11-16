import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm';
import { PREGUNTA_TIPOS, type PreguntaTipo } from './catalog.types';
import { OpcionPregunta } from './opcion-pregunta.entity';
import { Servicio } from './servicio.entity';

/**
 * Pregunta del cotizador. Una pregunta puede aplicar a VARIOS servicios (p. ej. el acabado sirve para cocina, baño y
 * enchapado); en el formulario se muestra una sola vez aunque el cliente elija varios de esos servicios.
 */
@Entity('questions')
@Index('uq_questions_slug', ['slug'], { unique: true })
export class Pregunta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 60 })
  slug!: string;

  /** Texto que ve el cliente ("¿Cuántos baños?"). */
  @Column({ type: 'varchar', length: 160 })
  texto!: string;

  /** Nombre corto para resúmenes, mensajes y el panel ("Baños"). */
  @Column({ type: 'varchar', length: 60 })
  etiqueta!: string;

  @Column({ type: 'enum', enum: PREGUNTA_TIPOS, enumName: 'pregunta_tipo' })
  tipo!: PreguntaTipo;

  /** Solo para tipo `numero`: rango permitido. */
  @Column({ type: 'int', nullable: true })
  min!: number | null;

  @Column({ type: 'int', nullable: true })
  max!: number | null;

  @Column({ type: 'int', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => OpcionPregunta, (o) => o.pregunta)
  opciones!: Relation<OpcionPregunta[]>;

  /** Servicios en los que se hace esta pregunta (tabla question_services). */
  @ManyToMany(() => Servicio)
  @JoinTable({ name: 'question_services', joinColumn: { name: 'question_id' }, inverseJoinColumn: { name: 'service_id' } })
  servicios!: Relation<Servicio[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
