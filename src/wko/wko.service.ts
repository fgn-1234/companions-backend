import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { TreeEntity } from './entities/treeentity.entity';
import { WkoCategory } from './entities/wkocategory.entity';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoLocation } from './entities/wkolocation.entity';
import { from, pipe } from 'rxjs';
import { map, filter, distinct } from 'rxjs/operators';
import { WkoLoadingHistory } from './entities/wkoloadinghistory.entity';

interface TreeWithAllDescendantIds {
  tree: TreeEntity;
  leafIds: number[];
}

@Injectable()
export class WkoService {
  constructor(
    @InjectRepository(WkoCategory) private categoryTreeRepo: TreeRepository<WkoCategory>,
    @InjectRepository(WkoLocation) private locationTreeRepo: TreeRepository<WkoLocation>,
    @InjectRepository(TreeEntity) private treeEntityRepo: TreeRepository<TreeEntity>,
    @InjectRepository(WkoCompany) private companyRepo: Repository<WkoCompany>,
    @InjectRepository(WkoLoadingHistory) private loadingHistoryRepo: Repository<WkoLoadingHistory>) { }

  findOneCategory(wkoId: number): Promise<WkoCategory> {
    return this.categoryTreeRepo.findOne({
      where: {
        wkoId
      },
    });
  }

  async addCategory(category: WkoCategory): Promise<WkoCategory> {
    return this.categoryTreeRepo.save(category);
  }

  findOneLocation(wkoId: number): Promise<WkoLocation> {
    return this.locationTreeRepo
      .createQueryBuilder("location")
      .where("location.wkoId=:wkoId", { wkoId: wkoId })
      .getOne();
  }

  async addLocation(location: WkoLocation): Promise<WkoLocation> {
    return this.locationTreeRepo.save(location);
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
    // console.log(query.getQueryAndParameters());
    return query.getMany();
  }

  async reduceRedundancies(trees: TreeEntity[]): Promise<TreeEntity[]> {
    var treesWithLeafIds: TreeWithAllDescendantIds[] = [];
    for (let i = 0; i < trees.length; i++) {
      treesWithLeafIds.push({ tree: trees[i], leafIds: await this.getLeafIds([trees[i].wkoId], [trees[i]]) });
    }

    var sorted = treesWithLeafIds.sort((a, b) => {
      var aLeafIdsLength = a.leafIds.length;
      var bLeafIdsLength = b.leafIds.length;
      if (aLeafIdsLength == bLeafIdsLength)
        return 0;
      else if (aLeafIdsLength < bLeafIdsLength)
        return 1;
      else
        return -1;
    });

    // console.log("the sorted map: " + sorted.map(s => s.tree.wkoId + ": " + s.leafIds.length).join(", "));

    // reduce now
    var totalLeafIds = [];
    var distinctTrees = [];
    for (let i = 0; i < sorted.length; i++) {
      if (!sorted[i].leafIds.every(id => totalLeafIds.indexOf(id) > -1)) {
        totalLeafIds = totalLeafIds.concat(sorted[i].leafIds);
        distinctTrees.push(sorted[i].tree);
      }
    }

    // console.log(distinctTrees);

    return distinctTrees;
  }

  async getReducedLocationTrees(ids: number[]): Promise<TreeEntity[]> {
    return this.getReducedTrees(await this.getLocationTrees(), ids);
  }

  async getReducedCategoryTrees(ids: number[]): Promise<TreeEntity[]> {
    return this.getReducedTrees(await this.getCategoryTrees(), ids);
  }

  async getReducedTrees(trees: TreeEntity[], ids: number[]): Promise<TreeEntity[]> {
    return await this.reduceRedundancies(await this.findTrees(trees, ids));
  }

  async getLocationTrees(): Promise<TreeEntity[]> {
    var trees = (await this.treeEntityRepo.findTrees()).filter(tree => tree instanceof WkoLocation);
    // var result = from(this.treeEntityRepo.findTrees()).pipe(filter(tree => tree instanceof WkoLocation))
    // var result2 = result.pipe(map(tree => tree as WkoLocation[]));
    return trees;
  }

  async getCategoryTrees(): Promise<TreeEntity[]> {
    var trees = (await this.treeEntityRepo.findTrees()).filter(tree => tree instanceof WkoCategory);
    // var result = from(this.treeEntityRepo.findTrees()).pipe(filter(tree => tree instanceof WkoCategory))
    // var result2 = result.pipe(map(tree => tree as WkoCategory[]));
    return trees;
  }

  async getLocationLeafIds(ids: number[]): Promise<number[]> {
    var trees = await this.getLocationTrees();
    return this.getLeafIds(ids, trees);
  }

  async getCategoryLeafIds(ids: number[]): Promise<number[]> {
    var trees = await this.getCategoryTrees();
    return this.getLeafIds(ids, trees);
  }

  async getLeafIds(ids: number[], trees: TreeEntity[]): Promise<number[]> {
    var treesAndSubtreesWithGivenIds = await this.findTrees(trees, ids);
    // console.log("found matches: " + treesAndSubtreesWithGivenIds.map(t => t.name).join(", "));
    var missingIds: number[] = ids.filter(id => treesAndSubtreesWithGivenIds.findIndex(e => e.wkoId == id) == -1);
    if (missingIds.length) {
      console.log("Did not find entities for ids: " + missingIds.join());
    }
    var leaves = await this.getTreeLeaves(treesAndSubtreesWithGivenIds);
    var leavesIds = leaves.map(l => l.wkoId);
    var distinctLeafIds = Array.from(new Set(leavesIds));
    // console.log("locationids " + ids + " resolved to " + distinctLeafIds);
    return distinctLeafIds;
  }

  async findTrees(trees: TreeEntity[], ids: number[]): Promise<TreeEntity[]> {
    var currentLevelMatches = trees.filter(t => ids.indexOf(t.wkoId) > -1);
    var missingIds = ids.filter(id => currentLevelMatches.findIndex(t => t.wkoId == id) == -1);
    var nextLevelTrees = trees.map(t => t.children).reduce((a, b) => { return a.concat(b); });
    var matches = currentLevelMatches;
    if (nextLevelTrees.length && missingIds.length) {
      matches = matches.concat(await this.findTrees(nextLevelTrees, missingIds));
    }
    return matches;
  }

  async getTreeLeaves(locations: TreeEntity[]): Promise<TreeEntity[]> {
    var currentLevelLeaves = locations.filter(l => l.children.length == 0);
    var childLocationsArray = locations
      .filter(l => currentLevelLeaves.indexOf(l) == -1)
      .map(l => l.children);

    // hat mit reduce iwie nicht funktioniert. reduce with unknown empty start value...
    var childLocations: TreeEntity[] = [];
    for (let i = 0; i < childLocationsArray.length; i++) {
      childLocations = childLocations.concat(childLocationsArray[i]);
    }

    var result = currentLevelLeaves;
    if (childLocations.length) {
      result = result.concat(await this.getTreeLeaves(childLocations));
    }
    return result;
  }

  async getLoadingHistory(locations: number[], categories: number[]): Promise<WkoLoadingHistory[]> {
    var reducedLocationTrees = await this.getReducedLocationTrees(locations);
    var reducedCategoryTrees = await this.getReducedCategoryTrees(categories);
     // get second level items TODO


    return [];
  }

  getMinLevelTreeItems(trees: TreeEntity[], level: number) {

  }

  async getPendingLoadingHistory(): Promise<WkoLoadingHistory[]> {
    return this.loadingHistoryRepo
      .createQueryBuilder("loadingHistory")
      .where("loadingHistory.dateFinished IS NULL")
      .andWhere("NOT loadingHistory.cancelled")
      .orderBy("loadingHistory.datePlanned", "ASC")
      .getMany();
  }
}
