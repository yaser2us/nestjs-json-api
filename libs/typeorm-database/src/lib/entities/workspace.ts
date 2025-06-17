import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @OneToMany(() => User, user => user.workspace)
  users!: User[];
}
