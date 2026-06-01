export class OffersDataSource {
  static initialized = false;
  static baseOffers = [];
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

  static getOffers() {
    return [...this.baseOffers, ...this.extendedOffers];
  }

  static setOffers({ offers, isExtendedQuery }) {
    if (isExtendedQuery === true) {
      this.extendedOffers = offers;
    } else {
      this.baseOffers = offers;
      this.extendedOffers = [];
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

  static subscribe(callback) {
    this.subscribers.push(callback);

    if (this.getOffers().length) {
      callback(this.getOffers());
    }

    return () => {
      this.subscribers = this.subscribers.filter((subscriber) => subscriber !== callback);
    };
  }

  static notify() {
    this.subscribers.forEach((callback) => {
      callback(this.getOffers());
    });
  }

  static injectFetchInterceptor() {
    this.injectPageScript(() => {
      const INTERCEPTOR_INSTALLED_KEY = '__olxMapFetchInterceptorInstalled';
      const CURRENT_OFFERS_MESSAGE = 'CURRENT_OFFERS';
      const GRAPHQL_ENDPOINT = '/apigateway/graphql';
      const LISTING_SEARCH_QUERY = 'ListingSearchQuery';
      const EXTENDED_DISTANCE_STRATEGY = 'extended_distance';

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

      const isExtendedQuery = (body) => {
        const searchParameters = body?.variables?.searchParameters || [];
        const extendedParam = searchParameters.find((p) => p.key === 'strategy');
        return extendedParam?.value === EXTENDED_DISTANCE_STRATEGY;
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
            isExtendedQuery: isExtendedQuery(requestBody),
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
