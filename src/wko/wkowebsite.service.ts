import { Injectable, Logger } from '@nestjs/common';
import { WkoService } from './wko.service';
import { WkoCategory } from './entities/wkocategory.entity';
import { WkoLocation } from './entities/wkolocation.entity';
import { Browser, ElementHandle, Page, Request } from 'puppeteer';
import { WkoLoadingHistory } from './entities/wkoloadinghistory.entity';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { WkoCompany } from './entities/wkocompany.entity';
import { QueryFailedError } from 'typeorm';
import { IamService } from 'src/iam/iam.service';
const puppeteer = require('puppeteer');

const BLOCKED_RESOURCES = [
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

const COMPANY_SEARCH_RESULT_PAGE_SIZE = 10;

const FETCH_COMPANIES_TEST_AMOUNT = 0;

@Injectable()
export class WkowebsiteService {
  constructor(private wko: WkoService,
    @InjectQueue('loadCompanyData') private audioQueue: Queue,
    private iamService: IamService) { }

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
        if (BLOCKED_RESOURCES.some(resource => request.url().indexOf(resource) !== -1))
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
          // Logger.debug(result);
          if (categories.indexOf(result) == -1) {
            await clicklink.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            categories.push(result);
            const clicklinkhref = await (await clicklink.getProperty('href')).jsonValue() as string;
            // Logger.debug(clicklinkhref);
            expanded = true;
          }
          else {
            Logger.debug("category already in list: " + result);
            // return false;
          }
          // }
        }
        else {
          var result = await this.getIdAndTitle(tds);
          Logger.debug("clicklink was null " + result); // so it is the leafcategory

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
    // Logger.debug(linkindex);
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
      // Logger.debug("new iteration");
      var catparts = c.split("#");
      var catName = catparts[0];
      var catIdParts = catparts[1].split("\\");
      var catId = catIdParts[catIdParts.length - 1];
      var category = new WkoCategory();
      // Logger.debug("before: " + this.cleanWkoId(catId));
      category.wkoId = +this.cleanWkoId(catId);
      // Logger.debug("klo id: " + category.wkoId);
      category.name = catName;
      if (catIdParts.length > 1) {
        Logger.debug("catidparts: " + catIdParts);
        var parentCatId = +this.cleanWkoId(catIdParts[catIdParts.length - 3]);
        Logger.debug("parentcatid: " + parentCatId);
        var parentCategory = await this.wko.findOneCategory(parentCatId);
        category.parent = parentCategory;
      }
      await this.wko.addCategory(category)
        .then((savedCat) => {
          savedCategories.push(savedCat);
          // Logger.debug("saved");
        }).catch((e) => {
          Logger.debug(e);
        });
    }
    // Logger.debug(savedCategories);
    // Logger.debug(savedCategories.length);
    return savedCategories;
  }

  cleanWkoId(wkoId: string) {
    return wkoId.replace(/\D/g, '');
  }

  async acceptCookies(page: Page) {
    await page.click('button.cookieagree');
  }

  async fetchLocationsTask(testAmount: number) {
    Logger.debug(testAmount);
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
          Logger.debug(result);
          if (locations.indexOf(result) == -1) {
            await clicklink.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            locations.push(result);
            const clicklinkhref = await (await clicklink.getProperty('href')).jsonValue() as string;
            // Logger.debug(clicklinkhref);
            expanded = true;
          }
          else {
            Logger.debug("location already in list: " + result);
            // return false;
          }
          // }
        }
        else {
          var result = await this.getIdAndTitle(tds);
          Logger.debug("clicklink was null " + result); // so it is the leaflocation

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
      // Logger.debug("new iteration");
      var locParts = l.split("#");
      var locName = locParts[0];
      var locIdParts = locParts[1].split("\\");
      var locId = locIdParts[locIdParts.length - 1];
      var location = new WkoLocation();
      // Logger.debug("before: " + this.cleanWkoId(catId));
      location.wkoId = +this.cleanWkoId(locId);
      // Logger.debug("klo id: " + category.wkoId);
      location.name = locName;
      if (locIdParts.length > 1) {
        Logger.debug("locidparts: " + locIdParts);
        var parentLocId = +this.cleanWkoId(locIdParts[locIdParts.length - 3]);
        Logger.debug("parentlocid: " + parentLocId);
        var parentLocation = await this.wko.findOneLocation(parentLocId);
        location.parent = parentLocation;
      }
      await this.wko.addLocation(location)
        .then((saved) => {
          savedLocations.push(saved);
          // Logger.debug("saved");
        }).catch((e) => {
          Logger.debug(e);
        });
    }
    // Logger.debug(savedLocations);
    // Logger.debug(savedLocations.length);
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
  }

  async fetchCompaniesResultCountTask(location: number, category: number): Promise<number> {
    try {
      var loadingEntry = new WkoLoadingHistory();
      loadingEntry.locationId = location;
      loadingEntry.categoryId = category;
      var url = await this.buildCompaniesSearchUrl(loadingEntry);
      Logger.debug(url);
      var page = await this.getNewBrowserPage(false, url, true);
      var result = await this.getCompaniesResultCount(page);
      await page.browser().close();
      return result;
    }
    catch (e) {
      Logger.error(e);
      return -1;
    }
  }

  /*
  result: number of companies found. if it exceeds 1000 caller must split job to subjobs
  **/
  async fetchCompaniesTask(loadingEntry: WkoLoadingHistory, reportProgress: (progress: number) => void): Promise<number> {
    try {
      var url = await this.buildCompaniesSearchUrl(loadingEntry);
      Logger.debug(url);
      var page = await this.getNewBrowserPage(false, url, true);
      var resultCount = await this.getCompaniesResultCount(page);
      if (resultCount < 1000) {
        // paginate through the results: ...
        Logger.debug("got " + resultCount + " results");
        await this.fetchCompaniesFromSearch(page, resultCount, reportProgress, loadingEntry);
      } else {
        // TODO: split job to multiple subjobs
        throw new Error("not yet implemented: too many company results");
      }



      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.browser().close();
      return 0;
    }
    catch (e) {
      Logger.error(e);
      return 1;
    }
  }

  async fetchCompaniesFromSearch(page: Page, resultCount: number, reportProgress: (progress: number) => void, loadingEntry: WkoLoadingHistory) {
    var url = page.url();
    var pagesCount = Math.ceil(resultCount * 1.0 / COMPANY_SEARCH_RESULT_PAGE_SIZE);
    for (let pageNumber = 1; pageNumber <= pagesCount; pageNumber++) { 
      var urlWithPage = url;
      if (pageNumber > 1)
        urlWithPage += "&page=" + pageNumber;
      await page.goto(urlWithPage);
      await this.fetchCompaniesFromSearchPaginated(page, resultCount, pageNumber, reportProgress, loadingEntry);
      if (FETCH_COMPANIES_TEST_AMOUNT && (pageNumber * COMPANY_SEARCH_RESULT_PAGE_SIZE) > FETCH_COMPANIES_TEST_AMOUNT)
        break;
    }
  }

  async fetchCompaniesFromSearchPaginated(page: Page, resultCount: number, pageNumber: number, reportProgress: (progress: number) => void, loadingEntry: WkoLoadingHistory) {
    var pageSize = COMPANY_SEARCH_RESULT_PAGE_SIZE;
    var alreadyHandledAmount = (pageNumber - 1) * pageSize;
    var currentPageSize = Math.min(resultCount - alreadyHandledAmount, pageSize);
    var companyResults = await page.$$('#result article > div > div > div');
    if (companyResults.length != currentPageSize)
      throw new Error("fetchCompaniesFromSearchPaginated: results amount of " + companyResults.length + " does not match expected amount of " + currentPageSize);

    var currentIndex = alreadyHandledAmount + 1;
    for (let companyResult of companyResults) {
      var company = await this.parseCompanyResult(companyResult);
      if (company.id) {
        // try to link location
        var locationString = await this.iamService.getGemeindeFromOrtAndPLZ(company.locality, company.zip);
        this.wko.saveCompany(company)
          .then(c => {
            this.wko.addCompanyLocation(company.id, locationString)
              .catch(e => {
                Logger.warn(e);
              });
            this.wko.addCompanyCategory(company.id, loadingEntry.categoryId);
          })
          .catch(e => {
            // if (e instanceof QueryFailedError) {
            //   var queryFailedError = e as QueryFailedError;
            //   if (queryFailedError.message.indexOf('searchResultHtml') > -1) {
            //     Logger.error("ERROR: increase size of searchResultHtml column");
            //   } else {
            //     Logger.error(e);
            //   }
            // } else {
            Logger.error(e);
            // }
          });
      } else {
        Logger.debug("did not find company id");
      }
      currentIndex += 1;
      if (FETCH_COMPANIES_TEST_AMOUNT && (currentIndex) > FETCH_COMPANIES_TEST_AMOUNT)
        break;
    }


    // test report progress
    reportProgress(Math.min(100, Math.floor(pageNumber * COMPANY_SEARCH_RESULT_PAGE_SIZE * 100.0 / (resultCount * 1.0))));
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  async parseCompanyResult(companyResult: ElementHandle<Element>) {
    var company = new WkoCompany();
    try {
      // Logger.debug("parseCompanyResult: companyResult: " + JSON.stringify(companyResult));
      // <div class="row">
      // var nameLink = await companyResult.$('a');
      company.wkoLink = await this.getPropertyFromSelection(companyResult, 'a', 'href'); // await (await nameLink.getProperty('href')).jsonValue() as string;

      // /gerhard-ecker/ober%c3%b6sterreich/?firmaid=ab745112-6b5f-4056-a226-8b79cca40478&standortid=63&standortname=steyr%20%28stadt%29%20%28bezirk%29&branche=47630&branchenname=tischler
      company.name = await this.getPropertyFromSelection(companyResult, 'a', 'innerHTML');// await (await nameLink.getProperty('innerHTML')).jsonValue() as string;
      company.searchResultHtml = await this.getPropertyFromSelection(companyResult, '', 'outerHTML');
      var companyUrlSearchParams = new URLSearchParams(company.wkoLink);
      // Logger.debug(companyUrlSearchParams);
      // company.id = companyUrlSearchParams..entries().get('firmaid');
      // because this url is broken for URLSearchParams, i need to simply take the first entry
      for (let searchParam of companyUrlSearchParams) {
        if (searchParam[0].indexOf("firmaid") != -1)
          company.id = searchParam[1];
      }
      // Logger.debug("companyId: " + company.id);
      company.street = await this.getPropertyFromSelection(companyResult, '.street', 'innerHTML');
      company.zip = await this.getPropertyFromSelection(companyResult, '.zip', 'innerHTML');
      company.locality = await this.getPropertyFromSelection(companyResult, '.locality', 'innerHTML');
      company.phone = await this.getPropertyFromSelection(companyResult, '.icon-phone>a', 'innerHTML');
      company.mobile = await this.getPropertyFromSelection(companyResult, '.icon-mobile>a', 'innerHTML');
      company.fax = await this.getPropertyFromSelection(companyResult, '.icon-fax>a', 'innerHTML');
      company.email = await this.getPropertyFromSelection(companyResult, '.icon-email>a', 'innerHTML');
      company.web = await this.getPropertyFromSelection(companyResult, '.icon-web>a', 'innerHTML');
      // locations, categories...
    } catch (e) {
      Logger.error(e);
    }
    return company;
  }

  async getPropertyFromSelection(rootElement: ElementHandle<Element>, query: string, property: string): Promise<string> {
    try {
      var queryElement: ElementHandle<Element>;
      if (query != '')
        queryElement = await rootElement.$(query);
      else
        queryElement = rootElement;
      var result = await (await queryElement.getProperty(property)).jsonValue() as string;
      // Logger.debug("getPropertyFromSelection: " + query + "(" + property + "): " + result);
      return result;
    }
    catch (e) {
      // Logger.error("getPropertyFromSelection: " + query + "(" + property + "): could not be found");
      return "";
    }
  }

  async buildCompaniesSearchUrl(loadingEntry: WkoLoadingHistory): Promise<string> {
    var locationString = await this.normalizeLocationStringForCompaniesSearch(loadingEntry);
    var url = 'https://firmen.wko.at/-/';
    url += locationString + '/';
    var categoryString = 'branche=' + loadingEntry.categoryId;
    url += '?' + categoryString;
    return url;
  }

  async normalizeLocationStringForCompaniesSearch(loadingEntry: WkoLoadingHistory): Promise<string> {
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
    var results = +(resultsString.replace("Treffer", "").replace("über", "").trim());
    return results;
  }
}


// aktuell automatic call recorder app
// ansonsten vlt wieder callbox verwenden
