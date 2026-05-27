import { MapManager } from "./mapManager.js";
import { OffersDataSource } from "./offersDataSource.js";
import map from "./icons/map.svg";

const MAP_VIEW_BUTTON_ID = "map-view-button";
const ACTIVE_COLOR = "#02282C";
const INACTIVE_COLOR = "#7F9799";
const MAP_CONTAINER_ID = "map-container";

let defaultView = null;
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
	button.style.width = "24px";
	button.style.height = "24px";
	button.style.background = "none";
	button.style.border = "none";
	button.style.cursor = "pointer";
	button.style.padding = "0";
	button.innerHTML = map;

	let isActive = false;
	function updateButtonColor() {
		button.style.color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
	}

	updateButtonColor();

	button.addEventListener("click", () => {
		isActive = !isActive;
		updateButtonColor();
		if (isActive) {
			addMap();
		} else {
			removeMap();
		}
	});

	return button;
}

function addButton() {
	const container = document.querySelector("[data-testid='view-type-container']");
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
	mapContainer.style.position = "relative";
	mapContainer.style.height = "100%";
	mapContainer.style.width = "100%";

	return mapContainer;
}

function addMap() {
	const listContainer = document.querySelector(".listing-grid-container");
	if (!listContainer) {
		return;
	}

	const list = document.querySelector("[data-testid='listing-grid']");
	if (!list) {
		return;
	}

	const existingMap = document.getElementById(MAP_CONTAINER_ID);
	if (existingMap) {
		return;
	}

	if (!defaultView) {
		defaultView = { listParent: list.parentNode, nextSibling: list.nextSibling, listStyle: { overflowY: list.style.overflowY }, wrapper: null };
	}

	const wrapper = document.createElement("div");
	wrapper.style.display = "flex";
	wrapper.style.height = "90vh";
	wrapper.style.width = "98vw";
	wrapper.style.marginLeft = "calc(51% - 50vw)";

	list.style.overflowY = "scroll";
	wrapper.appendChild(list);
	wrapper.appendChild(createMapContainer());
	listContainer.prepend(wrapper);
	defaultView.wrapper = wrapper;
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

	if (!defaultView) {
		return;
	}

	const list = document.querySelector("[data-testid='listing-grid']");
	if (!list) {
		return;
	}

	list.style.overflowY = defaultView.listStyle.overflowY || "";

	if (defaultView.listParent) {
		defaultView.listParent.insertBefore(list, defaultView.nextSibling);
	}

	if (defaultView.wrapper) {
		defaultView.wrapper.remove();
	}

	defaultView = null;
}
