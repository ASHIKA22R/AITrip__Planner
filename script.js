
const travelForm = document.getElementById("travelForm");
const loading = document.getElementById("loading");
const results = document.getElementById("results");
const itineraryBody = document.getElementById("itineraryBody");


// Submit Form
travelForm.addEventListener("submit", generateTrip);

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
Travel Dates: ${startDate} to ${endDate}
Budget: ${budget}
Travelers: ${travelers}
Trip Type: ${tripType}
Transport: ${transport}
Hotel: ${hotel}

Include:
- Morning
- Afternoon
- Evening
- Food
- Shopping
- Attractions
- Travel Tips

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

        await getWeather(destination);

        await loadImages(destination);

        await loadMap(destination);

        showHotels();

    }

    catch (err) {

        console.error(err);

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

        row.innerHTML = `
            <td>${parts[0].trim()}</td>
            <td>${parts[1].trim()}</td>
            <td>${parts[2].trim()}</td>
        `;

        itineraryBody.appendChild(row);

    });

    results.classList.remove("hidden");

    document.getElementById("dashboard")
        .classList.remove("hidden");

    document.getElementById("actionButtons")
        .classList.remove("hidden");

}

// =======================================
// Budget
// =======================================

function calculateBudget() {

    const type = document.getElementById("budget").value;
    const people = Number(document.getElementById("travelers").value);

    let amount = 15000;

    if (type === "Standard")
        amount = 30000;

    if (type === "Luxury")
        amount = 60000;

    return "₹" + (amount * people).toLocaleString("en-IN");

}

// =======================================
// Dashboard
// =======================================

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
            ${data.weather}
            <br>
            🌡 ${data.temperature}°C
            <br>
            💧 ${data.humidity}%
        `;

    }

    catch (err) {

        console.error(err);

        document.getElementById("weather").innerHTML =
            "Weather unavailable";

    }

}



function showHotels() {

    const container =
        document.getElementById("hotelContainer");

    container.innerHTML = "";

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

    hotels.forEach(hotel => {

        container.innerHTML += `
            <div class="hotel-card">

                <h3>${hotel.name}</h3>

                <p>${hotel.rating}</p>

                <p>${hotel.price}</p>

                <p>Recommended for your trip</p>

            </div>
        `;

    });

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

        container.innerHTML = "";

        images.forEach(url => {

            container.innerHTML += `
                <img
                    class="place-image"
                    src="${url}"
                    alt="${destination}">
            `;

        });

        document.getElementById("destinationImages")
            .classList.remove("hidden");

    }

    catch (err) {

        console.error(err);

    }

}

document.getElementById("downloadPdf")
.addEventListener("click", generatePDF);

function generatePDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const destination = document.getElementById("destination").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const budget = document.getElementById("budget").value;
    const travelers = document.getElementById("travelers").value;

    doc.setFontSize(20);
    doc.text("AI Travel Planner Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Destination : ${destination}`, 20, 40);
    doc.text(`Dates : ${startDate} - ${endDate}`, 20, 50);
    doc.text(`Budget : ${budget}`, 20, 60);
    doc.text(`Travelers : ${travelers}`, 20, 70);

    doc.text("Travel Itinerary", 20, 90);

    let y = 105;

    document.querySelectorAll("#itineraryBody tr").forEach(row => {

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

    alert("Trip Saved Successfully!");

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

    container.innerHTML = "";

    if (trips.length === 0) {

        container.innerHTML =
        "<div class='trip-card'>No Saved Trips</div>";

    }

trips.forEach((trip, index) => {

    container.innerHTML += `

    <div class="trip-card">

        <h3>Trip ${index + 1}</h3>

        <p>🌍 ${trip.destination}</p>

        <p>📅 ${trip.startDate} - ${trip.endDate}</p>

        <p>💰 ${trip.budget}</p>

        <p>👥 ${trip.travelers} Travelers</p>

        <p>✈ ${trip.transport}</p>

        <p>🏨 ${trip.hotel}</p>

        <button class="delete-btn" onclick="deleteTrip(${index})">
            🗑 Delete
        </button>

    </div>

    `;

});

    section.classList.remove("hidden");

}

function deleteTrip(index) {

    let trips = JSON.parse(localStorage.getItem("savedTrips")) || [];

    trips.splice(index, 1);

    localStorage.setItem("savedTrips", JSON.stringify(trips));

    showSavedTrips();

}
document.getElementById("themeToggle")
.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const btn =
        document.getElementById("themeToggle");

    btn.innerHTML =
        document.body.classList.contains("dark")
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";

});