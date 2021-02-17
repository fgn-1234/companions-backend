import { Injectable } from '@nestjs/common';
import { WkoService } from './wko.service';
import { WkoCategory } from './entities/wkocategory.entity';
import { WkoLocation } from './entities/wkolocation.entity';
import { Browser, ElementHandle, Page, Request } from 'puppeteer';
import { WkoLoadingHistory } from './entities/wkoloadinghistory.entity';
import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
const puppeteer = require('puppeteer');

const blockedResources = [
  'quantserve',
  'adzerk',
  'doubleclick',
  'adition',
  'exelator',
  'sharethrough',
  'twitter',
  'google-analytics',
  'fontawesome',
  'facebook',
  'analytics',
  'optimizely',
  'clicktale',
  'mixpanel',
  'zedo',
  'clicksor',
  'tiqcdn',
  'googlesyndication',
];

@Injectable()
export class WkowebsiteService {
  constructor(private wko: WkoService,
    @InjectQueue('audio') private audioQueue: Queue) { }

  async getNewBrowserPage(headless: boolean, url: string, blockTraceResources: boolean) {
    const browser = await puppeteer.launch({
      headless: headless,
      // slowMo: 30 // slow down by 250ms
    }) as Browser;
    var page = (await browser.pages())[0];
    if (blockTraceResources) {
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        //   // BLOCK IMAGES ... disabled
        //   if (request.url().endsWith('.png') || request.url().endsWith('.jpg'))
        //       request.abort();
        //   // BLOCK CERTAIN DOMAINS
        //   else 
        if (blockedResources.some(resource => request.url().indexOf(resource) !== -1))
          request.abort();
        // ALLOW OTHER REQUESTS
        else
          request.continue();
      });
    }
    // const page = await browser.newPage();
    await page.goto(url);
    await this.acceptCookies(page);
    return page;
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

  async acceptCookies(page: Page) {
    await page.click('button.cookieagree');
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

  async addFetchCompaniesJobs(locations: number[], categories: number[]) {
    // write task to db as for each combination of loc and cat
    var loadingHistoryEntries: WkoLoadingHistory[] = [];
    for (let loc of locations) {
      for (let cat of categories) {
        var newEntry = new WkoLoadingHistory();
        newEntry.locationId = loc;
        newEntry.categoryId = cat;
        newEntry.isActive = true;
        loadingHistoryEntries.push(newEntry);
      }
    }
    loadingHistoryEntries.forEach(lh => {
      this.audioQueue.add(lh);
    });
    // var saved = await this.wko.saveLoadingHistoryEntries(loadingHistoryEntries);
    // var unsaved = saved.filter(s => s.cancelled === undefined);
    // if (unsaved.length) {
    //   console.log("entries were not saved (maybe duplicates): %j",
    //     JSON.stringify(unsaved));
    // }
  }

  /*
  result: number of companies found. if it exceeds 1000 caller must split job to subjobs
  **/
  async fetchCompaniesTask(loadingEntry: WkoLoadingHistory): Promise<number> {
    try {
      var url = await this.buildCompanySearchUrl(loadingEntry);
      var page = await this.getNewBrowserPage(false, url, true);
      var resultCount = await this.getCompaniesResultCount(page);




      await new Promise(resolve => setTimeout(resolve, 10000));
      await page.browser().close();
      return 0;
    }
    catch (e) {
      console.log(e);
      return 1;
    }
  }

  async buildCompanySearchUrl(loadingEntry: WkoLoadingHistory): Promise<string> {
    var locationString = this.normalizeLocationStringForCompaniesSearch(loadingEntry);
    var url = 'https://firmen.wko.at/-/';
    url += locationString + '/';
    var categoryString = 'branche=' + loadingEntry.categoryId;
    url += '?' + categoryString;
    return url;
  }

  async normalizeLocationStringForCompaniesSearch(loadingEntry: WkoLoadingHistory) : Promise<string> {
    if (!loadingEntry.locationId)
      throw new Error('Fetch Companies: locationid not set!');
    var location = await this.wko.findOneLocation(loadingEntry.locationId);
    let locationString = '';
    // location is bundesland: simply take name
    if (location.level == 1)
      locationString = location.name;
    // location parent is wien(1) simply take name
    else if ((await this.wko.findAncestorLocation(location)).wkoId == 1)
      locationString = location.name;
    // location is lvl 2 take name with underline bezirk
    else if (location.level == 2)
      locationString = location.name + "_bezirk";
    // location is lvl 3 take name with underline gemeinde
    else if (location.level == 3)
      locationString = location.name + "_gemeinde";
    else
      throw new Error('fetchCompaniesTask: locationString could not be determined.');

    newLocString = locationString.toLowerCase();
    do {
      locationString = newLocString;
      var newLocString = locationString.replace(" ", "-").replace(".", "-").replace("/", "-").replace("--", "-");
    } while (newLocString !== locationString);
    return locationString;
  }

  async getCompaniesResultCount(page: Page): Promise<number> {
    var resultsString = await (await (await page.$('header h1 a')).getProperty('innerText')).jsonValue() as string;
    var results = +(resultsString.replace("Treffer", "").trim());
    return results;
  }

  // page: Page = null;
  // calledtwice: boolean = false;

  // @Get('testSkipResources')
  // async testSkipResources() {
  //     if (this.page == null)
  //         this.page = await this.getNewBrowserPage(false, 'https://firmen.wko.at/raiffeisenbank-timelkam-lenzing-puchkirchen-egen/ober%c3%b6sterreich/?firmaid=04961172-01af-46df-b5e5-3d8577ae8874&standortid=1209&standortname=timelkam%20%28gemeinde%29&branche=3911&branchenname=bank%20und%20versicherung');
  //     else if (!this.calledtwice) {
  //         await this.page.setRequestInterception(true);
  //         this.page.on('request', (request) => {
  //             //   // BLOCK IMAGES ... disabled
  //             //   if (request.url().endsWith('.png') || request.url().endsWith('.jpg'))
  //             //       request.abort();
  //             //   // BLOCK CERTAIN DOMAINS
  //             //   else 
  //             if (blockedResources.some(resource => request.url().indexOf(resource) !== -1))
  //                 request.abort();
  //             // ALLOW OTHER REQUESTS
  //             else
  //                 request.continue();
  //         });
  //         this.page.goto('https://firmen.wko.at/raiffeisenbank-timelkam-lenzing-puchkirchen-egen/ober%c3%b6sterreich/?firmaid=04961172-01af-46df-b5e5-3d8577ae8874&standortid=1209&standortname=timelkam%20%28gemeinde%29&branche=3911&branchenname=bank%20und%20versicherung');
  //         this.calledtwice = true;
  //     }
  //     else {
  //         this.page.browser().close();
  //         this.calledtwice = false;
  //         this.page = null;
  //     }

  // }

}
