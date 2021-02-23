import { Body, Controller, Get, Logger, Post, Query, Headers } from '@nestjs/common';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoService } from './wko.service';
import { TreeEntity } from './entities/treeentity.entity';
import { WkowebsiteService } from './wkowebsite.service';
import { from, pipe } from 'rxjs';
import { map, filter, distinct } from 'rxjs/operators';
import { WkoCompanyInteraction } from './entities/wkocompanyinteraction.entity';

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
        var locations = await this.parseLocationWkoIdsFromParam(locationsString);
        var categories = await this.parseCategoryWkoIdsFromParam(categoriesString);
        Logger.debug("Get companies for locations: " + locations + " and cats: " + categories);

        var result: WkoCompanyResponse = { companies: null, loadingHistory: null };
        result.companies = await this.wko.getCompanies(locations, categories);
        // result.loadingHistory = await this.wko.getLoadingHistory(locations, categories);
        return result;
    }

    private async parseLocationWkoIdsFromParam(companyQueryParam: string): Promise<number[]> {
        var wkoIds: number[] = companyQueryParam ? companyQueryParam.split(",").map(ls => +(ls.trim())) : [];
        return from(this.wko.getReducedLocationTrees(wkoIds)).pipe(map(trees => trees.map(tree => tree.wkoId))).toPromise();
    }

    private async parseCategoryWkoIdsFromParam(companyQueryParam: string): Promise<number[]> {
        var wkoIds: number[] = companyQueryParam ? companyQueryParam.split(",").map(ls => +(ls.trim())) : [];
        return from(this.wko.getReducedLocationTrees(wkoIds)).pipe(map(trees => trees.map(tree => tree.wkoId))).toPromise();
    }

    @Post('fetchCompanies')
    async fetchCompanies(@Query('locations') locationsString: string, @Query('categories') categoriesString: string): Promise<boolean> {
        var locations = await this.parseLocationWkoIdsFromParam(locationsString);
        var categories = await this.parseCategoryWkoIdsFromParam(categoriesString);
        Logger.debug("fetch companies for locations: " + locations + " and cats: " + categories);

        this.wkoWebsite.addFetchCompaniesJobs(locations, categories);
        return true;
    }

    @Get('companiesAmount')
    async getCompaniesAmount(@Query('locations') locationsString: string, @Query('categories') categoriesString: string): Promise<number> {
        return 0;
    }

    @Get('interactions')
    async getInteractions(@Query('companyId') companyId: string): Promise<WkoCompanyInteraction[]> {
        return this.wko.getCompanyInteractions(companyId);
    }

    @Post('addInteraction')
    async addInteraction(@Body() interaction: any): Promise<void> {
        // console.log(JSON.stringify(headers));
        // console.log(JSON.stringify(interaction));
        this.wko.saveInteraction(interaction);
    }
}
