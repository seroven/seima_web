import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm';
import { AdminUser } from '../auth/admin-user.entity';

/** Token de Firebase Cloud Messaging de un celular de Luis. Un token pertenece a un solo usuario. */
@Entity('device_tokens')
@Index('idx_device_tokens_user', ['userId'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => AdminUser, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  usuario!: Relation<AdminUser>;

  @Column({ type: 'text', unique: true })
  token!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
