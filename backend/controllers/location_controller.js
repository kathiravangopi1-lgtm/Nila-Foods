const { City, Country, State } = require('country-state-city');

const MAX_RESULTS = 50;
const MAX_SEARCH_LENGTH = 80;

const readTextQuery = (req, name) => {
  const value = req.query[name];
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.trim().length > MAX_SEARCH_LENGTH) return null;
  return value.trim();
};

const findCountry = (name) => Country.getAllCountries().find(
  (country) => country.name.toLowerCase() === name.toLowerCase(),
);

const findState = (countryCode, name) => State.getStatesOfCountry(countryCode).find(
  (state) => state.name.toLowerCase() === name.toLowerCase(),
);

const compareSearchMatch = (search) => (left, right) => {
  const normalizedSearch = search.toLowerCase();
  const leftStartsWith = left.name.toLowerCase().startsWith(normalizedSearch);
  const rightStartsWith = right.name.toLowerCase().startsWith(normalizedSearch);
  return Number(rightStartsWith) - Number(leftStartsWith) || left.name.localeCompare(right.name);
};

const getCountries = (req, res) => {
  const search = readTextQuery(req, 'search');
  if (search === null) {
    return res.status(400).json({ error: 'Search must be a string no longer than 80 characters.' });
  }

  const normalizedSearch = search.toLowerCase();
  const data = Country.getAllCountries()
    .filter((country) => country.name.toLowerCase().includes(normalizedSearch))
    .sort(compareSearchMatch(search))
    .map((country) => ({ name: country.name, code: country.isoCode }));

  return res.status(200).json({ data });
};

const getStates = (req, res) => {
  const countryName = readTextQuery(req, 'country');
  const search = readTextQuery(req, 'search');
  if (countryName === null || search === null) {
    return res.status(400).json({ error: 'Country and search must be strings no longer than 80 characters.' });
  }
  if (!countryName) {
    return res.status(400).json({ error: 'A country is required to search states.' });
  }

  const country = findCountry(countryName);
  if (!country) return res.status(400).json({ error: 'The selected country is not recognized.' });

  const normalizedSearch = search.toLowerCase();
  const data = State.getStatesOfCountry(country.isoCode)
    .filter((state) => state.name.toLowerCase().includes(normalizedSearch))
    .sort(compareSearchMatch(search))
    .map((state) => ({ name: state.name, code: state.isoCode }));

  return res.status(200).json({ data });
};

const getCities = (req, res) => {
  const countryName = readTextQuery(req, 'country');
  const stateName = readTextQuery(req, 'state');
  const search = readTextQuery(req, 'search');
  if (countryName === null || stateName === null || search === null) {
    return res.status(400).json({ error: 'Country, state, and search must be strings no longer than 80 characters.' });
  }
  if (!countryName) {
    return res.status(400).json({ error: 'A country is required to search cities.' });
  }

  const country = findCountry(countryName);
  if (!country) return res.status(400).json({ error: 'The selected country is not recognized.' });

  const state = stateName ? findState(country.isoCode, stateName) : null;
  if (stateName && !state) {
    return res.status(400).json({ error: 'The selected state is not recognized for this country.' });
  }

  if (search.length < 2) return res.status(200).json({ data: [] });

  const normalizedSearch = search.toLowerCase();
  const availableCities = state
    ? City.getCitiesOfState(country.isoCode, state.isoCode)
    : City.getCitiesOfCountry(country.isoCode) || [];
  const matchingCities = availableCities
    .filter((city) => city.name.toLowerCase().includes(normalizedSearch))
    .sort((left, right) => {
      const leftStartsWith = left.name.toLowerCase().startsWith(normalizedSearch);
      const rightStartsWith = right.name.toLowerCase().startsWith(normalizedSearch);
      return Number(rightStartsWith) - Number(leftStartsWith) || left.name.localeCompare(right.name);
    });
  const seen = new Set();
  const data = matchingCities.reduce((results, city) => {
    const key = city.name.toLowerCase();
    if (!seen.has(key) && results.length < MAX_RESULTS) {
      seen.add(key);
      results.push({ name: city.name });
    }
    return results;
  }, []);

  return res.status(200).json({ data });
};

const getIndianPincode = async (req, res, next) => {
  const { pincode } = req.params;
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: 'PIN code must contain exactly 6 digits.' });
  }

  let response;
  try {
    response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(502).json({ error: 'The India Post PIN-code lookup timed out. Please try again.' });
    }
    return next(error);
  }

  if (!response.ok) {
    return res.status(502).json({ error: 'The India Post PIN-code lookup is temporarily unavailable.' });
  }

  let results;
  try {
    results = await response.json();
  } catch {
    return res.status(502).json({ error: 'The India Post PIN-code lookup returned an invalid response.' });
  }

  const postOffices = results?.[0]?.Status === 'Success' ? results[0].PostOffice : null;
  const location = postOffices?.find(
    (office) => String(office.Pincode) === pincode
      && office.Country === 'India'
      && office.State
      && (office.District || office.Block),
  );
  if (!location) {
    return res.status(404).json({ error: 'No Indian delivery area was found for this PIN code.' });
  }

  return res.status(200).json({
    data: {
      city: location.District || location.Block,
      state: location.State,
      country: 'India',
    },
  });
};

module.exports = { getCities, getCountries, getIndianPincode, getStates };
