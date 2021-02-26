import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, VersionColumn } from 'typeorm';
import { WkoCategory } from './wkocategory.entity';
import { WkoLocation } from './wkolocation.entity';

@Entity()
export class WkoCompany {
  @PrimaryColumn()
  id: string;
  @Column()
  name: string;
  @ManyToMany(() => WkoLocation, location => location.companies)
  @JoinTable()
  locations: WkoLocation[];
  @ManyToMany(() => WkoCategory, category => category.companies)
  @JoinTable()
  categories: WkoCategory[];
  @Column({ length: 300 })
  wkoLink: string;
  @Column()
  street: string;
  @Column()
  zip: string;
  @Column()
  locality: string;
  @Column()
  phone: string;
  @Column()
  fax: string;
  @Column()
  email: string;
  @Column()
  web: string;
  @Column({ length: 5000 })
  searchResultHtml: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @DeleteDateColumn()
  deletedAt: Date;
  @VersionColumn()
  version: number;
  @Column()
  remember: boolean;
}

