import { ChildEntity, Column, Entity, ManyToMany, PrimaryColumn, Tree, TreeChildren, TreeParent } from 'typeorm';
import { TreeEntity } from './treeentity.entity';
import { WkoCompany } from './wkocompany.entity';

@ChildEntity()
export class WkoCategory extends TreeEntity {
  @ManyToMany(() => WkoCompany, company => company.categories)
  companies: WkoCompany[];
}

