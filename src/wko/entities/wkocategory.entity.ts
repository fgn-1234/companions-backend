import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class WkoCategory {
  @PrimaryColumn()
  wkoId: number;
  @Column()
  name: string;
  @ManyToOne(() => WkoCategory, category => category.childCategories)
  parentCategory: WkoCategory;
  @OneToMany(() => WkoCategory, category => category.parentCategory)
  childCategories: WkoCategory[];
}

