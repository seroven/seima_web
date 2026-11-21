import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const ROLES = ['admin'] as const;
export type Rol = (typeof ROLES)[number];

/** Usuario del panel administrativo (Luis). La web pública NO usa usuarios. */
@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Con qué entra Luis (`luis`). Siempre en minúsculas. */
  @Column({ type: 'varchar', length: 40, unique: true })
  usuario!: string;

  /** Opcional. Siempre en minúsculas cuando existe. */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email!: string | null;

  /** Hash bcrypt: la contraseña real nunca se guarda. */
  @Column({ type: 'varchar', length: 100 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'enum', enum: ROLES, enumName: 'admin_rol', default: 'admin' })
  rol!: Rol;

  /** Desactivar corta el acceso aunque el token siga vigente. */
  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  ultimoAcceso!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
