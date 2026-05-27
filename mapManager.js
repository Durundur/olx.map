import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

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

		this.map = L.map(containerId).setView([52.2297, 21.0122], 13);
		const streetLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
		const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}");
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
			const [lat, lng] = key.split(",").map(Number);
			const marker = this.createOfferMarker(lat, lng, group);

			this.markersLayer.addLayer(marker);
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

		marker.bindPopup("", {
			maxWidth: 260,
			className: "olx-offer-popup",
		});

		marker.on("popupopen", () => {
			this.updatePopup(marker, offers, popupState);
		});

		return marker;
	}

	updatePopup(marker, offers, popupState) {
		const offer = offers[popupState.currentIndex];
		const moveToOffer = (direction) => {
			popupState.currentIndex = (popupState.currentIndex + direction + offers.length) % offers.length;
			this.updatePopup(marker, offers, popupState);
		};

		marker.setPopupContent(
			this.getPopupContent({
				offer,
				currentIndex: popupState.currentIndex,
				totalOffers: offers.length,
				onPrevious: () => moveToOffer(-1),
				onNext: () => moveToOffer(1),
			})
		);
	}

	getPopupContent({ offer, currentIndex, totalOffers, onPrevious, onNext }) {
		const image = offer.photos?.[0]?.link ?? "https://placehold.co/240x180/png?text=Brak+zdjęcia";
		const container = document.createElement("div");
		Object.assign(container.style, {
			width: "240px",
			fontFamily: "Arial,sans-serif",
		});

		const imageElement = document.createElement("img");
		imageElement.src = image;
		Object.assign(imageElement.style, {
			width: "100%",
			height: "180px",
			objectFit: "cover",
			borderRadius: "8px",
			display: "block",
		});

		const details = document.createElement("div");
		details.style.marginTop = "10px";

		const title = document.createElement("div");
		title.textContent = offer.title ?? "";
		Object.assign(title.style, {
			fontSize: "14px",
			fontWeight: "600",
			lineHeight: "1.4",
			maxHeight: "40px",
			overflow: "hidden",
		});

		const price = document.createElement("div");
		price.textContent = offer.price?.label ?? "";
		Object.assign(price.style, {
			marginTop: "6px",
			fontSize: "16px",
			fontWeight: "bold",
		});

		details.append(title, price);

		const navigation = document.createElement("div");
		Object.assign(navigation.style, {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			marginTop: "14px",
		});

		const previousButton = this.createPopupNavigationButton("<", onPrevious);
		const counter = document.createElement("div");
		counter.textContent = `${currentIndex + 1} / ${totalOffers}`;
		counter.style.fontSize = "13px";
		const nextButton = this.createPopupNavigationButton(">", onNext);

		navigation.append(previousButton, counter, nextButton);

		const link = document.createElement("a");
		link.href = offer.url;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = "Otwórz ogłoszenie";
		Object.assign(link.style, {
			display: "block",
			marginTop: "14px",
			textAlign: "center",
			background: "#002f34",
			color: "white",
			padding: "10px",
			borderRadius: "8px",
			textDecoration: "none",
			fontWeight: "600",
		});

		container.append(imageElement, details, navigation, link);
		return container;
	}

	createPopupNavigationButton(label, onClick) {
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = label;
		Object.assign(button.style, {
			cursor: "pointer",
			border: "none",
			background: "#f1f1f1",
			padding: "6px 10px",
			borderRadius: "6px",
		});

		button.addEventListener("click", (event) => {
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
