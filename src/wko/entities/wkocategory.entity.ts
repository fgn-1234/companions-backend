import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, PrimaryColumn, Tree, TreeParent, TreeChildren, ManyToMany } from 'typeorm';
import { WkoCompany } from './wkocompany.entity';

@Entity()
@Tree("materialized-path")
export class WkoCategory {
  @PrimaryColumn()
  wkoId: number;
  @Column()
  name: string;
  // @ManyToOne(() => WkoCategory, category => category.childCategories)
  @TreeParent()
  parentCategory: WkoCategory;
  // @OneToMany(() => WkoCategory, category => category.parentCategory)
  @TreeChildren()
  childCategories: WkoCategory[];
  
  @ManyToMany(() => WkoCompany, company => company.categories)
  companies: WkoCompany[];
}

