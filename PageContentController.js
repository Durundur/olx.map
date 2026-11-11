import { MapManager } from './MapManager.js';
import { OffersDataSource } from './OffersDataSource.js';
import './content.css';
import map from './icons/map.svg';
import {
  MAP_CONTAINER_ID,
  MAP_VIEW_BUTTON_ID,
  OFFER_LOCATION_DATE_SELECTOR,
  OFFER_MAP_BUTTON_SELECTOR,
  OFFERS_LIST_CONTAINER_SELECTOR,
  VIEW_TYPE_BUTTONS_CONTAINER_SELECTOR,
} from './consts.js';

class PageContentController {
  mapWrapperResizeObserver = null;
  mapWrapperResizeHandler = null;
  observer = null;
  mapEnabled = false;

  init() {
    OffersDataSource.init();
    OffersDataSource.subscribe(() => this.addOfferMapButtons());
    this.initializeButtonObserver();
  }

  initializeButtonObserver() {
    const root = document.documentElement;
    if (!root) {
      return;
    }

    if (!this.observer) {
      this.observer = new MutationObserver(() => {
        this.addButton();
        this.addOfferMapButtons();
      });
    }

    this.observer.observe(root, {
      childList: true,
      subtree: true,
    });

    this.addOfferMapButtons();
  }

  addOfferMapButtons() {
    if (!this.mapEnabled) {
      return;
    }

    const offers = OffersDataSource.getOffers({ includeExtended: true });

    for (const offer of offers) {
      const element = document.getElementById(String(offer.id));
      if (!element || element.querySelector(OFFER_MAP_BUTTON_SELECTOR)) {
        continue;
      }

      const locationElement = element.querySelector(OFFER_LOCATION_DATE_SELECTOR);
      if (!locationElement) {
        continue;
      }

      element.classList.add('olx-map-offer-card');

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.olxMapOfferButton = '';
      button.dataset.offerId = String(offer.id);
      button.className = 'olx-map-offer-button';
      button.setAttribute('aria-label', 'Pokaż ogłoszenie na mapie');
      button.title = 'Pokaż na mapie';
      button.innerHTML = map;

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        MapManager.getInstance().focusOfferOnMap(offer.id);
      });

      element.appendChild(button);
    }
  }

  createButton() {
    const button = document.createElement('button');
    button.id = MAP_VIEW_BUTTON_ID;
    button.className = MAP_VIEW_BUTTON_ID;
    button.innerHTML = map;

    let isActive = false;

    const updateState = () => {
      if (isActive) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    };

    updateState();

    button.addEventListener('click', () => {
      isActive = !isActive;
      updateState();

      if (isActive) {
        this.mapEnabled = true;
        this.addMap();
        this.addOfferMapButtons();
      } else {
        this.mapEnabled = false;
        this.removeOfferMapButtons();
        this.removeMap();
      }
    });

    return button;
  }

  removeOfferMapButtons() {
    document.querySelectorAll(OFFER_MAP_BUTTON_SELECTOR).forEach((button) => button.remove());
  }

  addButton() {
    const container = document.querySelector(VIEW_TYPE_BUTTONS_CONTAINER_SELECTOR);
    if (!container) {
      return;
    }

    const existingButton = container.querySelector(`#${MAP_VIEW_BUTTON_ID}`);
    if (existingButton) {
      return;
    }

    const button = this.createButton();
    container.firstChild?.appendChild(button);
  }

  createMapContainer() {
    const mapContainer = document.createElement('div');
    mapContainer.id = MAP_CONTAINER_ID;
    mapContainer.className = MAP_CONTAINER_ID;
    return mapContainer;
  }

  updateMapWrapperOffset(wrapper) {
    const mapWrapperOffsetProperty = '--olx-map-wrapper-offset';

    wrapper.style.setProperty(mapWrapperOffsetProperty, '0px');

    const wrapperRect = wrapper.getBoundingClientRect();
    const targetLeft = (window.innerWidth - wrapperRect.width) / 2;
    const offset = targetLeft - wrapperRect.left;

    wrapper.style.setProperty(mapWrapperOffsetProperty, `${offset}px`);
  }

  setupMapWrapperPosition(wrapper, parent) {
    let animationFrameId = null;

    const scheduleUpdate = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        this.updateMapWrapperOffset(wrapper);
        animationFrameId = null;
      });
    };

    this.mapWrapperResizeObserver?.disconnect();
    if (this.mapWrapperResizeHandler) {
      window.removeEventListener('resize', this.mapWrapperResizeHandler);
    }

    this.mapWrapperResizeHandler = scheduleUpdate;
    window.addEventListener('resize', this.mapWrapperResizeHandler);

    this.mapWrapperResizeObserver = new ResizeObserver(scheduleUpdate);
    this.mapWrapperResizeObserver.observe(parent);

    scheduleUpdate();
  }

  cleanupMapWrapperPosition() {
    this.mapWrapperResizeObserver?.disconnect();
    this.mapWrapperResizeObserver = null;

    if (this.mapWrapperResizeHandler) {
      window.removeEventListener('resize', this.mapWrapperResizeHandler);
      this.mapWrapperResizeHandler = null;
    }
  }

  addMap() {
    const listContainer = document.querySelector(OFFERS_LIST_CONTAINER_SELECTOR);
    if (!listContainer) {
      return;
    }

    const listContainerParent = listContainer.parentNode;
    if (!listContainerParent) {
      return;
    }

    const wrapperClass = 'olx-map-wrapper';
    const existingWrapper = document.querySelector(`.${wrapperClass}`);
    if (existingWrapper) {
      return;
    }

    const existingMap = document.getElementById(MAP_CONTAINER_ID);
    if (existingMap) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = wrapperClass;

    listContainer.classList.add('olx-map-offers-list');
    wrapper.appendChild(listContainer);
    wrapper.appendChild(this.createMapContainer());

    listContainerParent.prepend(wrapper);
    this.setupMapWrapperPosition(wrapper, listContainerParent);

    MapManager.getInstance().init(MAP_CONTAINER_ID);
  }

  removeMap() {
    MapManager.getInstance().destroy();
    this.cleanupMapWrapperPosition();

    if (this.offersUnsubscribe) {
      this.offersUnsubscribe();
      this.offersUnsubscribe = null;
    }

    const wrapperClass = 'olx-map-wrapper';
    const existingWrapper = document.querySelector(`.${wrapperClass}`);
    if (!existingWrapper) {
      return;
    }

    const listContainer = existingWrapper.querySelector(OFFERS_LIST_CONTAINER_SELECTOR);
    const wrapperParent = existingWrapper.parentNode;

    if (listContainer && wrapperParent) {
      listContainer.classList.remove('olx-map-offers-list');
      wrapperParent.insertBefore(listContainer, existingWrapper);
    }

    existingWrapper.remove();
  }
}

new PageContentController().init();
