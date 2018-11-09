const driver = require('./driver');
const {WikipediaSearch} = require('./driver/wikipediaSearch');

// Note: Wikipedia is only an example here. It's pointless to try to scrape it, all the data is downloadable!
driver.run(WikipediaSearch);
