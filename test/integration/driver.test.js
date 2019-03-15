/* global jest */

const chai = require('chai');
const dirtyChai = require('dirty-chai');

chai.use(dirtyChai);
chai.use(require('chai-string'));
const winston = require('winston');

const {Driver} = require('../../driver');
const wikipediaSearch = require('../../driver/wikipediaSearch.js');

const logger = winston.createLogger({
  level: 'info',
});

logger.add(new winston.transports.Console({
  format: winston.format.simple(),
  prettyPrint: true,
  handleExceptions: true,
  exitOnError: false,
}));

jest.setTimeout(100000);

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

describe('Basic sanity checks on the driver', () => {

  it('Testing UA string', async(done) => {
    const driver = new Driver(TEST_TERMS.terms);

    await driver.initBrowser();
    const site = new wikipediaSearch.WikipediaSearch(driver);
    await site.initSite(); // only use one tab for all searches, otherwise it breeds tons of processes
    await driver.closeBrowser();

    // TODO: run search, add assertions on results here

    done();
  });
});
