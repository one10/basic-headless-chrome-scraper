const {Site} = require('./index');

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
    // loose: anything will work for this page, as long as getSearchResultsNotFoundRegexp didn't match
    return /.*/;
  };

  getSearchResultsNotFoundRegexp() {
    return /The page ".*" does not exist. You can ask for it to be created./;
  };
}

exports.WikipediaSearch = WikipediaSearch;
