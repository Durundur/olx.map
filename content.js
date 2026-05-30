import { MapManager } from "./mapManager.js";
import { OffersDataSource } from "./offersDataSource.js";
import "./content.css";
import map from "./icons/map.svg";
import { MAP_CONTAINER_ID, MAP_VIEW_BUTTON_ID, OFFERS_LIST_CONTAINER_SELECTOR, VIEW_TYPE_BUTTONS_CONTAINER_SELECTOR } from "./consts.js";

OffersDataSource.init();
addButton();

const observer = new MutationObserver(() => {
	addButton();
});

observer.observe(document.body, {
	childList: true,
	subtree: true,
});

function createButton() {
	const button = document.createElement("button");
	button.id = MAP_VIEW_BUTTON_ID;
	button.className = MAP_VIEW_BUTTON_ID;
	button.innerHTML = map;

	let isActive = false;

	function updateState() {
		if (isActive) {
			button.classList.add("active");
		} else {
			button.classList.remove("active");
		}
	}

	updateState();

	button.addEventListener("click", () => {
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
	const mapContainer = document.createElement("div");
	mapContainer.id = MAP_CONTAINER_ID;
	mapContainer.className = MAP_CONTAINER_ID;
	return mapContainer;
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

	const existingMap = document.getElementById(MAP_CONTAINER_ID);
	if (existingMap) {
		return;
	}

	const wrapper = document.createElement("div");
	wrapper.className = "olx-map-wrapper";

	const viewportWidth = window.innerWidth;
	const wrapperWidth = viewportWidth * 0.96;
	const parentWidth = listContainerParent.getBoundingClientRect().width;

	const offset = (wrapperWidth - parentWidth) / 2;
	wrapper.style.left = `-${offset}px`;

	listContainer.style.overflowY = "scroll";
	wrapper.appendChild(listContainer);
	wrapper.appendChild(createMapContainer());

	listContainerParent.prepend(wrapper);

	MapManager.getInstance().init(MAP_CONTAINER_ID);

	OffersDataSource.subscribe((offers) => {
		MapManager.getInstance().renderOffers(offers);
	});
}

function removeMap() {
	MapManager.getInstance().destroy();

	const map = document.querySelector(`#${MAP_CONTAINER_ID}`);
	if (map) {
		map.remove();
	}
}
