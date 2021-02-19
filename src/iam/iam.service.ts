import { HttpService, Injectable } from '@nestjs/common';
// import {  } from 'cheerio';
const cheerio = require('cheerio');

@Injectable()
export class IamService {
  constructor(private http: HttpService) { }

  async getGemeindeFromOrtAndPLZ(ort: string, plz: string): Promise<string> {
    try {
      var reqBody = "Eingabe=" + plz + "&Was=Plz&B1=Suchen";
      var page = (await this.http.post<string>('http://iam.at/austria/read.asp', reqBody).toPromise()).data;

      var $ = cheerio.load(page);
      var entriesRaw: cheerio.Cheerio = $("tr:nth-child(2) td:nth-child(2)");
      // console.log(entriesRaw.text());
      var newLineSplitted = entriesRaw.text().split("\n").slice(6);
      var valueRows = newLineSplitted.slice(0, newLineSplitted.length - 3);
      // console.log(valueRows.length + ": " + valueRows);
      var matchingRow = valueRows.find(s => s.startsWith(plz + " - " + ort))
      var result = matchingRow.split(" - ")[2];
      return result;
    }
    catch (e) {
      console.error(e);
      return "";
    }
  }
}
