import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Any, IsNull, Not, Repository, TreeRepository } from 'typeorm';
import { WkoCategory } from './entities/wkocategory.entity';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoLocation } from './entities/wkolocation.entity';

@Injectable()
export class WkoService {
  constructor(
    // @InjectRepository(WkoCategory) private categoryRepo: Repository<WkoCategory>,
    @InjectRepository(WkoCategory) private categoryTreeRepo: TreeRepository<WkoCategory>,
    // @InjectRepository(WkoLocation) private locationRepo: Repository<WkoLocation>, 
    @InjectRepository(WkoLocation) private locationTreeRepo: TreeRepository<WkoLocation>,
    @InjectRepository(WkoCompany) private companyRepo: Repository<WkoCompany>) {

  }

  async findAllCategories(): Promise<WkoCategory[]> {
    return this.categoryTreeRepo.findTrees();
  }

  findOneCategory(wkoId: number): Promise<WkoCategory> {
    return this.categoryTreeRepo.findOne({
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
    return this.categoryTreeRepo.save(category);
    // return this.categoryRepository.create(category);
  }

  // async findAllLocations(): Promise<WkoLocation[]> {
  //   return this.locationRepo.find();
  // }

  findOneLocation(wkoId: number): Promise<WkoLocation> {
    return this.locationTreeRepo
      .createQueryBuilder("location")
      .where("location.wkoId=:wkoId", { wkoId: wkoId })
      .getOne();
  }

  async addLocation(location: WkoLocation): Promise<WkoLocation> {
    return this.locationTreeRepo.save(location);
  }

  async findSecondLevelLocations(): Promise<WkoLocation[]> {
    var query = this.locationTreeRepo
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

  async findAllLocations(): Promise<WkoLocation[]> {
    return this.locationTreeRepo.findTrees();
  }

  async getCompanies(locationIds: number[], categoryIds: number[]): Promise<WkoCompany[]> {
    var locationLeafIds = await this.getLocationLeafIds(locationIds);
    var categoryLeafIds = await this.getCategoryLeafIds(categoryIds);

    var query = this.companyRepo
      .createQueryBuilder("company");
    if (categoryLeafIds.length)
      query.innerJoin('company.categories', 'category', 'category.wkoId IN (:categoryIds)', { categoryIds: categoryLeafIds });
    if (locationLeafIds.length) 
      query.innerJoin('company.locations', 'location', 'location.wkoId IN (:locationIds)', { locationIds: locationLeafIds });
    console.log(query.getQueryAndParameters());
    return query.getMany();
  }

  async getLocationLeafIds(ids: number[]): Promise<number[]> {
    var trees = await this.locationTreeRepo.findTrees();
    var treesAndSubtreesWithGivenIds = await this.findLocationTrees(trees, ids);
    // console.log("found matches: " + treesAndSubtreesWithGivenIds.map(t => t.name).join(", "));
    var missingIds: number[] = ids.filter(id => treesAndSubtreesWithGivenIds.findIndex(e => e.wkoId == id) == -1);
    if (missingIds.length) {
      console.log("Did not find entities for ids: " + missingIds.join());
    }
    var leaves = await this.getLocationLeaves(treesAndSubtreesWithGivenIds);
    var leavesIds = leaves.map(l => l.wkoId);
    var distinctLeafIds = Array.from(new Set(leavesIds));
    // console.log("locationids " + ids + " resolved to " + distinctLeafIds);
    return distinctLeafIds;
  }

  async findLocationTrees(trees: WkoLocation[], ids: number[]): Promise<WkoLocation[]> {
    var currentLevelMatches = trees.filter(t => ids.indexOf(t.wkoId) > -1);
    var missingIds = ids.filter(id => currentLevelMatches.findIndex(t => t.wkoId == id) == -1);
    var nextLevelTrees = trees.map(t => t.childLocations).reduce((a, b) => { return a.concat(b); });
    var matches = currentLevelMatches;
    if (nextLevelTrees.length && missingIds.length) {
      matches.concat(await this.findLocationTrees(nextLevelTrees, missingIds));
    }
    return matches;
  }

  async getLocationLeaves(locations: WkoLocation[]): Promise<WkoLocation[]> {
    var currentLevelLeaves = locations.filter(l => l.childLocations.length == 0);
    var childLocationsArray = locations
      .filter(l => currentLevelLeaves.indexOf(l) == -1)
      .map(l => l.childLocations);

    // hat mit reduce iwie nicht funktioniert. reduce with unknown empty start value...
    var childLocations: WkoLocation[] = [];
    for (let i = 0; i < childLocationsArray.length; i++) {
      childLocations = childLocations.concat(childLocationsArray[i]);
    }

    var result = currentLevelLeaves;
    if (childLocations.length) {
      result = result.concat(await this.getLocationLeaves(childLocations));
    }
    return result;
  }

  async getCategoryLeafIds(ids: number[]): Promise<number[]> {
    var trees = await this.categoryTreeRepo.findTrees();
    var treesAndSubtreesWithGivenIds = await this.findCategoryTrees(trees, ids);
    // console.log("found matches: " + treesAndSubtreesWithGivenIds.map(t => t.name).join(", "));
    var missingIds: number[] = ids.filter(id => treesAndSubtreesWithGivenIds.findIndex(e => e.wkoId == id) == -1);
    if (missingIds.length) {
      console.log("Did not find entities for ids: " + missingIds.join());
    }
    var leaves = await this.getCategoryLeaves(treesAndSubtreesWithGivenIds);
    var leavesIds = leaves.map(l => l.wkoId);
    var distinctLeafIds = Array.from(new Set(leavesIds));
    // console.log("categoryids " + ids + " resolved to " + distinctLeafIds);
    return distinctLeafIds;
  }

  async findCategoryTrees(trees: WkoCategory[], ids: number[]): Promise<WkoCategory[]> {
    var currentLevelMatches = trees.filter(t => ids.indexOf(t.wkoId) > -1);
    var missingIds = ids.filter(id => currentLevelMatches.findIndex(t => t.wkoId == id) == -1);
    var nextLevelTrees = trees.map(t => t.childCategories).reduce((a, b) => { return a.concat(b); });
    var matches = currentLevelMatches;
    if (nextLevelTrees.length && missingIds.length) {
      matches.concat(await this.findCategoryTrees(nextLevelTrees, missingIds));
    }
    return matches;
  }

  async getCategoryLeaves(categories: WkoCategory[]): Promise<WkoCategory[]> {
    var currentLevelLeaves = categories.filter(l => l.childCategories.length == 0);
    var childCategoryArray = categories
      .filter(l => currentLevelLeaves.indexOf(l) == -1)
      .map(l => l.childCategories);
    // hat mit reduce iwie nicht funktioniert. reduce with unknown empty start value...
    var childCategories: WkoCategory[] = [];
    for (let i = 0; i < childCategoryArray.length; i++) {
      childCategories = childCategories.concat(childCategoryArray[i]);
    }
    var result = currentLevelLeaves;
    if (childCategories.length) {
      result = result.concat(await this.getCategoryLeaves(childCategories));
    }
    return result;
  }
}
