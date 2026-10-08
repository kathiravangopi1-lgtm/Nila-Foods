const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getCities,
  getCountries,
  getIndianPincode,
  getStates,
} = require('../controllers/location_controller');

const invoke = (handler, query = {}, params = {}) => new Promise((resolve) => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      resolve({ statusCode: this.statusCode, body });
      return this;
    },
  };

  handler({ query, params }, response);
});

test('country lookup filters by a case-insensitive search', async () => {
  const response = await invoke(getCountries, { search: 'indi' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data[0].name, 'India');
});

test('state lookup is scoped to the selected country', async () => {
  const response = await invoke(getStates, { country: 'India', search: 'tamil' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data, [{ name: 'Tamil Nadu', code: 'TN' }]);
});

test('city lookup returns searched cities and requires two search characters', async () => {
  const results = await invoke(getCities, {
    country: 'India',
    state: 'Tamil Nadu',
    search: 'chen',
  });
  const shortSearch = await invoke(getCities, {
    country: 'India',
    state: 'Tamil Nadu',
    search: 'c',
  });

  assert.equal(results.statusCode, 200);
  assert.ok(results.body.data.some((city) => city.name === 'Chennai'));
  assert.equal(shortSearch.statusCode, 200);
  assert.deepEqual(shortSearch.body.data, []);
});

test('city lookup can search a country when no state is selected', async () => {
  const response = await invoke(getCities, { country: 'India', search: 'chennai' });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.data.some((city) => city.name === 'Chennai'));
});

test('Indian PIN-code lookup validates the PIN and returns the postal district and state', async () => {
  const invalid = await invoke(getIndianPincode, {}, { pincode: '123' });
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => [{
      Status: 'Success',
      PostOffice: [{
        Pincode: '600001',
        Country: 'India',
        District: 'Chennai',
        State: 'Tamil Nadu',
      }],
    }],
  });

  try {
    const valid = await invoke(getIndianPincode, {}, { pincode: '600001' });
    assert.equal(invalid.statusCode, 400);
    assert.equal(valid.statusCode, 200);
    assert.deepEqual(valid.body.data, {
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
    });
  } finally {
    global.fetch = originalFetch;
  }
});
