import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class WkoLocation {
  @PrimaryColumn()
  wkoId: number;
  @Column()
  name: string;
  @ManyToOne(() => WkoLocation, location => location.childLocations)
  parentLocation: WkoLocation;
  @OneToMany(() => WkoLocation, location => location.parentLocation)
  childLocations: WkoLocation[];
}

