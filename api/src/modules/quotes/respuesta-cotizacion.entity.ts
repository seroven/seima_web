import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { OpcionPregunta } from '../catalog/opcion-pregunta.entity';
import { Pregunta } from '../catalog/pregunta.entity';
import { Quote } from './quote.entity';

/**
 * Una respuesta del cliente a una pregunta del cotizador, guardada como FILA (no como texto) para poder filtrar en el panel:
 *  - pregunta `unica`:    una fila con `option_id`
 *  - pregunta `multiple`: una fila por cada opción elegida
 *  - pregunta `numero`:   una fila con `valor_numero` (sin opción)
 * Ejemplo de filtro: "cocinas con mueble alto" = respuestas de la pregunta `mueble-alto` con la opción `si`.
 */
@Entity('quote_answers')
@Index('uq_quote_answers_opcion', ['quoteId', 'questionId', 'optionId'], { unique: true, where: '"option_id" IS NOT NULL' })
@Index('uq_quote_answers_numero', ['quoteId', 'questionId'], { unique: true, where: '"option_id" IS NULL' })
@Index('idx_quote_answers_filtro', ['questionId', 'optionId'])
@Check('chk_quote_answers_valor', '("option_id" IS NOT NULL) <> ("valor_numero" IS NOT NULL)')
export class RespuestaCotizacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId!: string;

  @ManyToOne(() => Quote, (q) => q.respuestas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote!: Relation<Quote>;

  @Column({ type: 'uuid', name: 'question_id' })
  questionId!: string;

  /** No se puede borrar una pregunta que ya tiene respuestas (se desactiva con `activo`). */
  @ManyToOne(() => Pregunta, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  pregunta!: Relation<Pregunta>;

  @Column({ type: 'uuid', name: 'option_id', nullable: true })
  optionId!: string | null;

  @ManyToOne(() => OpcionPregunta, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'option_id' })
  opcion!: Relation<OpcionPregunta> | null;

  /** Solo para preguntas de tipo `numero`. */
  @Column({ type: 'int', nullable: true })
  valorNumero!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
