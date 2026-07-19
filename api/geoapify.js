const response = await fetch(
    `/api/geoapify?place=${encodeURIComponent(place)}`
);

const data = await response.json();