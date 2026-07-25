const travelForm = document.getElementById("travelForm");
const loading = document.getElementById("loading");
const results = document.getElementById("results");
const itineraryBody = document.getElementById("itineraryBody");
travelForm.addEventListener("submit", generateTrip);

// --- Filter transport options based on Domestic / International ---
function filterTransportOptions() {

    const type = document.getElementById("destinationType").value;
    const transport = document.getElementById("transport");
    const domesticOptions = transport.querySelectorAll("[data-domestic]");

    if (type === "international") {

        domesticOptions.forEach(opt => {
            opt.hidden = true;
            opt.disabled = true;
        });

        // If a domestic-only option is currently selected, switch to Flight
        if (transport.selectedOptions[0]?.hasAttribute("data-domestic")) {
            transport.value = "Flight";
        }

    } else {

        domesticOptions.forEach(opt => {
            opt.hidden = false;
            opt.disabled = false;
        });

    }

}

document.getElementById("destinationType")
    .addEventListener("change", filterTransportOptions);

// Run once on load so the form starts in the correct state
filterTransportOptions();

// --- Utility: safely escape a string for innerHTML injection ---
function sanitize(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
}

async function generateTrip(e) {

    e.preventDefault();

    const destination = document.getElementById("destination").value.trim();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const budget = document.getElementById("budget").value;
    const travelers = document.getElementById("travelers").value;
    const tripType = document.getElementById("tripType").value;
    const transport = document.getElementById("transport").value;
    const hotel = document.getElementById("hotel").value;
    const destinationType = document.getElementById("destinationType").value;

    if (new Date(startDate) > new Date(endDate)) {

        alert("End Date should be after Start Date.");
        return;

    }

    loading.classList.remove("hidden");
    results.classList.add("hidden");
    itineraryBody.innerHTML = "";

    const prompt = `
Create a detailed travel itinerary.

Destination: ${destination}

Destination Type: ${destinationType === "international" ? "International (foreign country)" : "Domestic"}

Travel Dates: ${startDate} to ${endDate}

Budget: ${budget}

Travelers: ${travelers}

Trip Type: ${tripType}

Transport: ${transport}

Hotel: ${hotel}

Include:

- Morning activities
- Afternoon activities
- Evening activities
- Tourist attractions
- Local food
- Shopping
- Travel tips

Return ONLY this format:

Day 1 | 09:00 AM | Activity
Day 1 | 01:00 PM | Activity
Day 1 | 06:00 PM | Activity
`;

    try {

        const response = await fetch("/api/groq", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                prompt
            })

        });

        if (!response.ok)
            throw new Error("AI Error");

        const data = await response.json();

        displayItinerary(data.text);

        updateDashboard();

        // Bug fix: run independent API calls in parallel instead of sequentially
        await Promise.all([
            getWeather(destination),
            loadImages(destination),
            loadMap(destination)
        ]);

        showHotels();

    }

    catch (error) {

        console.error(error);

        alert("Unable to generate itinerary.");

    }

    finally {

        loading.classList.add("hidden");

    }

}

function displayItinerary(text) {

    itineraryBody.innerHTML = "";

    text.split("\n").forEach(line => {

        if (!line.includes("|")) return;

        const parts = line.split("|");

        if (parts.length !== 3) return;

        const row = document.createElement("tr");

        // Bug fix: use textContent per cell to prevent XSS from AI-generated text
        const dayCell = document.createElement("td");
        dayCell.textContent = parts[0].trim();

        const timeCell = document.createElement("td");
        timeCell.textContent = parts[1].trim();

        const activityCell = document.createElement("td");
        activityCell.textContent = parts[2].trim();

        row.appendChild(dayCell);
        row.appendChild(timeCell);
        row.appendChild(activityCell);

        itineraryBody.appendChild(row);

    });

    results.classList.remove("hidden");

    document.getElementById("dashboard")
        .classList.remove("hidden");

    document.getElementById("actionButtons")
        .classList.remove("hidden");

}

function calculateBudget() {

    const budget = document.getElementById("budget").value;
    const people = Number(document.getElementById("travelers").value);

    let amount = 15000;

    if (budget === "Standard")
        amount = 30000;

    if (budget === "Luxury")
        amount = 60000;

    return "₹" + (amount * people).toLocaleString("en-IN");

}

function updateDashboard() {

    document.getElementById("estimatedCost").innerText =
        calculateBudget();

    document.getElementById("hotelResult").innerText =
        document.getElementById("hotel").value;

}

async function getWeather(destination) {

    try {

        const response = await fetch(
            `/api/weather?city=${encodeURIComponent(destination)}`
        );

        if (!response.ok)
            throw new Error("Weather Error");

        const data = await response.json();

        document.getElementById("weather").innerHTML = `
            ${sanitize(data.weather)}
            <br>
            🌡 ${sanitize(data.temperature)}°C
            <br>
            💧 ${sanitize(data.humidity)}%
        `;

    } catch (error) {

        console.error(error);

        document.getElementById("weather").innerHTML =
            "Weather unavailable";

    }

}

let map;

// Bug fix: wrapped in try/catch so map errors don't bubble up to the
// outer generateTrip catch and incorrectly show "Unable to generate itinerary"
async function loadMap(place) {

    try {

        document
            .getElementById("mapSection")
            .classList.remove("hidden");

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
        );

        const data = await response.json();

        if (data.length === 0) {

            document.getElementById("mapSection").classList.add("hidden");
            console.warn("Location not found on map:", place);
            return;

        }

        const lat = Number(data[0].lat);
        const lon = Number(data[0].lon);

        // Bug fix: reuse the existing map instance with flyTo instead of
        // destroy + recreate, which can silently fail on repeat searches
        if (map) {

            map.flyTo({ center: [lon, lat], zoom: 11 });

            // Update the marker by recreating only the marker, not the whole map
            new maplibregl.Marker()
                .setLngLat([lon, lat])
                .addTo(map);

        } else {

            map = new maplibregl.Map({

                container: "map",

                style: "https://demotiles.maplibre.org/style.json",

                center: [lon, lat],

                zoom: 11

            });

            new maplibregl.Marker()

                .setLngLat([lon, lat])

                .addTo(map);

        }

    } catch (error) {

        console.error("Map error:", error);
        document.getElementById("mapSection").classList.add("hidden");

    }

}

function showHotels() {

    const container =
        document.getElementById("hotelContainer");

    const hotels = [

        {
            name: "Grand Plaza Hotel",
            rating: "⭐⭐⭐⭐",
            price: "₹5000/night"
        },

        {
            name: "Royal Luxury Resort",
            rating: "⭐⭐⭐⭐⭐",
            price: "₹9000/night"
        },

        {
            name: "Comfort Stay",
            rating: "⭐⭐⭐",
            price: "₹2500/night"
        }

    ];

    // Bug fix: build HTML string first, then set innerHTML once (avoids repeated DOM re-parses)
    container.innerHTML = hotels.map(hotel => `

        <div class="hotel-card">

            <h3>${sanitize(hotel.name)}</h3>

            <p>${sanitize(hotel.rating)}</p>

            <p>${sanitize(hotel.price)}</p>

            <p>Recommended for your trip</p>

        </div>

    `).join("");

    document.getElementById("hotelCards")
        .classList.remove("hidden");

}

async function loadImages(destination) {

    try {

        const response = await fetch(
            `/api/images?query=${encodeURIComponent(destination)}`
        );

        if (!response.ok)
            throw new Error("Image Error");

        const images = await response.json();

        const container =
            document.getElementById("imageContainer");

        // Bug fix: build HTML string then assign once, not innerHTML += per image
        container.innerHTML = images.map(url => `

                <img
                    class="place-image"
                    src="${sanitize(url)}"
                    alt="${sanitize(destination)}">

            `).join("");

        document.getElementById("destinationImages")
            .classList.remove("hidden");

    }

    catch (error) {

        console.error(error);

    }

}

document.getElementById("downloadPdf")
.addEventListener("click", generatePDF);

function generatePDF() {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    const destination =
        document.getElementById("destination").value;

    const startDate =
        document.getElementById("startDate").value;

    const endDate =
        document.getElementById("endDate").value;

    const budget =
        document.getElementById("budget").value;

    const travelers =
        document.getElementById("travelers").value;

    doc.setFontSize(20);
    doc.text("AI Travel Planner", 20, 20);

    doc.setFontSize(12);
    doc.text(`Destination: ${destination}`, 20, 40);
    doc.text(`Dates: ${startDate} - ${endDate}`, 20, 50);
    doc.text(`Budget: ${budget}`, 20, 60);
    doc.text(`Travelers: ${travelers}`, 20, 70);

    doc.text("Travel Itinerary", 20, 90);

    let y = 105;

    document.querySelectorAll("#itineraryBody tr")
    .forEach(row => {

        const td = row.querySelectorAll("td");

        doc.text(
            `${td[0].innerText} | ${td[1].innerText} | ${td[2].innerText}`,
            20,
            y
        );

        y += 10;

        if (y > 280) {

            doc.addPage();
            y = 20;

        }

    });

    doc.save(`${destination}-Travel-Plan.pdf`);

}

document.getElementById("saveTrip")
.addEventListener("click", saveTrip);

function saveTrip() {

    const trip = {

        destination: document.getElementById("destination").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        budget: document.getElementById("budget").value,
        travelers: document.getElementById("travelers").value,
        tripType: document.getElementById("tripType").value,
        transport: document.getElementById("transport").value,
        hotel: document.getElementById("hotel").value

    };

    const trips =
        JSON.parse(localStorage.getItem("savedTrips")) || [];

    trips.push(trip);

    localStorage.setItem(
        "savedTrips",
        JSON.stringify(trips)
    );

    alert("Trip saved successfully!");

}

document.getElementById("viewTrips")
.addEventListener("click", showSavedTrips);

function showSavedTrips() {

    const section =
        document.getElementById("savedTrips");

    const container =
        document.getElementById("tripList");

    const trips =
        JSON.parse(localStorage.getItem("savedTrips")) || [];

    if (trips.length === 0) {

        // Bug fix: build HTML once, not via +=
        container.innerHTML = `
            <div class="trip-card">
                No Saved Trips Found
            </div>
        `;

    } else {

        // Bug fix: use sanitize() on localStorage values to prevent stored-XSS,
        // and build the full HTML string before assigning (avoids innerHTML += loop)
        // Bug fix: use data-index attribute + event delegation instead of inline onclick
        container.innerHTML = trips.map((trip, index) => `

            <div class="trip-card">

                <h3>Trip ${index + 1}</h3>

                <p>🌍 ${sanitize(trip.destination)}</p>

                <p>📅 ${sanitize(trip.startDate)} - ${sanitize(trip.endDate)}</p>

                <p>💰 ${sanitize(trip.budget)}</p>

                <p>👥 ${sanitize(trip.travelers)} Travelers</p>

                <p>✈ ${sanitize(trip.transport)}</p>

                <p>🏨 ${sanitize(trip.hotel)}</p>

                <button
                    class="delete-btn"
                    data-index="${index}">

                    🗑 Delete

                </button>

            </div>

        `).join("");

    }

    section.classList.remove("hidden");

}

// Bug fix: event delegation on the container instead of per-card inline onclick
document.getElementById("tripList").addEventListener("click", (e) => {

    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    const index = Number(btn.dataset.index);
    deleteTrip(index);

});

function deleteTrip(index) {

    let trips =
        JSON.parse(localStorage.getItem("savedTrips")) || [];

    trips.splice(index, 1);

    localStorage.setItem(
        "savedTrips",
        JSON.stringify(trips)
    );

    showSavedTrips();

}

// Bug fix: merged the two duplicate themeToggle click listeners into one
document.getElementById("themeToggle")
.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    document.getElementById("themeToggle").innerHTML =
        isDark ? "☀️ Light Mode" : "🌙 Dark Mode";

    localStorage.setItem("theme", isDark ? "dark" : "light");

});

// Bug fix: restore theme on load AND sync button label
window.addEventListener("load", () => {

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {

        document.body.classList.add("dark");

        document.getElementById("themeToggle").innerHTML =
            "☀️ Light Mode";

    }

});
