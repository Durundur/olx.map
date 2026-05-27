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

		const grouped = new Map();
		const bounds = L.latLngBounds();
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

		for (const [key, group] of grouped.entries()) {
			const [lat, lng] = key.split(",").map(Number);

			const marker = L.marker([lat, lng]);

			let currentIndex = 0;

			const createPopupContent = () => {
				const offer = group[currentIndex];

				const image = offer.photos?.[0]?.link;

				return `
				<div
					style="
						width:240px;
						font-family:Arial,sans-serif;
					"
				>
					<img
						src="${image}"
						style="
							width:100%;
							height:180px;
							object-fit:cover;
							border-radius:8px;
							display:block;
						"
					/>

					<div style="margin-top:10px;">
						<div
							style="
								font-size:14px;
								font-weight:600;
								line-height:1.4;
								max-height:40px;
								overflow:hidden;
							"
						>
							${offer.title}
						</div>

						<div
							style="
								margin-top:6px;
								font-size:16px;
								font-weight:bold;
							"
						>
							${offer.price?.label ?? ""}
						</div>
					</div>

					<div
						style="
							display:flex;
							align-items:center;
							justify-content:space-between;
							margin-top:14px;
						"
					>
						<button
							class="popup-prev"
							style="
								cursor:pointer;
								border:none;
								background:#f1f1f1;
								padding:6px 10px;
								border-radius:6px;
							"
						>
							←
						</button>

						<div style="font-size:13px;">
							${currentIndex + 1} / ${group.length}
						</div>

						<button
							class="popup-next"
							style="
								cursor:pointer;
								border:none;
								background:#f1f1f1;
								padding:6px 10px;
								border-radius:6px;
							"
						>
							→
						</button>
					</div>

					<a
						href="${offer.url}"
						target="_blank"
						style="
							display:block;
							margin-top:14px;
							text-align:center;
							background:#002f34;
							color:white;
							padding:10px;
							border-radius:8px;
							text-decoration:none;
							font-weight:600;
						"
					>
						Otwórz ogłoszenie
					</a>
				</div>
			`;
			};

			const updatePopup = () => {
				marker.setPopupContent(createPopupContent());

				requestAnimationFrame(() => {
					const popupEl = marker.getPopup()?.getElement();

					if (!popupEl) {
						return;
					}

					const prevBtn = popupEl.querySelector(".popup-prev");
					const nextBtn = popupEl.querySelector(".popup-next");

					prevBtn?.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();

						currentIndex = (currentIndex - 1 + group.length) % group.length;

						updatePopup();
					});

					nextBtn?.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();

						currentIndex = (currentIndex + 1) % group.length;

						updatePopup();
					});
				});
			};

			marker.bindPopup("", {
				maxWidth: 260,
				className: "olx-offer-popup",
			});

			marker.on("popupopen", () => {
				updatePopup();
			});

			this.markersLayer.addLayer(marker);
			bounds.extend([lat, lng]);
		}

		if (bounds.isValid()) {
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
}
