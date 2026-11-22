import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm';
import { Project } from '../projects/project.entity';

/** Ambiente/categoría del catálogo (cocinas, baños, departamentos…). */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 80 })
  nombre!: string;

  /** Orden de aparición en los filtros de la web. */
  @Column({ type: 'int', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  /** Obras que usan esta categoría. RESTRICT: no se borra una categoría que todavía tiene obras (se desactiva con `activo`). */
  @ManyToMany(() => Project, (p) => p.categorias, { onDelete: 'RESTRICT' })
  proyectos?: Relation<Project[]>;

  /** Cuántas obras la usan. No es una columna: la llena `findAllWithCounts` para el panel. */
  obras?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
