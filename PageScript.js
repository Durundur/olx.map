const INTERCEPTOR_INSTALLED_KEY = '__olxMapFetchInterceptorInstalled';
const CURRENT_OFFERS_MESSAGE = 'CURRENT_OFFERS';
const GRAPHQL_ENDPOINT = '/apigateway/graphql';
const LISTING_SEARCH_QUERY = 'ListingSearchQuery';

if (!window[INTERCEPTOR_INSTALLED_KEY]) {
  window[INTERCEPTOR_INSTALLED_KEY] = true;

  const getRequestUrl = (input) => {
    if (typeof input === 'string') {
      return input;
    }

    return input?.url ?? '';
  };

  const parseRequestBody = (options) => {
    try {
      return JSON.parse(options?.body || '{}');
    } catch {
      return null;
    }
  };

  const isOfferQuery = (input, body) => {
    const url = getRequestUrl(input);

    if (!url.includes(GRAPHQL_ENDPOINT)) {
      return false;
    }

    return body?.query?.includes(LISTING_SEARCH_QUERY) ?? false;
  };

  const getQueryStrategy = (body) => {
    const searchParameters = body?.variables?.searchParameters || [];
    const strategyParam = searchParameters.find((p) => p.key === 'strategy');
    return strategyParam?.value ?? null;
  };

  const mapOffer = (offer) => {
    const priceParam = offer.params.find((p) => p.key === 'price');

    return {
      id: offer.id,
      title: offer.title,
      description: offer.description,
      location: offer.map,
      price: {
        label: priceParam?.value?.label,
        value: priceParam?.value?.value,
        currency: priceParam?.value?.currency,
      },
      photos: offer.photos,
      url: offer.url,
    };
  };

  const getOffersFromResponse = (responseBody) => {
    return responseBody?.data?.clientCompatibleListings?.data?.map(mapOffer) || [];
  };

  const postOffers = (offers, requestBody) => {
    window.postMessage({
      type: CURRENT_OFFERS_MESSAGE,
      payload: {
        offers,
        queryStrategy: getQueryStrategy(requestBody),
      },
    });
  };

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const [url, options] = args;
    const requestBody = parseRequestBody(options);

    const response = await originalFetch(...args);
    if (!isOfferQuery(url, requestBody)) {
      return response;
    }

    const clonedResponse = response.clone();
    try {
      const responseBody = await clonedResponse.json();
      postOffers(getOffersFromResponse(responseBody), requestBody);
      return response;
    } catch (e) {
      console.error('Failed to parse response:', e);
      return response;
    }
  };
}
