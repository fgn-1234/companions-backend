import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, PrimaryColumn, Tree, TreeParent, TreeChildren, ManyToMany } from 'typeorm';
import { WkoCompany } from './wkocompany.entity';

@Entity()
@Tree("materialized-path")
export class WkoLocation {
  @PrimaryColumn()
  wkoId: number;
  @Column()
  name: string;
  // @ManyToOne(() => WkoLocation, location => location.childLocations)
  @TreeParent()
  parentLocation: WkoLocation;
  // @OneToMany(() => WkoLocation, location => location.parentLocation)
  @TreeChildren()
  childLocations: WkoLocation[];

  @ManyToMany(() => WkoCompany, company => company.locations)
  companies: WkoCompany[];
}

