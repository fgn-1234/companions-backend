import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { WkoCompany } from "./wkocompany.entity";

@Entity()
export class WkoCompanyInteraction {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  createdAt: Date;
  @Column({ length: 3000 })
  text: string;
  @Column()
  companyId: string;
  @ManyToOne(() => WkoCompany)
  company: WkoCompany;

}