import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Project } from './project.entity';
import { ESTADOS_MEDIO, ETAPAS, TIPOS_MEDIO, type EstadoMedio, type Etapa, type TipoMedio } from './projects.types';

/**
 * Foto o video de un proyecto, ligado a una etapa (antes | durante | despues).
 * - `es_principal`: el par del comparador (solo antes/después; mismo tipo y misma orientación).
 * - `es_portada`: la foto de la tarjeta del catálogo (solo foto de antes/después).
 * La orientación no se guarda: se calcula de ancho/alto.
 */
@Entity('project_media')
@Index('uq_project_media_orden', ['projectId', 'etapa', 'orden'], { unique: true })
@Index('uq_project_media_principal', ['projectId', 'etapa'], { unique: true, where: '"es_principal" = true' })
@Index('uq_project_media_portada', ['projectId', 'etapa'], { unique: true, where: '"es_portada" = true' })
export class ProjectMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  proyecto!: Relation<Project>;

  @Column({ type: 'enum', enum: ETAPAS, enumName: 'etapa_foto' })
  etapa!: Etapa;

  @Column({ type: 'enum', enum: TIPOS_MEDIO, enumName: 'tipo_medio', default: 'foto' })
  tipo!: TipoMedio;

  /** Solo el public_id de Cloudinary; las transformaciones las arma quien consume la API. */
  @Column({ type: 'varchar', length: 255 })
  cloudinaryId!: string;

  /** Orden dentro de (proyecto, etapa). */
  @Column({ type: 'int', default: 0 })
  orden!: number;

  /** Comparador antes/después. Una sola por proyecto y etapa. */
  @Column({ type: 'boolean', default: false })
  esPrincipal!: boolean;

  /** Portada del catálogo. Solo foto de antes o después. Una sola por proyecto y etapa. */
  @Column({ type: 'boolean', default: false })
  esPortada!: boolean;

  /** `subiendo` hasta que la app confirma la subida a Cloudinary. */
  @Column({ type: 'enum', enum: ESTADOS_MEDIO, enumName: 'estado_medio', default: 'listo' })
  estado!: EstadoMedio;

  /** Descripción corta: sirve de alt y pie. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  pie!: string | null;

  /** Dimensiones ya rotadas (evitan saltos de diseño y definen la orientación). */
  @Column({ type: 'int', nullable: true })
  ancho!: number | null;

  @Column({ type: 'int', nullable: true })
  alto!: number | null;

  /** Duración del video, en milisegundos. Vacío en las fotos. */
  @Column({ type: 'int', nullable: true })
  duracionMs!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
