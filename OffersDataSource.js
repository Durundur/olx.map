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
    const { includeExtended = false, enhanceMarkerLocations = false } = filters;

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
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page-script.js');
    script.async = false;

    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }
}
