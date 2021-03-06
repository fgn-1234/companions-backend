import { HttpService, Injectable, Logger } from '@nestjs/common';
// import {  } from 'cheerio';
const cheerio = require('cheerio');

@Injectable()
export class IamService {
  constructor(private http: HttpService) { }

  // seite 21 ca
  cache: { [id: string]: string; } = {};


  async getGemeindeFromOrtAndPLZ(ort: string, plz: string): Promise<string> {
    try {
      Logger.debug("ort: " + ort);
      Logger.debug("plz: " + plz);
      var cacheIdString = ort + plz;
      if (this.cache[cacheIdString])
        return this.cache[cacheIdString];
      var reqBody = "Eingabe=" + plz + "&Was=Plz&B1=Suchen";
      var page = (await this.http.post<string>('http://iam.at/austria/read.asp', reqBody).toPromise()).data;

      var $ = cheerio.load(page);
      var entriesRaw: cheerio.Cheerio = $("tr:nth-child(2) td:nth-child(2)");
      // Logger.debug(entriesRaw.text());
      var newLineSplitted = entriesRaw.text().split("\n").slice(6);
      var valueRows = newLineSplitted.slice(0, newLineSplitted.length - 3);
      Logger.debug(valueRows.length + ": " + valueRows);
      var matchingRow = valueRows.find(s => s.startsWith(plz + " - " + ort));
      Logger.debug("matchingRow: " + matchingRow);
      var result = matchingRow.split(" - ")[2];
      this.cache[cacheIdString] = result;
      return result;
    }
    catch (e) {
      Logger.warn(e);
      this.cache[cacheIdString] = ort;
      return ort;
    }
  }
}
