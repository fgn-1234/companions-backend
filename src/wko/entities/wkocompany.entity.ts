import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable } from 'typeorm';
import { WkoCategory } from './wkocategory.entity';
import { WkoLocation } from './wkolocation.entity';

@Entity()
export class WkoCompany {
  @PrimaryColumn()
  id: number;
  @Column()
  name: string;
  @ManyToMany(() => WkoLocation, location => location.companies)
  @JoinTable()
  locations: WkoLocation[];
  @ManyToMany(() => WkoCategory, category => category.companies)
  @JoinTable()
  categories: WkoCategory[];
}

