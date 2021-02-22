import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getTreeRepository, Repository, TreeRepository, } from 'typeorm';
import { TreeEntity } from './entities/treeentity.entity';
import { WkoCategory } from './entities/wkocategory.entity';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoLocation } from './entities/wkolocation.entity';
import { from, pipe } from 'rxjs';
import { map, filter, distinct } from 'rxjs/operators';

interface TreeWithAllDescendantIds {
  tree: TreeEntity;
  leafIds: number[];
}

@Injectable()
export class WkoService {
  constructor(
    @InjectRepository(WkoCategory) private categoryRepo: Repository<WkoCategory>,
    @InjectRepository(WkoLocation) private locationRepo: Repository<WkoLocation>,
    @InjectRepository(TreeEntity) private treeEntityRepo: TreeRepository<TreeEntity>,
    @InjectRepository(WkoCompany) private companyRepo: Repository<WkoCompany>,
    // @InjectRepository(WkoLoadingHistory) private loadingHistoryRepo: Repository<WkoLoadingHistory>
  ) { }

  async findOneCategory(wkoId: number): Promise<WkoCategory> {
    return this.categoryRepo.findOne({
      where: {
        wkoId
      },
    });
  }

  async addCategory(category: WkoCategory): Promise<WkoCategory> {
    return this.categoryRepo.save(category);
  }

  async findOneLocation(wkoId: number): Promise<WkoLocation> {
    return this.locationRepo
      .createQueryBuilder("location")
      .where("location.wkoId=:wkoId", { wkoId: wkoId })
      .getOne();
  }

  async findAncestorLocation(location: WkoLocation): Promise<WkoLocation> {
    return (await this.treeEntityRepo.findAncestors(location))[0] as WkoLocation;
  }

  async addLocation(location: WkoLocation): Promise<WkoLocation> {
    return this.locationRepo.save(location);
  }

  async getCompanies(locationIds: number[], categoryIds: number[]): Promise<WkoCompany[]> {
    var locationLeafIds = await this.getLocationNodeIds(locationIds);
    var categoryLeafIds = await this.getCategoryNodeIds(categoryIds);

    var query = this.companyRepo
      .createQueryBuilder("company");
    if (categoryLeafIds.length)
      query.innerJoin('company.categories', 'category', 'category.wkoId IN (:categoryIds)', { categoryIds: categoryLeafIds });
    if (locationLeafIds.length)
      query.innerJoin('company.locations', 'location', 'location.wkoId IN (:locationIds)', { locationIds: locationLeafIds });
    // Logger.debug(query.getQueryAndParameters());
    return query.getMany();
  }

  async saveCompany(company: WkoCompany): Promise<WkoCompany> {
    return this.companyRepo.save(company);
  }

  async addCompanyLocation(companyid: string, locationString: string): Promise<void> {
    var location = await this.locationRepo
      .createQueryBuilder("loc")
      .where("loc.name = :locString", { locString: locationString })
      .getOne();
    if (location) {
      return this.companyRepo
        .createQueryBuilder("company")
        .relation("locations")
        .of(companyid)
        .add(location.id);
    }
  }

  async addCompanyCategory(companyid: string, categoryId: number): Promise<void> {
    return this.companyRepo
      .createQueryBuilder("company")
      .relation("categories")
      .of(companyid)
      .add(categoryId);
  }

  async reduceRedundancies(trees: TreeEntity[]): Promise<TreeEntity[]> {
    var treesWithLeafIds: TreeWithAllDescendantIds[] = [];
    for (let i = 0; i < trees.length; i++) {
      treesWithLeafIds.push({ tree: trees[i], leafIds: await this.getTreeNodeIds([trees[i].wkoId], [trees[i]]) });
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

    // Logger.debug("the sorted map: " + sorted.map(s => s.tree.wkoId + ": " + s.leafIds.length).join(", "));

    // reduce now
    var totalLeafIds = [];
    var distinctTrees = [];
    for (let i = 0; i < sorted.length; i++) {
      if (!sorted[i].leafIds.every(id => totalLeafIds.indexOf(id) > -1)) {
        totalLeafIds = totalLeafIds.concat(sorted[i].leafIds);
        distinctTrees.push(sorted[i].tree);
      }
    }

    // Logger.debug(distinctTrees);

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

  async getLocationNodeIds(ids: number[]): Promise<number[]> {
    var trees = await this.getLocationTrees();
    return this.getTreeNodeIds(ids, trees);
  }

  async getCategoryNodeIds(ids: number[]): Promise<number[]> {
    var trees = await this.getCategoryTrees();
    return this.getTreeNodeIds(ids, trees);
  }

  async getTreeNodeIds(ids: number[], trees: TreeEntity[]): Promise<number[]> {
    var treesAndSubtreesWithGivenIds = await this.findTrees(trees, ids);
    // Logger.debug("found matches: " + treesAndSubtreesWithGivenIds.map(t => t.name).join(", "));
    var missingIds: number[] = ids.filter(id => treesAndSubtreesWithGivenIds.findIndex(e => e.wkoId == id) == -1);
    if (missingIds.length) {
      Logger.debug("Did not find entities for ids: " + missingIds.join());
    }
    var leaves = await this.getTreeNodes(treesAndSubtreesWithGivenIds);
    var leavesIds = leaves.map(l => l.wkoId);
    var distinctLeafIds = Array.from(new Set(leavesIds));
    // Logger.debug("locationids " + ids + " resolved to " + distinctLeafIds);
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

  async getTreeNodes(parentNodes: TreeEntity[]): Promise<TreeEntity[]> {
    var currentLevelLeaves = parentNodes.filter(l => l.children.length == 0);
    var childrenListList = parentNodes
      .filter(l => currentLevelLeaves.indexOf(l) == -1)
      .map(l => l.children);

    // hat mit reduce iwie nicht funktioniert. reduce with unknown empty start value...
    var children: TreeEntity[] = [];
    for (let i = 0; i < childrenListList.length; i++) {
      children = children.concat(childrenListList[i]);
    }

    var result = parentNodes; // new version since 2021.02.22 to include intermediate nodes too. previous: currentLevelLeaves;
    if (children.length) {
      result = result.concat(await this.getTreeNodes(children));
    }
    return result;
  }

  // async getLoadingHistory(locations: number[], categories: number[]): Promise<WkoLoadingHistory[]> {
  //   var reducedLocationTrees = await this.getReducedLocationTrees(locations);
  //   var reducedCategoryTrees = await this.getReducedCategoryTrees(categories);
  //    // get second level items TODO


  //   return [];
  // }

  getMinLevelTreeItems(trees: TreeEntity[], level: number) {

  }

  // async getPendingLoadingHistory(): Promise<WkoLoadingHistory[]> {
  //   return this.loadingHistoryRepo
  //     .createQueryBuilder("loadingHistory")
  //     .where("loadingHistory.dateFinished IS NULL")
  //     .andWhere("NOT loadingHistory.cancelled")
  //     .orderBy("loadingHistory.datePlanned", "ASC")
  //     .getMany();
  // }

  // async saveLoadingHistoryEntries(loadingHistoryEntries: WkoLoadingHistory[]): Promise<WkoLoadingHistory[]> {
  //   Logger.debug(loadingHistoryEntries);
  //   return this.loadingHistoryRepo.save(loadingHistoryEntries);
  // }
}
