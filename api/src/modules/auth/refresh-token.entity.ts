import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { AdminUser } from './admin-user.entity';

/**
 * Sesión larga de la app. Se guarda el hash del token, nunca el token.
 * `familia` agrupa las rotaciones: si reaparece un token ya usado, se revoca toda la familia.
 */
@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user', ['userId'])
@Index('idx_refresh_tokens_familia', ['familia'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => AdminUser, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  usuario!: Relation<AdminUser>;

  @Column({ type: 'uuid' })
  familia!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  dispositivo!: string | null;

  @Column({ type: 'timestamptz' })
  vence!: Date;

  @Column({ type: 'boolean', default: false })
  revocado!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
