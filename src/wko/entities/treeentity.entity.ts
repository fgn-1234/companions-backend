import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn, TableInheritance, Tree, TreeChildren, TreeParent } from "typeorm";

@Tree("materialized-path")
@Entity()
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class TreeEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  wkoId: number;
  @Column()
  name: string;
  @TreeParent()
  parent: TreeEntity;
  @TreeChildren()
  children: TreeEntity[];
  @Column()
  level: number;
}