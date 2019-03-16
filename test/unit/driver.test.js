const chai = require('chai');
const dirtyChai = require('dirty-chai');

const {expect} = chai;
chai.use(dirtyChai);
chai.use(require('chai-string'));

const {Driver} = require('../../driver');

describe('Basic sanity checks on the driver', () => {
  it('Testing UA string', (done) => {
    expect(Driver.getGlobalUserAgentString()).to.startsWith('Mozilla/5.0 (Windows NT 10.0');
    done();
  });
});
