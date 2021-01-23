import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Any, IsNull, Not, Repository } from 'typeorm';
import { WkoCategory } from './entities/wkocategory.entity';
import { Company } from './entities/company.entity';
import { WkoLocation } from './entities/wkolocation.entity';

@Injectable()
export class WkoService {
  constructor(
    @InjectRepository(WkoCategory) private categoryRepo: Repository<WkoCategory>,
    @InjectRepository(WkoLocation) private locationRepo: Repository<WkoLocation>) { }

  async findAllCategories(): Promise<WkoCategory[]> {
    return this.categoryRepo.find();
  }

  findOneCategory(wkoId: number): Promise<WkoCategory> {
    return this.categoryRepo.findOne({
      where: {
        wkoId
      },
    });
  }

  // async remove(id: string): Promise<void> {
  //   const category = await this.findOne(id);
  //   await category.destroy();
  // }

  async addCategory(category: WkoCategory): Promise<WkoCategory> {
    return this.categoryRepo.save(category);
    // return this.categoryRepository.create(category);
  }

  async findAllLocations(): Promise<WkoLocation[]> {
    return this.locationRepo.find();
  }

  findOneLocation(wkoId: number): Promise<WkoLocation> {
    return this.locationRepo
      .createQueryBuilder("location")
      .where("location.wkoId=:wkoId", { wkoId: wkoId })
      .getOne();
  }

  async addLocation(location: WkoLocation): Promise<WkoLocation> {
    return this.locationRepo.save(location);
  }

  async findSecondLevelLocations(): Promise<WkoLocation[]> {
    var query = this.locationRepo
      .createQueryBuilder("loc1")
      .where("loc1.parentLocationWkoId IS NULL")
      .leftJoin("loc1.childLocations", "loc2")
      .groupBy("loc2.wkoId, loc2.name, loc2.parentLocationWkoId")
      .select("loc2.wkoId, loc2.name, loc2.parentLocationWkoId")
      ;
    // console.log(query.getQuery())
    // return query.getMany();
    return query.getRawMany();

  }
}
