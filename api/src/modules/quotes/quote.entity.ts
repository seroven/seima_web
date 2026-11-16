import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm';
import { Project } from '../projects/project.entity';
import { CLIENTES, ESTADOS_COTIZACION, MEDIDAS_MODO, type Cliente, type EstadoCotizacion, type MedidasModo } from './quote.constants';

const aNumero = { to: (v?: number | null) => v ?? null, from: (v: string | null) => (v === null ? null : Number(v)) };

/** Solicitud enviada desde el cotizador. Luis la revisa desde el panel (cambiando su `estado`). */
@Entity('quotes')
@Index('idx_quotes_estado_creada', ['estado', 'createdAt'])
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: CLIENTES, enumName: 'quote_cliente' })
  cliente!: Cliente;

  @Column({ type: 'text', array: true })
  servicios!: string[];

  @Column({ type: 'enum', enum: MEDIDAS_MODO, enumName: 'quote_medidas_modo', default: 'nose' })
  medidasModo!: MedidasModo;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true, transformer: aNumero })
  largo!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true, transformer: aNumero })
  ancho!: number | null;

  /** Área final (calculada si dieron largo × ancho). */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: aNumero })
  areaM2!: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  acabado!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  muebleAlto!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  estructura!: string | null;

  @Column({ type: 'int', nullable: true })
  ambientes!: number | null;

  @Column({ type: 'varchar', length: 120 })
  distrito!: string;

  @Column({ type: 'varchar', length: 20 })
  plazo!: string;

  /** public_id de Cloudinary de las fotos que subió el cliente (la URL se arma al mostrarlas). */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  fotosIds!: string[];

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  /** Celular peruano de 9 dígitos, sin espacios. */
  @Column({ type: 'varchar', length: 9 })
  whatsapp!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  razonSocial!: string | null;

  @Column({ type: 'varchar', length: 11, nullable: true })
  ruc!: string | null;

  @Column({ type: 'uuid', name: 'proyecto_id', nullable: true })
  proyectoId!: string | null;

  /** Proyecto desde el que se pidió "Cotizar algo así" (si lo borran, la cotización se conserva). */
  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto!: Relation<Project> | null;

  /** Resumen de la solicitud en texto (el panel lo muestra y sirve para responder por WhatsApp). */
  @Column({ type: 'text' })
  mensaje!: string;

  /** Momento en que aceptó el tratamiento de sus datos (constancia). */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  consentimientoEn!: Date;

  @Column({ type: 'enum', enum: ESTADOS_COTIZACION, enumName: 'quote_estado', default: 'nueva' })
  estado!: EstadoCotizacion;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
