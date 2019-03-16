const puppeteer = require('puppeteer');
const winston = require('winston');
const _ = require('lodash');
const inputData = require('../data/data.json');

const logger = winston.createLogger({
  level: 'info',
});

logger.add(new winston.transports.Console({
  format: winston.format.simple(),
  prettyPrint: true,
  handleExceptions: true,
  exitOnError: false,
}));

const settings = {
  sleepDurationMin: 500, // milliseconds
  sleepDurationMax: 1000, // milliseconds
};

const TEST_TERMS = {
  terms: [
    {
      term: 'test',
      comment: 'probably will find this',
    },
    {
      term: 'ad1e173036d90f78b94213e21cb4109d',
      state: 'probably will not find this',
    },
  ],
};

async function run(siteClass) {
  const driver = new Driver(!_.isNil(inputData) && !_.isNil(inputData.terms) ? inputData.terms : TEST_TERMS.terms);
  await driver.run(siteClass);
  logger.info('*** done');
}

exports.run = run;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class Driver {
  async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
    logger.info('launched the browser');
  }

  getBrowser() {
    return this.browser;
  }

  static getGlobalUserAgentString() {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      + 'Chrome/70.0.3163.100 Safari/537.36';
  }

  async closeBrowser() {
    await this.browser.close();
  }

  constructor(terms) {
    this.terms = terms;
  }

  async run(siteClass) {
    await this.initBrowser();
    const site = new siteClass(this);
    await site.initSite(); // only use one tab for all searches, otherwise it breeds tons of processes
    const result = await site.getSuccessfulSearchTerms(this.terms);
    logger.info(JSON.stringify(result, null, 2));

    await this.closeBrowser();
  }
}

exports.Driver = Driver;

/**
 * @classdesc Abstract class that represents a site being scraped. Contains selectors and base mechanics for site nav.
 *
 * @name Site
 * @class
 */
class Site {
  constructor(driver) {
    if (new.target === Site) {
      throw new TypeError('Cannot construct abstract Site instances directly');
    }
    this.driver = driver;
  }

  getStartUrl() {
    throw new TypeError(`Not implemented for ${this.constructor.name}`);
  }

  getSearchInputSelector() {
    throw new TypeError(`Not implemented for ${this.constructor.name}`);
  }

  getSearchSubmitSelector() {
    throw new TypeError(`Not implemented for ${this.constructor.name}`);
  }

  getSearchResultsSelector() {
    throw new TypeError(`Not implemented for ${this.constructor.name}`);
  }

  getSearchResultsFoundRegexp() {
    throw new TypeError(`Not implemented for ${this.constructor.name}`);
  }

  getSearchResultsNotFoundRegexp() {
    throw new TypeError(`Not implemented for ${this.constructor.name}`);
  }

  getSleepDurationMin() {
    if (this) return settings.sleepDurationMin;
  }

  getSleepDurationMax() {
    if (this) return settings.sleepDurationMax;
  }


  /**
   * As you browse, inject a human-looking delay between operations on elements.
   *
   * @method
   * @name Site#getHumanDelay
   */
  getHumanDelay() {
    // TODO(one10): should be randomized
    if (this) return 500;
  }

  async isSearchSucessful() {
    const realValue = await this.browserTabPage.$eval(this.getSearchResultsSelector(), (el) => el.innerText);
    const searchResultsFound = !_.isNil(realValue.match(this.getSearchResultsFoundRegexp()));
    const searchResultsNotFound = !_.isNil(realValue.match(this.getSearchResultsNotFoundRegexp()));
    return searchResultsFound && !searchResultsNotFound;
  }

  /**
   * This method performs any custom steps to prepare for searching a website.
   *
   * Implemented using a 'symbol' to mark it private.
   *
   * @method
   * @name Site#['beforeSearch']
   * @param term {string} search term strin.
   */
  async ['beforeSearch'](term) {
    logger.debug(`entered ${this.constructor.name}.beforeSearch`);
  }

  async ['doSearch'](term) {
    await this.browserTabPage.waitForSelector(this.getSearchInputSelector());
    await this.browserTabPage.waitFor(this.getHumanDelay());
    await this.browserTabPage.focus(this.getSearchInputSelector());
    await this.browserTabPage.waitFor(this.getHumanDelay());
    await this.browserTabPage.keyboard.type(term);
    await this.browserTabPage.waitFor(this.getHumanDelay());
    await this.browserTabPage.$eval(this.getSearchSubmitSelector(), (form) => form.submit(), {waitUntil: 'networkidle0'});
    await this.browserTabPage.waitForSelector(this.getSearchResultsSelector(), {waitUntil: 'networkidle0'});
  }

  async ['afterSearch'](term) {
    logger.debug(`entered ${this.constructor.name}.afterSearch`);
  }

  async checkForTerm(term) {
    await this.browserTabPage.goto(this.getStartUrl());
    await this.beforeSearch(term);
    await this.doSearch(term);
    logger.debug(`Used the following UA string: ${await this.browserTabPage.evaluate('navigator.userAgent')}`);
    await this.afterSearch(term);
    const result = await this.isSearchSucessful();
    return result;
  }

  async initSite() {
    this.browserTabPage = await this.driver.getBrowser()
      .newPage();
    await this.browserTabPage.setUserAgent(Driver.getGlobalUserAgentString());
  }

  async getSuccessfulSearchTerms(terms) {
    const results = [];
    for (const {term} of terms) { // eslint-disable-line no-restricted-syntax
      logger.debug(`doing checkForTerm: '${term}'`);

      let found = null;

      let attempts = 0;
      while (true) { // eslint-disable-line no-constant-condition
        try {
          found = await this.checkForTerm(term); // eslint-disable-line no-await-in-loop
          break;
        } catch (error) {
          if (attempts === 3) {
            attempts += 1;
            logger.error(`Tried scraping term ${term} several times, got an error, marking it null and moving on`);
            logger.error(error.stack);
            break;
          }
        }
      }

      await results.push({ // eslint-disable-line no-await-in-loop
        term,
        found,
      });
      logger.debug(`done with checkForTerm: '${term}'`);
      const sleepTime = Math.random() * (this.getSleepDurationMax() - this.getSleepDurationMin()) + this.getSleepDurationMin();
      logger.info(`${term}: ${found}`);
      logger.debug(`Sleeping for ${sleepTime} ms`);
      await sleep(sleepTime); // eslint-disable-line no-await-in-loop
    }
    return results;
  }
}

exports.Site = Site;
