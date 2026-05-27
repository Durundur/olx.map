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
		}
		this.notify();
	}

	static listenMessages() {
		window.addEventListener("message", (event) => {
			if (event.source !== window) {
				return;
			}

			if (event.data?.type !== "CURRENT_OFFERS") {
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
	}

	static notify() {
		this.subscribers.forEach((callback) => {
			callback(this.getOffers());
		});
	}

	static injectFetchInterceptor() {
		const inject = (fn) => {
			const script = document.createElement("script");
			script.textContent = `(${fn})();`;
			document.documentElement.appendChild(script);
			script.remove();
		};

		inject(() => {
			const isOfferQuery = (url, options) => {
				if (!url.includes("/apigateway/graphql")) {
					return false;
				}
				try {
					const bodyObj = JSON.parse(options?.body || "{}");
					return bodyObj?.query?.includes("ListingSearchQuery");
				} catch {
					return false;
				}
			};

			const isExtendedQuery = (options) => {
				try {
					const bodyObj = JSON.parse(options?.body || "{}");
					const searchParameters = bodyObj?.variables?.searchParameters || [];
					const extendedParam = searchParameters.find((p) => p.key === "strategy");
					return extendedParam?.value === "extended_distance";
				} catch {
					return false;
				}
			};

			const originalFetch = window.fetch;

			window.fetch = async (...args) => {
				const [url, options] = args;

				const response = await originalFetch(...args);
				if (!isOfferQuery(url, options)) {
					return response;
				}

				const clonedResponse = response.clone();
				try {
					const res = await clonedResponse.json();
					const offersToStore = res?.data?.clientCompatibleListings?.data?.map((offer) => {
						const priceParam = offer.params.find((p) => p.key === "price");
						return {
							id: offer.id,
							title: offer.title,
							location: offer.map,
							price: {
								label: priceParam.value.label,
								value: priceParam.value.value,
								currency: priceParam.value.currency,
							},
							photos: offer.photos,
							url: offer.url,
						};
					});
					window.postMessage({ type: "CURRENT_OFFERS", payload: { offers: offersToStore, isExtendedQuery: isExtendedQuery(options) } });
					return response;
				} catch (e) {
					console.error("Failed to parse response:", e);
					return response;
				}
			};
		});
	}
}
