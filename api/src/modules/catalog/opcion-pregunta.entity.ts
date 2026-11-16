import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm';
import { Pregunta } from './pregunta.entity';

/** Opción de una pregunta de tipo `unica` o `multiple` ("Sí", "Granito o formato grande"…). */
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

  @Column({ type: 'int', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
