import { Column, Entity, ManyToMany, PrimaryColumn, Tree, TreeChildren, TreeParent } from 'typeorm';
import { TreeEntity } from './treeentity.entity';
import { WkoCompany } from './wkocompany.entity';

@Entity()
@Tree("materialized-path")
export class WkoCategory //extends TreeEntity<WkoCategory> {
{
  @PrimaryColumn()
  id: number;
  @Column()
  name: string;
  @TreeParent()
  parent: WkoCategory;
  @TreeChildren()
  children: WkoCategory[];
  @ManyToMany(() => WkoCompany, company => company.categories)
  companies: WkoCompany[];
}

