import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoService } from './wko.service';
import { TreeEntity } from './entities/treeentity.entity';
import { WkowebsiteService } from './wkowebsite.service';

interface WkoCompanyResponse {
    loadingHistory: string[];
    companies: WkoCompany[];
}

@Controller('wko')
export class WkoController {
    constructor(private wko: WkoService, 
        private wkoWebsite: WkowebsiteService) { }

    @Get('categories')
    async findAllCategories(): Promise<TreeEntity[]> {
        return this.wko.getCategoryTrees();
    }

    @Post('fetchCategories')
    async fetchCategories() {
        this.wkoWebsite.fetchCategoriesTask();
        // this.saveCategories(["Bank und Versicherung#'s3911')"]);
        return true;
    }

    @Get('locations')
    async findAllLocations(): Promise<TreeEntity[]> {
        return this.wko.getLocationTrees();
    }

    @Post('fetchLocations')
    async fetchLocations() {
        var isTestRun = false;
        this.wkoWebsite.fetchLocationsTask(isTestRun ? 10 : 0);
        return true;
    }

    @Get('companies')
    async companies(@Query('locations') locationsString: string, @Query('categories') categoriesString: string): Promise<WkoCompanyResponse> {
        var locations: number[] = locationsString ? locationsString.split(",").map(ls => +(ls.trim())) : [];
        var categories: number[] = categoriesString ? categoriesString.split(",").map(cs => +(cs.trim())) : [];

        Logger.debug("Get companies for locations: " + locations + " and cats: " + categories);
        locations = (await this.wko.getReducedLocationTrees(locations)).map(t => t.wkoId);
        categories = (await this.wko.getReducedCategoryTrees(categories)).map(t => t.wkoId);

        // Logger.debug("Get companies for reduced locations: " + locations + " and reduced cats: " + categories);
        var result: WkoCompanyResponse = { companies: null, loadingHistory: null };
        result.companies = await this.wko.getCompanies(locations, categories);
        // result.loadingHistory = await this.wko.getLoadingHistory(locations, categories);
        return result;
    }

    @Post('fetchCompanies')
    async fetchCompanies(@Query('locations') locationsString: string, @Query('categories') categoriesString: string): Promise<boolean> {
        var locations: number[] = locationsString ? locationsString.split(",").map(ls => +(ls.trim())) : [];
        var categories: number[] = categoriesString ? categoriesString.split(",").map(cs => +(cs.trim())) : [];

        Logger.debug("fetch companies for locations: " + locations + " and cats: " + categories);
        locations = (await this.wko.getReducedLocationTrees(locations)).map(t => t.wkoId);
        categories = (await this.wko.getReducedCategoryTrees(categories)).map(t => t.wkoId);

        this.wkoWebsite.addFetchCompaniesJobs(locations, categories);

        return true;
    }
}
