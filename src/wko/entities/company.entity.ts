import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Company {
  @PrimaryColumn()
  id: number;
  @Column()
  name: string;
}

