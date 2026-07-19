export default async function handler(req, res) {

    const { city } = req.query;

    if (!city) {
        return res.status(400).json({
            error: "City is required"
        });
    }

    try {

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || "Weather not found"
            });
        }

        return res.status(200).json({
            weather: data.weather[0].main,
            temperature: data.main.temp,
            humidity: data.main.humidity,
            city: data.name,
            country: data.sys.country
        });

    } catch (error) {

        return res.status(500).json({
            error: "Failed to fetch weather"
        });

    }

}