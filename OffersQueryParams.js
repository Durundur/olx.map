export class OffersQueryParams {
  static urlOrderParam = 'search[order]';

  static refreshQueryOrderParam() {
    const url = new URL(window.location.href);
    const originalOrder = url.searchParams.get(this.urlOrderParam) ?? 'relevance:desc';
    const orders = ['relevance:desc', 'created_at:desc', 'filter_float_price:asc', 'filter_float_price:desc'];

    const temporaryOrder = orders.find((o) => o !== originalOrder) ?? orders[0];
    const tempUrl = new URL(url);
    tempUrl.searchParams.set(this.urlOrderParam, temporaryOrder);

    this.replaceUrl(tempUrl);
    url.searchParams.set(this.urlOrderParam, originalOrder);
    this.replaceUrl(url);
  }

  static replaceUrl(nextUrl) {
    history.replaceState(history.state, '', nextUrl.toString());
    window.dispatchEvent(
      new PopStateEvent('popstate', {
        state: history.state,
      }),
    );
  }
}
