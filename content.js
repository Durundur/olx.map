import { MapManager } from './mapManager.js';
import { OffersDataSource } from './offersDataSource.js';
import { ListingSortController } from './listingSortController.js';
import './content.css';
import map from './icons/map.svg';
import {
  MAP_CONTAINER_ID,
  MAP_VIEW_BUTTON_ID,
  OFFERS_LIST_CONTAINER_SELECTOR,
  VIEW_TYPE_BUTTONS_CONTAINER_SELECTOR,
} from './consts.js';

let mapWrapperResizeObserver = null;
let mapWrapperResizeHandler = null;

OffersDataSource.init();
observeDomRoot();

function observeDomRoot() {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  observer.observe(root, {
    childList: true,
    subtree: true,
  });

  if (document.body) {
    return;
  }

  const bodyObserver = new MutationObserver(() => {
    if (!document.body) {
      return;
    }

    bodyObserver.disconnect();
    addButton();
  });

  bodyObserver.observe(root, {
    childList: true,
    subtree: true,
  });
}

function createButton() {
  const button = document.createElement('button');
  button.id = MAP_VIEW_BUTTON_ID;
  button.className = MAP_VIEW_BUTTON_ID;
  button.innerHTML = map;

  let isActive = false;

  function updateState() {
    if (isActive) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  }

  updateState();

  button.addEventListener('click', () => {
    isActive = !isActive;
    updateState();

    if (isActive) {
      addMap();
    } else {
      removeMap();
    }
  });

  return button;
}

function addButton() {
  const container = document.querySelector(VIEW_TYPE_BUTTONS_CONTAINER_SELECTOR);
  if (!container) {
    return;
  }

  const existingButton = container.querySelector(`#${MAP_VIEW_BUTTON_ID}`);
  if (existingButton) {
    return;
  }

  const button = createButton();
  container.firstChild.appendChild(button);
}

function createMapContainer() {
  const mapContainer = document.createElement('div');
  mapContainer.id = MAP_CONTAINER_ID;
  mapContainer.className = MAP_CONTAINER_ID;
  return mapContainer;
}

function updateMapWrapperOffset(wrapper) {
  const mapWrapperOffsetProperty = '--olx-map-wrapper-offset';

  wrapper.style.setProperty(mapWrapperOffsetProperty, '0px');

  const wrapperRect = wrapper.getBoundingClientRect();
  const targetLeft = (window.innerWidth - wrapperRect.width) / 2;
  const offset = targetLeft - wrapperRect.left;

  wrapper.style.setProperty(mapWrapperOffsetProperty, `${offset}px`);
}

function setupMapWrapperPosition(wrapper, parent) {
  let animationFrameId = null;

  const scheduleUpdate = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
      updateMapWrapperOffset(wrapper);
      animationFrameId = null;
    });
  };

  mapWrapperResizeObserver?.disconnect();
  if (mapWrapperResizeHandler) {
    window.removeEventListener('resize', mapWrapperResizeHandler);
  }

  mapWrapperResizeHandler = scheduleUpdate;
  window.addEventListener('resize', mapWrapperResizeHandler);

  mapWrapperResizeObserver = new ResizeObserver(scheduleUpdate);
  mapWrapperResizeObserver.observe(parent);

  scheduleUpdate();
}

function cleanupMapWrapperPosition() {
  mapWrapperResizeObserver?.disconnect();
  mapWrapperResizeObserver = null;

  if (mapWrapperResizeHandler) {
    window.removeEventListener('resize', mapWrapperResizeHandler);
    mapWrapperResizeHandler = null;
  }
}

function addMap() {
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
  wrapper.appendChild(createMapContainer());

  listContainerParent.prepend(wrapper);
  setupMapWrapperPosition(wrapper, listContainerParent);

  MapManager.getInstance().init(MAP_CONTAINER_ID);

  OffersDataSource.subscribe((offers) => {
    MapManager.getInstance().renderOffers(offers);
  });
}

function removeMap() {
  MapManager.getInstance().destroy();
  cleanupMapWrapperPosition();

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
