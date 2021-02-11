import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { WkoCategory } from './wkocategory.entity';
import { WkoLocation } from './wkolocation.entity';

@Entity()
export class WkoLoadingHistory {
  // @PrimaryGeneratedColumn()
  // id: number;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @VersionColumn()
  version: number;
  @Column({ nullable: false, primary: true })
  locationId: number;
  @ManyToOne(() => WkoLocation)
  location: WkoLocation;
  @Column({ nullable: false, primary: true })
  categoryId: number;
  @ManyToOne(() => WkoCategory)
  category: WkoCategory;
  @PrimaryColumn({ default: true })
  isActive: boolean;
  @Column({ nullable: true })
  startedAt: Date;
  @Column({ nullable: true })
  finishedAt: Date;
  @Column({ nullable: true })
  companyAmount: number;
  @Column({ default: false })
  cancelled: boolean;
}

