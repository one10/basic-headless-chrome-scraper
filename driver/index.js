'use strict';

const puppeteer = require('puppeteer');
const winston = require('winston');
const _ = require('lodash');
const inputData = require("../data/data.json");

const logger = winston.createLogger({
  level: 'info',
});

logger.add(new winston.transports.Console({
  format: winston.format.simple()
}));

const settings = {
  sleepDurationMin: 500, // milliseconds
  sleepDurationMax: 1000, // milliseconds
};

const TEST_TERMS = {
  terms: [
    {
      term: "test",
      comment: "probably will find this"
    },
    {
      term: "ad1e173036d90f78b94213e21cb4109d",
      state: "probably will not find this"
    }
  ]
};

async function run() {
  const driver = new Driver(!_.isNil(inputData) && !_.isNil(inputData.terms) ? inputData.terms : TEST_TERMS.terms);
  await driver.run();
  logger.info('*** done');
}

exports.run = run;

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

class Driver {

  async initBrowser() {
    this.browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    logger.info('launched the browser');
  }

  getBrowser() {
    return this.browser;
  }

  static getGlobalUserAgentString() {
    return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/70.0.3163.100 Safari/537.36";
  }

  async closeBrowser() {
    await this.browser.close();
  }

  constructor(terms) {
    this.terms = terms;
  }

  async run() {
    await this.initBrowser();
    const page = new WikipediaSearchPage(this);
    const result = await page.getSuccessfulSearchTerms(this.terms);
    logger.info(JSON.stringify(result, null, 2));

    await this.closeBrowser();
  }
}

class Page {
  constructor(driver) {
    this.driver = driver;
  }

  getStartUrl() {
    if (this) throw new TypeError("Not implemented");
  };

  getSearchResultsSelector() {
    if (this) throw new TypeError("Not implemented");
  };

  getSearchResultsFoundRegexp() {
    if (this) throw new TypeError("Not implemented");
  };

  getSearchResultsNotFoundRegexp() {
    if (this) throw new TypeError("Not implemented");
  };

  async isSearchSucessful(page) {
    const realValue = await page.$eval(this.getSearchResultsSelector(), el => el.innerText);
    const searchResultsFound = realValue.match(this.getSearchResultsFoundRegexp());
    const searchResultsNotFound = realValue.match(this.getSearchResultsNotFoundRegexp());
    return searchResultsFound && !searchResultsNotFound;
  }

  async checkForTerm(term) {
    const page = await this.driver.getBrowser().newPage();
    await page.setUserAgent(Driver.getGlobalUserAgentString());
    await page.goto(this.getStartUrl());
    await page.focus('#searchInput');
    await page.keyboard.type(term);
    await page.$eval('#searchform', form => form.submit());
    await page.waitForSelector('#mw-content-text p');
    logger.debug(`Using the following UA string: ${await page.evaluate('navigator.userAgent')}`);
    return await this.isSearchSucessful(page);
  }

  async getSuccessfulSearchTerms(terms) {
    const results = [];
    for (const {term} of terms) {
      logger.debug(`doing checkForTerm: '${term}'`);
      const result = {};
      const found = await this.checkForTerm(term);
      result[`${term}`] = found;
      await results.push(result);
      logger.debug(`done with checkForTerm: '${term}'`);
      const sleepTime = Math.random() * (settings.sleepDurationMax - settings.sleepDurationMin) + settings.sleepDurationMin;
      logger.info(`${term}: ${found}`);
      logger.debug(`Sleeping for ${sleepTime} ms`);
      await sleep(sleepTime);
    }
    return results;
  }
}

class WikipediaSearchPage extends Page {
  constructor(driver) {
    super(driver);
  }

  getStartUrl() {
    return "https://en.wikipedia.org/wiki/Main_Page";
  }

  getSearchResultsSelector() {
    return '#mw-content-text p';
  };

  getSearchResultsFoundRegexp() {
    // loose: anything will work for this page, as long as getSearchResultsNotFoundRegexp didn't match
    return /.*/;
  };

  getSearchResultsNotFoundRegexp() {
    return /The page ".*" does not exist. You can ask for it to be created./;
  };
}