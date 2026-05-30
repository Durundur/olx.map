import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { OFFERS_LIST_SELECTOR } from './consts.js';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export class MapManager {
  static instance = null;
  map = null;
  markersLayer = null;

  static getInstance() {
    if (!MapManager.instance) {
      MapManager.instance = new MapManager();
    }

    return MapManager.instance;
  }

  init(containerId) {
    if (this.map) {
      return this.map;
    }

    this.map = L.map(containerId).setView([52.087, 19.371], 7);
    const streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    );
    streetLayer.addTo(this.map);
    L.control.layers({ Street: streetLayer, Satellite: satelliteLayer }).addTo(this.map);

    requestAnimationFrame(() => {
      this.map.invalidateSize();
    });

    return this.map;
  }

  destroy() {
    if (!this.map) {
      return;
    }

    this.map.remove();
    this.map = null;
  }

  renderOffers(offers) {
    if (!this.map) {
      return;
    }

    if (!this.markersLayer) {
      this.markersLayer = L.layerGroup().addTo(this.map);
    }

    this.markersLayer.clearLayers();

    const grouped = this.groupOffersByLocation(offers);
    const bounds = L.latLngBounds();

    for (const [key, group] of grouped.entries()) {
      const [lat, lng] = key.split(',').map(Number);
      const marker = this.createOfferMarker(lat, lng, group);
      marker.addTo(this.markersLayer);
      bounds.extend([lat, lng]);
    }

    this.fitMapToBounds(bounds);
  }

  groupOffersByLocation(offers) {
    const grouped = new Map();

    for (const offer of offers) {
      const lat = Number(offer.location?.lat);
      const lng = Number(offer.location?.lon);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        continue;
      }

      const key = `${lat},${lng}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key).push(offer);
    }

    return grouped;
  }

  createOfferMarker(lat, lng, offers) {
    const marker = L.marker([lat, lng]);
    const popupState = { currentIndex: 0 };

    marker.bindPopup('', {
      maxWidth: 260,
      className: 'olx-offer-popup',
    });

    marker.on('popupopen', () => {
      this.updatePopup(marker, offers, popupState);
    });

    return marker;
  }

  focusOfferElementInList(offerId) {
    const focusClass = 'olx-map-offer-focussed';

    const offerLists = document.querySelectorAll(OFFERS_LIST_SELECTOR);
    if (!offerLists) {
      return;
    }

    for (const list of offerLists) {
      const element = list.querySelector(`[id="${offerId}"]`);
      if (!element) {
        continue;
      }

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      var focussedElement = document.querySelector(`.${focusClass}`);
      if (focussedElement) {
        focussedElement.classList.remove(focusClass);
      }

      element.classList.add(focusClass);
    }
  }

  updatePopup(marker, offers, popupState) {
    const moveToOffer = (direction) => {
      popupState.currentIndex =
        (popupState.currentIndex + direction + offers.length) % offers.length;
      this.updatePopup(marker, offers, popupState);
    };

    const offer = offers[popupState.currentIndex];

    this.focusOfferElementInList(offer.id);

    marker.setPopupContent(
      this.getPopupContent({
        offer,
        currentIndex: popupState.currentIndex,
        totalOffers: offers.length,
        onPrevious: () => moveToOffer(-1),
        onNext: () => moveToOffer(1),
      }),
    );
  }

  getPopupContent({ offer, currentIndex, totalOffers, onPrevious, onNext }) {
    const image = offer.photos?.[0]?.link ?? 'https://placehold.co/240x180/png?text=Brak+zdjęcia';
    const container = document.createElement('div');
    container.className = 'olx-map-popup';

    const imageElement = document.createElement('img');
    imageElement.src = image;
    imageElement.className = 'olx-map-popup__image';

    const details = document.createElement('div');
    details.className = 'olx-map-popup__details';

    const title = document.createElement('div');
    title.textContent = offer.title ?? '';
    title.className = 'olx-map-popup__title';

    const price = document.createElement('div');
    price.textContent = offer.price?.label ?? '';
    price.className = 'olx-map-popup__price';

    details.append(title, price);

    if (totalOffers <= 1) {
      container.append(imageElement, details);
      return container;
    }

    const navigation = document.createElement('div');
    navigation.className = 'olx-map-popup__navigation';

    const previousButton = this.createPopupNavigationButton('<', onPrevious);
    const nextButton = this.createPopupNavigationButton('>', onNext);

    const counter = document.createElement('div');
    counter.textContent = `${currentIndex + 1} / ${totalOffers}`;
    counter.className = 'olx-map-popup__counter';

    navigation.append(previousButton, counter, nextButton);
    container.append(imageElement, details, navigation);

    return container;
  }

  createPopupNavigationButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = 'olx-map-popup__navigation-button';

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });

    return button;
  }

  fitMapToBounds(bounds) {
    if (!bounds.isValid()) {
      return;
    }

    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
      this.map.setView(bounds.getCenter(), 12);
      return;
    }

    this.map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 13,
    });
  }
}
