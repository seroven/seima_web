import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Quote } from './quote.entity';

/**
 * Foto que el cliente adjuntó a una cotización. El archivo vive en Cloudinary (carpeta de cotizaciones);
 * aquí solo se guarda su public_id y el orden en que las subió. Si se borra la cotización, se borran sus fotos.
 */
@Entity('quote_photos')
@Index('uq_quote_photos_orden', ['quoteId', 'orden'], { unique: true })
export class QuotePhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'quote_id' })
  quoteId!: string;

  @ManyToOne(() => Quote, (q) => q.fotos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote!: Relation<Quote>;

  /** Solo el public_id de Cloudinary; la URL se arma al mostrarla (ver common/utils/cloudinary.ts). */
  @Column({ type: 'varchar', length: 255 })
  cloudinaryId!: string;

  /** Orden dentro de la cotización (0, 1, 2…). */
  @Column({ type: 'int', default: 0 })
  orden!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
