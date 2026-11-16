import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm';
import { TIPOS_ENTRADA, type TipoEntrada } from './catalog.types';
import { Pregunta } from './pregunta.entity';

/** Opción de una pregunta ("Sí", "Granito o formato grande", "Otro"…). Puede pedir un dato extra al elegirla. */
@Entity('question_options')
@Index('uq_question_options_slug', ['questionId', 'slug'], { unique: true })
export class OpcionPregunta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'question_id' })
  questionId!: string;

  @ManyToOne(() => Pregunta, (p) => p.opciones, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  pregunta!: Relation<Pregunta>;

  /** Único dentro de la pregunta. */
  @Column({ type: 'varchar', length: 60 })
  slug!: string;

  @Column({ type: 'varchar', length: 80 })
  etiqueta!: string;

  /** Texto de apoyo opcional; si TODAS las opciones de la pregunta lo tienen, la web muestra tarjetas en vez de chips. */
  @Column({ type: 'varchar', length: 160, nullable: true })
  descripcion!: string | null;

  /**
   * ¿Al elegir esta opción se pide un dato más? ninguna | texto (p. ej. "Otro" → ¿cuál?) | numero (p. ej. "Sé el área" → m²).
   * La web muestra el campo al tocar la opción y valida; la API valida lo mismo.
   */
  @Column({ type: 'enum', enum: TIPOS_ENTRADA, enumName: 'opcion_entrada', default: 'ninguna' })
  tipoEntrada!: TipoEntrada;

  /** Ayuda del campo: en `texto` es el texto de ejemplo ("¿Cuál?"); en `numero` es la unidad ("m²"). */
  @Column({ type: 'varchar', length: 60, nullable: true })
  entradaAyuda!: string | null;

  @Column({ type: 'int', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
