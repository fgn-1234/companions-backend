import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Browser, ElementHandle } from 'puppeteer';
import { WkoCategory } from './entities/wkocategory.entity';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoService } from './wko.service';
import { WkoLocation } from './entities/wkolocation.entity';
import { TreeEntity } from './entities/treeentity.entity';
const puppeteer = require('puppeteer');

interface WkoCompanyResponse {
    loadingHistory: string[];
    companies: WkoCompany[];
}

@Controller('wko')
export class WkoController {
    constructor(private wko: WkoService) { }

    @Get('categories')
    async findAllCategories(): Promise<TreeEntity[]> {
        return this.wko.getCategoryTrees();
    }

    @Post('fetchCategories')
    async fetchCategories() {
        this.fetchCategoriesTask();
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
        this.fetchLocationsTask(isTestRun ? 10 : 0);
        return true;
    }

    @Get('companies')
    async companies(@Query('locations') locationsString: string, @Query('categories') categoriesString: string): Promise<WkoCompanyResponse> {
        var locations: number[] = locationsString ? locationsString.split(",").map(ls => +(ls.trim())) : [];
        var categories: number[] = categoriesString ? categoriesString.split(",").map(cs => +(cs.trim())) : [];

        await this.wko.getReducedLocationTrees(locations);

        console.log("Get companies for locations: " + locations + " and cats: " + categories);
        var result: WkoCompanyResponse = { companies: null, loadingHistory: null };
        result.companies = await this.wko.getCompanies(locations, categories);
        result.loadingHistory = await this.wko.getLoadingHistory(locations, categories);
        return result;
    }

    async fetchCategoriesTask() {
        const browser = await puppeteer.launch({
            headless: false,
            // slowMo: 30 // slow down by 250ms
        }) as Browser;
        const page = await browser.newPage();
        await page.goto('https://firmen.wko.at/SearchComplex.aspx?AutoSearch=True#');
        await page.click('button.cookieagree');
        await page.click('#BranchenAuswahlComplex');
        await new Promise(resolve => setTimeout(resolve, 3000));
        const tablesdiv = await page.$('#ctl00_SearchboxPanel_popup_DynamicControl1_treeView');
        // alle branchen expanden
        var expanded = true;
        var categories = [];
        var i = 0;
        while (expanded) {
            expanded = false;
            const tables = await tablesdiv.$$('table');
            for (let table of tables) {
                // hole alle tds
                // if (categories.length > 10)
                //     break;
                const tds = await table.$$('td');
                // wenn vorletzter einen link enthält
                const secondlasttd = tds[tds.length - 2];
                const clicklink = await secondlasttd.$('a');
                if (clicklink != null) {
                    // dann werte vom letzten checken und dann clicken und hinzufügen und added = true
                    var result = await this.getIdAndTitle(tds);
                    // console.log(result);
                    if (categories.indexOf(result) == -1) {
                        await clicklink.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        categories.push(result);
                        const clicklinkhref = await (await clicklink.getProperty('href')).jsonValue() as string;
                        // console.log(clicklinkhref);
                        expanded = true;
                    }
                    else {
                        console.log("category already in list: " + result);
                        // return false;
                    }
                    // }
                }
                else {
                    var result = await this.getIdAndTitle(tds);
                    console.log("clicklink was null " + result); // so it is the leafcategory

                    categories.push(result);
                    // return false;
                }
            }
            // if (categories.length > 10)
            //     break;
        }
        await browser.close();

        // alle branchen speichern
        return this.saveCategories(categories);
    }

    async getIdAndTitle(tds: ElementHandle<Element>[]) {
        const datalink = await tds[tds.length - 1].$('a');
        const href = await (await datalink.getProperty('href')).jsonValue() as string;
        var title = await (await datalink.getProperty('title')).jsonValue() as string;
        if (title === "") {
            // stattdessen linktext verwenden
            title = await (await datalink.getProperty('innerHTML')).jsonValue() as string;
        }
        const hrefParts = href.split(",");
        const id = hrefParts[1];
        // const linkindex = hrefParts[1];
        // console.log(linkindex);
        // if (hrefParts.length < 7) {
        //     // some kind of emtpy parent category?
        // }
        // else {
        var result = title + "#" + id; // hrefParts[6] + "  " + hrefParts[7];
        return result;
    }

    async saveCategories(categories: string[]) {
        var savedCategories: WkoCategory[] = [];
        for (let c of categories) {
            // console.log("new iteration");
            var catparts = c.split("#");
            var catName = catparts[0];
            var catIdParts = catparts[1].split("\\");
            var catId = catIdParts[catIdParts.length - 1];
            var category = new WkoCategory();
            // console.log("before: " + this.cleanWkoId(catId));
            category.wkoId = +this.cleanWkoId(catId);
            // console.log("klo id: " + category.wkoId);
            category.name = catName;
            if (catIdParts.length > 1) {
                console.log("catidparts: " + catIdParts);
                var parentCatId = +this.cleanWkoId(catIdParts[catIdParts.length - 3]);
                console.log("parentcatid: " + parentCatId);
                var parentCategory = await this.wko.findOneCategory(parentCatId);
                category.parent = parentCategory;
            }
            await this.wko.addCategory(category)
                .then((savedCat) => {
                    savedCategories.push(savedCat);
                    // console.log("saved");
                }).catch((e) => {
                    console.log(e);
                });
        }
        // console.log(savedCategories);
        // console.log(savedCategories.length);
        return savedCategories;
    }

    cleanWkoId(wkoId: string) {
        return wkoId.replace(/\D/g, '');
    }

    async fetchLocationsTask(testAmount: number) {
        console.log(testAmount);
        const browser = await puppeteer.launch({
            headless: false,
            // slowMo: 30 // slow down by 250ms
        }) as Browser;
        const page = await browser.newPage();
        await page.goto('https://firmen.wko.at/SearchComplex.aspx?AutoSearch=True#');
        await page.click('button.cookieagree');
        await page.click('#AuswahlStandortComplex');
        await new Promise(resolve => setTimeout(resolve, 3000));
        const tablesdiv = await page.$('#ctl00_SearchboxPanel_popup_DynamicControl1_treeView');
        // alle standorte expanden
        var expanded = true;
        var locations = [];
        var i = 0;
        while (expanded) {
            expanded = false;
            const tables = await tablesdiv.$$('table');
            for (let table of tables) {
                // hole alle tds
                if (testAmount > 0 && locations.length > testAmount)
                    break;
                const tds = await table.$$('td');
                // wenn vorletzter einen link enthält
                const secondlasttd = tds[tds.length - 2];
                const clicklink = await secondlasttd.$('a');
                if (clicklink != null) {
                    // dann werte vom letzten checken und dann clicken und hinzufügen und added = true
                    var result = await this.getIdAndTitle(tds);
                    console.log(result);
                    if (locations.indexOf(result) == -1) {
                        await clicklink.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        locations.push(result);
                        const clicklinkhref = await (await clicklink.getProperty('href')).jsonValue() as string;
                        // console.log(clicklinkhref);
                        expanded = true;
                    }
                    else {
                        console.log("location already in list: " + result);
                        // return false;
                    }
                    // }
                }
                else {
                    var result = await this.getIdAndTitle(tds);
                    console.log("clicklink was null " + result); // so it is the leaflocation

                    locations.push(result);
                    // return false;
                }
            }
            if (testAmount > 0 && locations.length > testAmount)
                break;
        }
        await browser.close();

        // alle standorte speichern
        return this.saveLocations(locations);
    }

    async saveLocations(locations: string[]) {
        var savedLocations: WkoLocation[] = [];
        for (let l of locations) {
            // console.log("new iteration");
            var locParts = l.split("#");
            var locName = locParts[0];
            var locIdParts = locParts[1].split("\\");
            var locId = locIdParts[locIdParts.length - 1];
            var location = new WkoLocation();
            // console.log("before: " + this.cleanWkoId(catId));
            location.wkoId = +this.cleanWkoId(locId);
            // console.log("klo id: " + category.wkoId);
            location.name = locName;
            if (locIdParts.length > 1) {
                console.log("locidparts: " + locIdParts);
                var parentLocId = +this.cleanWkoId(locIdParts[locIdParts.length - 3]);
                console.log("parentlocid: " + parentLocId);
                var parentLocation = await this.wko.findOneLocation(parentLocId);
                location.parent = parentLocation;
            }
            await this.wko.addLocation(location)
                .then((saved) => {
                    savedLocations.push(saved);
                    // console.log("saved");
                }).catch((e) => {
                    console.log(e);
                });
        }
        // console.log(savedLocations);
        // console.log(savedLocations.length);
        return savedLocations;
    }
}
