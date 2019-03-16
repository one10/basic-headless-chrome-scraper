# basic-headless-chrome-scraper

Why? Because Puppeteer is cool. Also, helps working with data from various websites, collected in a human-looking way. 

Note: Wikipedia is only an example here. It's pointless to try to scrape it, all the data is downloadable!

Tip: set headless: true in the Driver class to see what's going on in the browser.

Note: Uses only one tab to serially to run the searches to avoid spinning up tons of processes.

# Usage

* `npm install`
* `npm run unit-test` - runs the unit tests using Mocha
* `npm run unit-coverage` - runs unit test coverage using Jest and prints a nice table with all kinds of unit test coverage stats, e.g. "% Stmts 13.64" 
* `npm run integration-coverage` - runs integration test coverage using Jest and prints a nice table with all kinds of integration test coverage stats, e.g. "% Stmts 22.55" 
* `npm run start` - scrapes first the article on "test" in the Wikipedia, then scrapes a non-existent term as an example
* `npm run lint` - runs ESLint using the Stripe ruleset with a couple of exceptions (you can go ahead and fix them if you feel like it)
