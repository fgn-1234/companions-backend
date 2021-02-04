import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, PrimaryColumn, Tree, TreeParent, TreeChildren, ManyToMany, ChildEntity } from 'typeorm';
import { TreeEntity } from './treeentity.entity';
import { WkoCompany } from './wkocompany.entity';

@ChildEntity()
export class WkoLocation extends TreeEntity {
  @ManyToMany(() => WkoCompany, company => company.locations)
  companies: WkoCompany[];
}

