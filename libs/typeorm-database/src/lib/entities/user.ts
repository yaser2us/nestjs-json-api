import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { Workspace } from './workspace';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column()
  domain!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @ManyToOne(() => Workspace, workspace => workspace.users, { eager: true })
  workspace!: Workspace;
}

