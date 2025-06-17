import { Entity, PrimaryGeneratedColumn, Column, OneToMany, PrimaryColumn, BeforeInsert } from 'typeorm';
// import { nanoid } from 'nanoid';
import { YasserNasser } from "./yasser"

@Entity('school')
export class School {
    @PrimaryGeneratedColumn() // 👈 This allows you to assign the ID manually
    id!: string;

    @Column()
    name!: string;

    @OneToMany(() => YasserNasser, yasser => yasser.school)
    YasserNasser!: YasserNasser[];
}
