import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm';
import { Category } from '../categories/category.entity';
import { TIPOS_CLIENTE, type TipoCliente } from './projects.types';

const aNumero = { to: (v?: number | null) => v ?? null, from: (v: string | null) => (v === null ? null : Number(v)) };

/** Proyecto del portafolio. Sus fotos están en `project_photos`. */
@Entity('projects')
@Index('idx_projects_publicado_destacado', ['publicado', 'destacado'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Parte de la URL pública: /proyectos/<slug>. */
  @Column({ type: 'varchar', length: 120, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 160 })
  titulo!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ type: 'uuid', name: 'categoria_id' })
  categoriaId!: string;

  @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoria_id' })
  categoria!: Relation<Category>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  distrito!: string | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true, transformer: aNumero })
  areaM2!: number | null;

  @Column({ type: 'int', nullable: true })
  dias!: number | null;

  /** Servicios realizados (Drywall, Enchapado…). */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  servicios!: string[];

  @Column({ type: 'boolean', default: false })
  destacado!: boolean;

  @Column({ type: 'enum', enum: TIPOS_CLIENTE, enumName: 'tipo_cliente', default: 'persona' })
  cliente!: TipoCliente;

  /** Si es false no aparece en la web (el panel podrá despublicar sin borrar). */
  @Column({ type: 'boolean', default: true })
  publicado!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
