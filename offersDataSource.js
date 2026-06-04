export class OffersDataSource {
  static initialized = false;
  static defaultOffers = [];
  static extendedOffers = [];
  static subscribers = [];

  static init() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.injectFetchInterceptor();
    this.listenMessages();
  }

  static getOffers(filters = {}) {
    const { includeExtended = true } = filters;

    if (includeExtended) {
      return [...this.defaultOffers, ...this.extendedOffers];
    }

    return this.defaultOffers;
  }

  static setOffers({ offers, queryStrategy }) {
    if (queryStrategy === null) {
      this.defaultOffers = offers;
    } else {
      this.extendedOffers = offers;
    }
    this.notify();
  }

  static listenMessages() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return;
      }

      if (event.data?.type !== 'CURRENT_OFFERS') {
        return;
      }

      this.setOffers(event.data.payload);
    });
  }

  static subscribe(callback, getFilters = () => ({})) {
    const subscriber = {
      callback,
      getFilters,
    };

    this.subscribers.push(subscriber);

    callback(this.getOffers(getFilters()));

    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== subscriber);
    };
  }

  static notify() {
    this.subscribers.forEach(({ callback, getFilters }) => {
      callback(this.getOffers(getFilters()));
    });
  }

  static injectFetchInterceptor() {
    this.injectPageScript(() => {
      const INTERCEPTOR_INSTALLED_KEY = '__olxMapFetchInterceptorInstalled';
      const CURRENT_OFFERS_MESSAGE = 'CURRENT_OFFERS';
      const GRAPHQL_ENDPOINT = '/apigateway/graphql';
      const LISTING_SEARCH_QUERY = 'ListingSearchQuery';

      if (window[INTERCEPTOR_INSTALLED_KEY]) {
        return;
      }

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
    });
  }

  static injectPageScript(fn) {
    const script = document.createElement('script');
    script.textContent = `(${fn})();`;
    document.documentElement.appendChild(script);
    script.remove();
  }
}
