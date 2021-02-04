import { Column, Entity, PrimaryColumn, Tree, TreeChildren, TreeParent } from "typeorm";

@Tree("materialized-path")
export abstract class TreeEntity<T> {
  @PrimaryColumn()
  id: number;
  @Column()
  name: string;
  @TreeParent()
  parent: T;
  @TreeChildren()
  children: T[];
}