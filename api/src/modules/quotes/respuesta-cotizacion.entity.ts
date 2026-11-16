import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { OpcionPregunta } from '../catalog/opcion-pregunta.entity';
import { Quote } from './quote.entity';

/**
 * Una respuesta del cliente: la OPCIÓN que eligió (la pregunta sale de la opción) y, si esa opción pedía un dato extra
 * ("Otro" → ¿cuál?, "Sé el área" → m²), ese dato en `valor` como texto. Una pregunta de varias opciones genera una fila
 * por cada opción elegida.
 * Ejemplo de filtro: "cocinas con mueble alto" = respuestas cuya opción es `si` de la pregunta `mueble-alto`.
 */
@Entity('quote_answers')
@Index('uq_quote_answers_opcion', ['quoteId', 'optionId'], { unique: true })
@Index('idx_quote_answers_opcion', ['optionId'])
export class RespuestaCotizacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId!: string;

  @ManyToOne(() => Quote, (q) => q.respuestas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote!: Relation<Quote>;

  /** No se puede borrar una opción que ya tiene respuestas (se desactiva con `activo`). */
  @Column({ type: 'uuid', name: 'option_id' })
  optionId!: string;

  @ManyToOne(() => OpcionPregunta, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'option_id' })
  opcion!: Relation<OpcionPregunta>;

  /** El dato extra que escribió el cliente (texto o número como texto). Vacío si la opción no pedía nada. */
  @Column({ type: 'text', nullable: true })
  valor!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
