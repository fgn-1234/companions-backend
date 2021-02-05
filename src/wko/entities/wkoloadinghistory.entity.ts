import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm';
import { WkoCategory } from './wkocategory.entity';
import { WkoLocation } from './wkolocation.entity';

@Entity()
export class WkoLoadingHistory {
  @PrimaryColumn()
  id: number;
  @Column()
  datePlanned: Date;
  @ManyToOne(() => WkoLocation)
  location: WkoLocation;
  @ManyToOne(() => WkoCategory)
  category: WkoCategory;
  @Column()
  dateStarted: Date;
  @Column()
  dateFinished: Date;
  @Column()
  companyAmount: number;
  @Column()
  cancelled: boolean;
}

