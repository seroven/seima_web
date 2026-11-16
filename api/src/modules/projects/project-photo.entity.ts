import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Project } from './project.entity';
import { ETAPAS, type Etapa } from './projects.types';

/**
 * Foto de un proyecto, ligada a una etapa (antes | durante | despues). Ver docs/modelo-datos.md.
 * - Una sola foto PRINCIPAL por proyecto y etapa (índice único parcial): alimenta comparador, tarjeta y og:image.
 * - El resto son fotos de detalle: solo salen en la galería de la etapa.
 */
@Entity('project_photos')
@Index('uq_project_photos_orden', ['projectId', 'etapa', 'orden'], { unique: true })
@Index('uq_project_photos_principal', ['projectId', 'etapa'], { unique: true, where: '"es_principal" = true' })
export class ProjectPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  proyecto!: Relation<Project>;

  @Column({ type: 'enum', enum: ETAPAS, enumName: 'etapa_foto' })
  etapa!: Etapa;

  /** Solo el public_id de Cloudinary; las transformaciones las arma quien consume la API. */
  @Column({ type: 'varchar', length: 255 })
  cloudinaryId!: string;

  /** Orden dentro de (proyecto, etapa). */
  @Column({ type: 'int', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: false })
  esPrincipal!: boolean;

  /** Descripción corta: sirve de alt y pie de foto. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  pie!: string | null;

  /** Dimensiones originales (evitan saltos de diseño al cargar el mosaico). */
  @Column({ type: 'int', nullable: true })
  ancho!: number | null;

  @Column({ type: 'int', nullable: true })
  alto!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
