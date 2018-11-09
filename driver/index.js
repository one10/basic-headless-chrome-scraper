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

async function run(siteClass) {
  const driver = new Driver(!_.isNil(inputData) && !_.isNil(inputData.terms) ? inputData.terms : TEST_TERMS.terms);
  await driver.run(siteClass);
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
      headless: true,
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

  async run(siteClass) {
    await this.initBrowser();
    const site = new siteClass(this);
    await site.initSite(); // only use one tab for all searches, otherwise it breeds tons of processes
    const result = await site.getSuccessfulSearchTerms(this.terms);
    logger.info(JSON.stringify(result, null, 2));

    await this.closeBrowser();
  }
}

/**
 * @classdesc Abstract class that represents a site being scraped. Contains selectors and base mechanics for site nav.
 *
 * @name Site
 * @class
 */
class Site {
  constructor(driver) {
    if (new.target === Site) {
      throw new TypeError("Cannot construct abstract Site instances directly");
    }
    this.driver = driver;
  }

  getStartUrl() {
    if (this) throw new TypeError("Not implemented");
  };

  getSearchInputSelector() {
    if (this) throw new TypeError("Not implemented");
  };

  getSearchSubmitSelector() {
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

  getSleepDurationMin() {
    if (this) return settings.sleepDurationMin;
  };

  getSleepDurationMax() {
    if (this) return settings.sleepDurationMax;
  };


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
    const realValue = await this.browserTabPage.$eval(this.getSearchResultsSelector(), el => el.innerText);
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
  }

  async ['doSearch'](term) {
    await this.browserTabPage.waitForSelector(this.getSearchInputSelector());
    await this.browserTabPage.waitFor(this.getHumanDelay());
    await this.browserTabPage.focus(this.getSearchInputSelector());
    await this.browserTabPage.waitFor(this.getHumanDelay());
    await this.browserTabPage.keyboard.type(term);
    await this.browserTabPage.waitFor(this.getHumanDelay());
    await this.browserTabPage.$eval(this.getSearchSubmitSelector(), form => form.submit(), {"waitUntil": "networkidle0"});
    await this.browserTabPage.waitForSelector(this.getSearchResultsSelector(), {"waitUntil": "networkidle0"});
  }

  async ['afterSearch'](term) {
  }

  async checkForTerm(term) {
    await this.browserTabPage.goto(this.getStartUrl());
    await this['beforeSearch'](term);
    await this['doSearch'](term);
    logger.debug(`Used the following UA string: ${await this.browserTabPage.evaluate('navigator.userAgent')}`);
    await this['afterSearch'](term);
    return await this.isSearchSucessful();
  }

  async initSite() {
    this.browserTabPage = await this.driver.getBrowser().newPage();
    await this.browserTabPage.setUserAgent(Driver.getGlobalUserAgentString());
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
      const sleepTime =
        Math.random() * (this.getSleepDurationMax() - this.getSleepDurationMin()) + this.getSleepDurationMin();
      logger.info(`${term}: ${found}`);
      logger.debug(`Sleeping for ${sleepTime} ms`);
      await sleep(sleepTime);
    }
    return results;
  }
}

exports.Site = Site;


/**
 * @classdesc Note: Wikipedia is only an example here. It's pointless to try to scrape it, all the data is downloadable!
 *
 * @name WikipediaSearch
 * @class
 */
class WikipediaSearch extends Site {
  constructor(driver) {
    super(driver);
  }

  async ['beforeSearch'](term) {
  }

  getStartUrl() {
    return "https://en.wikipedia.org/wiki/Main_Page";
  }

  getSearchInputSelector() {
    return '#searchInput';
  };

  getSearchSubmitSelector() {
    return '#searchform';
  };

  getSearchResultsSelector() {
    return '#mw-content-text p';
  };

  getSearchResultsFoundRegexp() {
    // loose: anything will work for this this.browserTabPage, as long as getSearchResultsNotFoundRegexp didn't match
    return /.*/;
  };

  getSearchResultsNotFoundRegexp() {
    return /The page ".*" does not exist. You can ask for it to be created./;
  };
}

exports.WikipediaSearch = WikipediaSearch;